import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { alisverisGorunurlugu } from "@/lib/dataforseo/merchant";
import { merchantSkoru } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, Urun } from "@/types/database";

/**
 * Merchant (Google Alışveriş) analizi.
 *
 * Ürün verisi eksiklikleri sayfadan; Alışveriş görünürlüğü ise ürün adıyla
 * yapılan Alışveriş sorgusundan çıkarılır. Maliyeti sınırlamak için
 * yalnızca öncelikli ürünler sorgulanır.
 */

export type MerchantAnaliziSonucu = {
  incelenenUrun: number;
  ortalamaSaglik: number;
  gorunurUrun: number;
  enSikEksikler: { alan: string; adet: number }[];
};

/** Alışveriş sorgusu yapılacak ürün sayısı — maliyet kontrolü. */
const SORGULANACAK_URUN = 10;

export async function merchantAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<MerchantAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();

  const { data: urunVerisi } = await supabase
    .from("products")
    .select("*")
    .eq("project_id", proje.id)
    .order("seo_score", { ascending: false, nullsFirst: false })
    .limit(500);

  const urunler = (urunVerisi ?? []) as Urun[];
  if (!urunler.length) {
    return { incelenenUrun: 0, ortalamaSaglik: 0, gorunurUrun: 0, enSikEksikler: [] };
  }

  const eksikSayaci = new Map<string, number>();
  const skorlar: number[] = [];
  let gorunurUrun = 0;

  // Tüm ürünler için alan bazlı sağlık hesaplanır.
  const denetimler: Record<string, unknown>[] = [];

  // Yalnızca ilk N ürün için canlı Alışveriş sorgusu yapılır.
  const sorgulanacaklar = urunler.filter((u) => u.name).slice(0, SORGULANACAK_URUN);
  const gorunurlukler = new Map<string, Awaited<ReturnType<typeof alisverisGorunurlugu>>>();

  for (const urun of sorgulanacaklar) {
    try {
      const sonuc = await alisverisGorunurlugu({
        keyword: urun.name!,
        locationCode: proje.location_code ?? 2792,
        languageCode: proje.language_code,
        bizimAlanAdi: proje.domain,
        tazelik,
      });
      gorunurlukler.set(urun.id, sonuc);
    } catch (hata) {
      console.warn("[merchant] alışveriş sorgusu başarısız", {
        urun: urun.url,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  for (const urun of urunler) {
    const gorunurluk = gorunurlukler.get(urun.id);
    const alisverisGorunur = Boolean(gorunurluk?.bizim_urun);
    if (alisverisGorunur) gorunurUrun++;

    const { skor, eksikler } = merchantSkoru({
      gtin: Boolean(urun.gtin),
      mpn: Boolean(urun.mpn),
      marka: Boolean(urun.brand),
      fiyat: urun.price !== null && urun.price > 0,
      stok: Boolean(urun.availability),
      urunSchema: urun.has_product_schema,
      urunAdi: Boolean(urun.name && urun.name.length > 10),
      aciklama: (urun.description_length ?? 0) > 200,
      alisverisGorunur,
    });

    skorlar.push(skor);
    for (const e of eksikler) eksikSayaci.set(e, (eksikSayaci.get(e) ?? 0) + 1);

    // Yalnızca sorgulanan ürünler için ayrıntılı kayıt tutulur.
    if (gorunurluk) {
      denetimler.push({
        project_id: proje.id,
        product_id: urun.id,
        health_score: skor,
        missing_fields: eksikler as never,
        shopping_visible: alisverisGorunur,
        shopping_position: gorunurluk.bizim_urun?.pozisyon ?? null,
        seller_count: gorunurluk.satici_sayisi,
        price_position: gorunurluk.fiyat_konumu,
        competitors: gorunurluk.urunler.slice(0, 8).map((u) => ({
          alan_adi: u.alan_adi ?? u.satici ?? "",
          fiyat: u.fiyat,
          baslik: u.baslik,
        })) as never,
        data: {} as never,
      });
    }
  }

  // Proje geneli özet kaydı
  const ortalama = Math.round(skorlar.reduce((t, s) => t + s, 0) / skorlar.length);
  const enSikEksikler = [...eksikSayaci.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([alan, adet]) => ({ alan, adet }));

  denetimler.push({
    project_id: proje.id,
    product_id: null,
    health_score: ortalama,
    missing_fields: enSikEksikler.map((e) => e.alan) as never,
    shopping_visible: gorunurUrun > 0,
    seller_count: null,
    competitors: [] as never,
    data: {
      incelenen_urun: urunler.length,
      sorgulanan_urun: sorgulanacaklar.length,
      gorunur_urun: gorunurUrun,
      eksik_dagilimi: enSikEksikler,
    } as never,
  });

  await supabase.from("merchant_audits").insert(denetimler as never);

  // Proje skoruna işle
  const mevcut = (proje.scores ?? {}) as Record<string, number | undefined>;
  await supabase
    .from("projects")
    .update({ scores: { ...mevcut, merchant: ortalama } as never })
    .eq("id", proje.id);

  return {
    incelenenUrun: urunler.length,
    ortalamaSaglik: ortalama,
    gorunurUrun,
    enSikEksikler,
  };
}
