import "server-only";

import { dfsIstek, dfsTekSonuc, dfsTumSonuclar, yenidenDene } from "@/lib/dataforseo/client";
import { lighthouseCevir, type SiteHiziSonucu } from "@/lib/araclar/site-hizi";
import { abonelikDurumu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, SayfaTuru } from "@/types/database";

/**
 * Site genelinde sayfa hızı ölçümü.
 *
 * Neden şablon bazlı seçim: bir mağazada yüzlerce ürün sayfası aynı
 * şablonu kullanır. Rastgele 25 ürün sayfası ölçmek 25 kez aynı cevabı
 * satın almak olur. Bunun yerine her sayfa türünden temsilciler seçilir;
 * böylece "ürün şablonu yavaş, kategori şablonu iyi" gibi eyleme
 * dönüştürülebilir bir sonuç çıkar.
 *
 * Ölçüm mobil koşullarda yapılır: Google mobil sürümü esas alıyor ve
 * Türkiye'de e-ticaret trafiğinin çoğu telefondan geliyor.
 */

export type HizAnaliziSonucu = {
  olculenSayfa: number;
  /** Ölçülen sayfaların ortalama performans skoru. */
  ortalamaPerformans: number | null;
  /** Google'ın "iyi" saydığı eşiği geçen sayfa sayısı (90+). */
  iyiSayfa: number;
  /** 50'nin altında kalan sayfa sayısı. */
  kotuSayfa: number;
  /** Şablon bazında ortalama; asıl karar bu tablodan çıkar. */
  turOrtalamalari: { tur: SayfaTuru; ortalama: number; adet: number }[];
};

const BOS: HizAnaliziSonucu = {
  olculenSayfa: 0,
  ortalamaPerformans: null,
  iyiSayfa: 0,
  kotuSayfa: 0,
  turOrtalamalari: [],
};

/** Ölçüm önceliği: her türden temsilci olsun diye sırayla dolaşılır. */
const TUR_SIRASI: SayfaTuru[] = ["anasayfa", "urun", "kategori", "icerik", "diger"];

type SayfaSatiri = { id: string; url: string; page_type: string; seo_score: number | null };

/**
 * Ölçülecek sayfaları seçer.
 *
 * Türler arasında sırayla dolaşılır (round-robin): önce her türden bir
 * sayfa, sonra ikinciler… Böylece hak yalnızca ürün sayfalarına harcanmaz
 * ve kategori şablonundaki bir sorun gözden kaçmaz.
 */
export function olculecekleriSec(sayfalar: SayfaSatiri[], limit: number): SayfaSatiri[] {
  const kovalar = new Map<string, SayfaSatiri[]>();

  for (const s of sayfalar) {
    const tur = TUR_SIRASI.includes(s.page_type as SayfaTuru) ? s.page_type : "diger";
    if (!kovalar.has(tur)) kovalar.set(tur, []);
    kovalar.get(tur)!.push(s);
  }

  // Her kova kendi içinde en düşük SEO skorundan başlar: sorunlu sayfa
  // ölçülmeye daha değerdir.
  for (const liste of kovalar.values()) {
    liste.sort((a, b) => (a.seo_score ?? 101) - (b.seo_score ?? 101));
  }

  const secilenler: SayfaSatiri[] = [];
  let tur = 0;

  while (secilenler.length < limit) {
    let eklendi = false;
    for (const t of TUR_SIRASI) {
      const liste = kovalar.get(t);
      if (!liste?.length) continue;
      if (secilenler.length >= limit) break;
      secilenler.push(liste.shift()!);
      eklendi = true;
    }
    if (!eklendi) break;
    tur += 1;
    // Güvenlik: sonsuz döngü olmasın.
    if (tur > limit) break;
  }

  return secilenler;
}

function ortalama(sayilar: number[]): number | null {
  if (!sayilar.length) return null;
  return Math.round(sayilar.reduce((t, s) => t + s, 0) / sayilar.length);
}

function sayisal(sonuc: SiteHiziSonucu, anahtar: string): number | null {
  return sonuc.olcumler.find((x) => x.anahtar === anahtar)?.hamDeger ?? null;
}

/** Milisaniye alanları tam sayı sütunlarına yazılır. */
function ms(sonuc: SiteHiziSonucu, anahtar: string): number | null {
  const d = sayisal(sonuc, anahtar);
  return d === null ? null : Math.round(d);
}

