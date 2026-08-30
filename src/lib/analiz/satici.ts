import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { alisverisGorunurlugu } from "@/lib/dataforseo/merchant";
import { saticilariGetir } from "@/lib/dataforseo/satici";
import { abonelikDurumu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, Urun } from "@/types/database";

/**
 * Ürünü satan diğer satıcılar ve fiyatları.
 *
 * Şimdiye kadar fiyat konumu Alışveriş arama sonuçlarını tarayıp başlık
 * benzerliğiyle eşleştirerek TAHMİN ediliyordu; farklı ürünlerin aynı
 * ürün sanılması mümkündü. Bu modül Google'ın kendi ürün kimliği
 * üzerinden gider: aynı ürünü satanlar kesin olarak bilinir.
 *
 * Ürün kimliği zaten Merchant analizinde yapılan Alışveriş sorgusundan
 * gelir ve o sorgu önbelleklidir; bu yüzden burada ikinci kez ücret
 * ödenmez. Ek maliyet yalnızca satıcı sorgusudur ($0.001/ürün).
 */

export type SaticiAnaliziSonucu = {
  incelenenUrun: number;
  /** Rakip satıcısı bulunan ürün sayısı. */
  rakipliUrun: number;
  /** Bizim en ucuz olduğumuz ürün sayısı. */
  enUcuzOldugumuz: number;
  /** Bizden ucuz en az bir satıcı bulunan ürün sayısı. */
  pahaliKaldigimiz: number;
};

const BOS: SaticiAnaliziSonucu = {
  incelenenUrun: 0,
  rakipliUrun: 0,
  enUcuzOldugumuz: 0,
  pahaliKaldigimiz: 0,
};

/**
 * Satıcı sorgusu yapılacak ürün sayısı.
 *
 * Merchant analizi zaten ilk 10 ürün için Alışveriş sorgusu yapıyor;
 * satıcı sorgusu da aynı kümeyle sınırlanır ki önbellekten yararlansın
 * ve ek Alışveriş sorgusu doğmasın.
 */
const SORGULANACAK_URUN = 10;

/** Fiyat karşılaştırmasında kullanılacak değer. */
function karsilastirmaFiyati(t: { toplamFiyat: number | null; fiyat: number | null }): number | null {
  // Sağlayıcı çoğu zaman yalnızca toplam fiyatı veriyor; ikisi de varsa
  // ürün fiyatı tercih edilir çünkü kargo satıcıya göre değişir.
  return t.fiyat ?? t.toplamFiyat;
}

export async function saticiAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<SaticiAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const { limitler, aktifMi } = await abonelikDurumu(proje.user_id);

  if (!aktifMi || limitler?.satici_karsilastirma !== true) return BOS;

  const locationCode = proje.location_code ?? 2792;

  const { data: urunVerisi } = await supabase
    .from("products")
    .select("*")
    .eq("project_id", proje.id)
    .not("name", "is", null)
    .order("seo_score", { ascending: false, nullsFirst: false })
    .limit(SORGULANACAK_URUN);

  const urunler = (urunVerisi ?? []) as Urun[];
  if (!urunler.length) return BOS;

  const bizimAlanAdi = proje.domain.replace(/^www\./, "");
  const satirlar: Record<string, unknown>[] = [];

  let rakipliUrun = 0;
  let enUcuzOldugumuz = 0;
  let pahaliKaldigimiz = 0;

  for (const urun of urunler) {
    if (!urun.name) continue;

    try {
      // Önbellekli: Merchant analizi aynı sorguyu yaptıysa ücret doğmaz.
      const gorunurluk = await alisverisGorunurlugu({
        keyword: urun.name,
        locationCode,
        languageCode: proje.language_code,
        bizimAlanAdi,
        tazelik,
      });

      const googleUrunId = gorunurluk.bizim_urun?.urun_id ?? gorunurluk.urunler[0]?.urun_id ?? null;
      if (!googleUrunId) continue;

      const sonuc = await saticilariGetir({
        googleUrunId,
        locationCode,
        languageCode: proje.language_code,
        tazelik,
      });

      if (!sonuc.teklifler.length) continue;

      const teklifler = sonuc.teklifler.map((t) => ({
        ...t,
        bizimMi:
          (t.alanAdi ?? "").includes(bizimAlanAdi) ||
          t.satici.toLocaleLowerCase("tr-TR").includes(bizimAlanAdi.split(".")[0]),
      }));

      for (const t of teklifler) {
        satirlar.push({
          project_id: proje.id,
          product_id: urun.id,
          google_urun_id: googleUrunId,
          satici: t.satici,
          alan_adi: t.alanAdi,
          toplam_fiyat: t.toplamFiyat,
          fiyat: t.fiyat,
          para_birimi: t.paraBirimi,
          puan: t.puan,
          bizim_mi: t.bizimMi,
          olculdu_at: new Date().toISOString(),
        });
      }

      /* ---------------- Karşılaştırma ---------------- */

      const bizim = teklifler.find((t) => t.bizimMi);
      const rakipler = teklifler.filter((t) => !t.bizimMi);
      if (rakipler.length) rakipliUrun += 1;

      const bizimFiyat = bizim ? karsilastirmaFiyati(bizim) : null;
      const rakipFiyatlari = rakipler
        .map(karsilastirmaFiyati)
        .filter((f): f is number => f !== null && f > 0);

      // Kendi fiyatımızı bilmiyorsak karşılaştırma yapmayız; tahmin
      // yürütmek yanlış karar aldırır.
      if (bizimFiyat === null || !rakipFiyatlari.length) continue;

      const enUcuzRakip = Math.min(...rakipFiyatlari);
      if (bizimFiyat <= enUcuzRakip) enUcuzOldugumuz += 1;
      else pahaliKaldigimiz += 1;
    } catch (hata) {
      // Tek ürün sorgulanamazsa analiz durmaz.
      console.error("[satici] sorgu başarısız", {
        urun: urun.name,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  /*
   * Aynı anahtar iki kez gönderilemez.
   *
   * Farklı ürün adlarıyla yapılan aramalar Google'da aynı ürüne
   * çıkabiliyor; o zaman toplu yazımda (project_id, google_urun_id,
   * satici) anahtarı tekrar ediyor ve PostgreSQL "aynı satırı iki kez
   * etkileyemez" diyerek TÜM grubu reddediyor. Bu yüzden yazmadan önce
   * tekilleştirilir.
   */
  const benzersiz = new Map<string, Record<string, unknown>>();
  for (const satir of satirlar) {
    benzersiz.set(`${satir.google_urun_id}|${satir.satici}`, satir);
  }
  const yazilacaklar = [...benzersiz.values()];

  for (let i = 0; i < yazilacaklar.length; i += 300) {
    const { error } = await supabase
      .from("satici_teklifleri")
      .upsert(yazilacaklar.slice(i, i + 300) as never, {
        onConflict: "project_id,google_urun_id,satici",
      });

    if (error) {
      console.error("[satici] teklifler kaydedilemedi", {
        adet: yazilacaklar.length,
        mesaj: error.message,
      });
    }
  }

  return {
    incelenenUrun: urunler.length,
    rakipliUrun,
    enUcuzOldugumuz,
    pahaliKaldigimiz,
  };
}