/** Ölçümleri sayfa başına güncel durum olarak yazar. */
async function olcumleriKaydet(
  projeId: string,
  olcumler: { sayfa: SayfaSatiri; sonuc: SiteHiziSonucu }[],
): Promise<void> {
  const supabase = yoneticiIstemcisi();

  const satirlar = olcumler.map(({ sayfa, sonuc }) => ({
    project_id: projeId,
    // Adres taramada bulunamadıysa sayfa bağı kurulmaz; ölçüm yine saklanır.
    page_id: sayfa.id || null,
    url: sonuc.url,
    mobil: true,
    performans: sonuc.performans,
    erisilebilirlik: sonuc.skorlar.find((s) => s.anahtar === "accessibility")?.skor ?? null,
    en_iyi_uygulama: sonuc.skorlar.find((s) => s.anahtar === "best-practices")?.skor ?? null,
    seo_skoru: sonuc.skorlar.find((s) => s.anahtar === "seo")?.skor ?? null,
    lcp_ms: ms(sonuc, "largest-contentful-paint"),
    cls: sayisal(sonuc, "cumulative-layout-shift"),
    tbt_ms: ms(sonuc, "total-blocking-time"),
    fcp_ms: ms(sonuc, "first-contentful-paint"),
    hiz_endeksi_ms: ms(sonuc, "speed-index"),
    ttfb_ms: ms(sonuc, "server-response-time"),
    bulgular: sonuc.bulgular as never,
    olculdu_at: sonuc.olculduAt,
  }));

  for (let i = 0; i < satirlar.length; i += 200) {
    await supabase
      .from("sayfa_hizi")
      .upsert(satirlar.slice(i, i + 200) as never, { onConflict: "project_id,url,mobil" });
  }
}

/** Sağlayıcının tek istekte kabul ettiği azami görev sayısı. */
const OBEK = 100;

/**
 * Seçilen sayfalar için ölçüm görevi açar ve kimlikleri kaydeder.
 *
 * Halihazırda açık görevi olan adres atlanır: ikinci görev açmak aynı
 * ölçüm için ikinci kez ödemek olurdu.
 */
async function hizGorevleriniAc(projeId: string, sayfalar: SayfaSatiri[]): Promise<void> {
  const supabase = yoneticiIstemcisi();
  const esik = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const { data: acik } = await supabase
    .from("saglayici_gorevleri")
    .select("hedef")
    .eq("project_id", projeId)
    .eq("tur", "hiz")
    .is("collected_at", null)
    .gte("posted_at", esik);

  const acikAdresler = new Set(((acik ?? []) as { hedef: string }[]).map((g) => g.hedef));
  const eksikler = sayfalar.filter((s) => !acikAdresler.has(s.url));
  if (!eksikler.length) return;

  for (let i = 0; i < eksikler.length; i += OBEK) {
    const dilim = eksikler.slice(i, i + OBEK);
    try {
      const yanit = await yenidenDene(() =>
        dfsIstek<never>(
          "/on_page/lighthouse/task_post",
          dilim.map((sayfa) => ({ url: sayfa.url, for_mobile: true })),
        ),
      );

      // Görevler gönderilen sırayla döner; adresle eşlemek için bu şart.
      const satirlar = (yanit.tasks ?? [])
        .map((g, sira) => ({ id: g.id, sayfa: dilim[sira] }))
        .filter((x): x is { id: string; sayfa: SayfaSatiri } => Boolean(x.id && x.sayfa))
        .map((x) => ({
          project_id: projeId,
          tur: "hiz",
          hedef: x.sayfa.url,
          task_id: x.id,
        }));

      // Kimlikler HEMEN kaydedilir; yazılmazsa ödenmiş görev kaybolur.
      if (satirlar.length) {
        await supabase.from("saglayici_gorevleri").insert(satirlar as never);
      }
    } catch (hata) {
      console.error("[sayfa-hizi] görevler açılamadı", {
        adet: dilim.length,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }
}

/** Hesapta tamamlanmış hız görevlerinin kimlikleri. */
async function hazirHizGorevleri(): Promise<Set<string>> {
  try {
    const satirlar = await dfsTumSonuclar<{ id?: string }>(
      "/on_page/lighthouse/tasks_ready",
      undefined,
      "GET",
    );
    return new Set(satirlar.map((s) => s.id).filter((i): i is string => Boolean(i)));
  } catch {
    return new Set();
  }
}

type HamLighthouseYanit = Parameters<typeof lighthouseCevir>[0];

/**
 * Tamamlanmış ölçümleri okur, kaydeder ve okunmuş işaretler.
 *
 * Görev açmaz, ücret doğurmaz: yalnızca ödenmiş sonuçları toplar.
 */
export async function bekleyenHizOlcumleriniTopla(
  proje: Proje,
): Promise<{ sayfa: SayfaSatiri; sonuc: SiteHiziSonucu }[]> {
  const supabase = yoneticiIstemcisi();
  const esik = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const { data: bekleyenVeri } = await supabase
    .from("saglayici_gorevleri")
    .select("id, task_id, hedef")
    .eq("project_id", proje.id)
    .eq("tur", "hiz")
    .is("collected_at", null)
    .gte("posted_at", esik);

  const bekleyenler = (bekleyenVeri ?? []) as { id: string; task_id: string; hedef: string }[];
  if (!bekleyenler.length) return [];

  const hazir = await hazirHizGorevleri();
  const okunacaklar = bekleyenler.filter((g) => hazir.has(g.task_id));
  if (!okunacaklar.length) return [];

  // Adresten sayfa kimliğine eşleme; ölçüm sayfaya bağlanabilsin.
  const { data: sayfaVerisi } = await supabase
    .from("pages")
    .select("id, url, page_type, seo_score")
    .eq("project_id", proje.id)
    .in(
      "url",
      okunacaklar.map((g) => g.hedef),
    );

  const sayfaHaritasi = new Map(
    ((sayfaVerisi ?? []) as SayfaSatiri[]).map((s) => [s.url, s]),
  );

  const olcumler: { sayfa: SayfaSatiri; sonuc: SiteHiziSonucu }[] = [];
  const okunanlar: string[] = [];

  for (const gorev of okunacaklar) {
    try {
      const veri = await dfsTekSonuc<HamLighthouseYanit>(
        `/on_page/lighthouse/task_get/json/${gorev.task_id}`,
        undefined,
        "GET",
      );
      okunanlar.push(gorev.id);
      if (!veri) continue;

      const sayfa = sayfaHaritasi.get(gorev.hedef) ?? {
        id: "",
        url: gorev.hedef,
        page_type: "diger",
        seo_score: null,
      };

      olcumler.push({
        sayfa,
        sonuc: lighthouseCevir(veri, gorev.hedef, proje.domain, true),
      });
    } catch {
      // Bir görev okunamazsa diğerleri etkilenmemeli; satır açık kalır.
    }
  }

  if (okunanlar.length) {
    await supabase
      .from("saglayici_gorevleri")
      .update({ collected_at: new Date().toISOString() })
      .in("id", okunanlar);
  }

  if (olcumler.length) await olcumleriKaydet(proje.id, olcumler);

  return olcumler;
}

/** Bu projede sonucu hâlâ beklenen hız görevi sayısı. */
export async function bekleyenHizGorevSayisi(projeId: string): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const esik = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const { count } = await supabase
    .from("saglayici_gorevleri")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projeId)
    .eq("tur", "hiz")
    .is("collected_at", null)
    .gte("posted_at", esik);
  return count ?? 0;
}

/**
 * Ölçüm görevlerini açar.
 *
 * Analiz akışında ERKEN çağrılır: Lighthouse sayfa başına ~25 saniye
 * sürüyor, sonuçlar aradaki adımlar çalışırken hazırlanır ve sonda
 * toplanır. Görevleri açıp hemen beklemek işin süresini boşuna uzatırdı.
 */
export async function hizGorevleriniBaslat(proje: Proje): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const { limitler, aktifMi } = await abonelikDurumu(proje.user_id);

  if (!aktifMi || limitler?.sayfa_hizi !== true) return 0;

  const limit = typeof limitler.hiz_olcum_sayfa === "number" ? limitler.hiz_olcum_sayfa : 0;
  if (limit <= 0) return 0;

  const { data: sayfaVerisi } = await supabase
    .from("pages")
    .select("id, url, page_type, seo_score")
    .eq("project_id", proje.id)
    // Yönlendirilen ve hatalı sayfaları ölçmek anlamsız.
    .eq("status_code", 200)
    .limit(1000);

  const sayfalar = (sayfaVerisi ?? []) as SayfaSatiri[];
  if (!sayfalar.length) return 0;

  const secilenler = olculecekleriSec(sayfalar, limit);
  await hizGorevleriniAc(proje.id, secilenler);
  return secilenler.length;
}

/**
 * Tamamlanmış ölçümleri toplar ve özet üretir.
 *
 * Yeni görev açmaz; yalnızca ödenmiş sonuçları okur.
 */
export async function hizAnaliziTamamla(proje: Proje): Promise<HizAnaliziSonucu> {
  const olcumler = await bekleyenHizOlcumleriniTopla(proje);
  if (!olcumler.length) return BOS;

  /* ---------------- Özet ---------------- */

  const skorlar = olcumler.map((o) => o.sonuc.performans);

  const turKovalari = new Map<SayfaTuru, number[]>();
  for (const { sayfa, sonuc } of olcumler) {
    const tur = (TUR_SIRASI.includes(sayfa.page_type as SayfaTuru)
      ? sayfa.page_type
      : "diger") as SayfaTuru;
    if (!turKovalari.has(tur)) turKovalari.set(tur, []);
    turKovalari.get(tur)!.push(sonuc.performans);
  }

  return {
    olculenSayfa: olcumler.length,
    ortalamaPerformans: ortalama(skorlar),
    iyiSayfa: skorlar.filter((s) => s >= 90).length,
    kotuSayfa: skorlar.filter((s) => s < 50).length,
    turOrtalamalari: [...turKovalari.entries()]
      .map(([tur, liste]) => ({ tur, ortalama: ortalama(liste)!, adet: liste.length }))
      .sort((a, b) => a.ortalama - b.ortalama),
  };
}
