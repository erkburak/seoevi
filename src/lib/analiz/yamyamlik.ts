import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { SerpOgesi } from "@/types/database";

/**
 * Kendi kendini yeme (yamyamlık) tespiti.
 *
 * Aynı anahtar kelime için sitenizin birden fazla sayfası yarıştığında
 * Google hangisini öne çıkaracağına karar veremez. Sinyaller bölünür ve
 * ikisi de olması gerektiği yerden aşağıda kalır.
 *
 * E-ticarette bu çok yaygındır:
 *   - Aynı ürünün farklı renk/beden varyantları ayrı sayfa olduğunda
 *   - Kategori sayfası ile alt kategori aynı kelimeyi hedeflediğinde
 *   - Blog yazısı ile ürün sayfası aynı kelimede çakıştığında
 *
 * Tespit, mevcut SERP kayıtlarından yapılır; ek sağlayıcı çağrısı yoktur.
 */

export type YamyamSatiri = {
  keyword: string;
  aramaHacmi: number | null;
  /** Aynı kelimede sıralanan kendi sayfalarımız. */
  sayfalar: { url: string; pozisyon: number }[];
  /** En iyi sıramız. */
  enIyiPozisyon: number;
  /** Çakışan sayfa sayısı. */
  cakismaSayisi: number;
  /**
   * Önem: hacim ve konuma göre. Yüksek hacimli ve ilk sayfaya yakın
   * çakışmalar önce düzeltilmeli.
   */
  onem: number;
};

export type YamyamOzeti = {
  incelenenKelime: number;
  cakisanKelime: number;
  etkilenenSayfa: number;
  toplamHacim: number;
  satirlar: YamyamSatiri[];
};

function onemHesapla(hacim: number | null, enIyi: number, cakisma: number): number {
  const hacimPuan = Math.min(1, Math.log10((hacim ?? 0) + 1) / 5) * 50;
  // İlk sayfaya yakın çakışmalar daha kıymetli.
  const konumPuan = enIyi <= 10 ? 30 : enIyi <= 20 ? 22 : enIyi <= 50 ? 12 : 5;
  const cakismaPuan = Math.min(20, (cakisma - 1) * 10);
  return Math.round(hacimPuan + konumPuan + cakismaPuan);
}

/**
 * Aynı kelimede yarışan kendi sayfalarımızı bulur.
 */
export async function yamyamlikAnalizi(
  projeId: string,
  bizimAlanAdi: string,
): Promise<YamyamOzeti> {
  const supabase = yoneticiIstemcisi();

  const { data: serpler } = await supabase
    .from("serp_results")
    .select("keyword, items, device, fetched_at")
    .eq("project_id", projeId)
    .order("fetched_at", { ascending: false })
    .limit(600);

  if (!serpler?.length) {
    return {
      incelenenKelime: 0,
      cakisanKelime: 0,
      etkilenenSayfa: 0,
      toplamHacim: 0,
      satirlar: [],
    };
  }

  // Kelime başına yalnızca en yeni kayıt.
  const enYeni = new Map<string, (typeof serpler)[number]>();
  for (const s of serpler) {
    if (!enYeni.has(s.keyword)) enYeni.set(s.keyword, s);
  }

  const kelimeAdlari = [...enYeni.keys()];
  const { data: kelimeler } = await supabase
    .from("keywords")
    .select("keyword, search_volume")
    .eq("project_id", projeId)
    .in("keyword", kelimeAdlari.slice(0, 500));

  const hacimler = new Map((kelimeler ?? []).map((k) => [k.keyword, k.search_volume]));

  const satirlar: YamyamSatiri[] = [];
  const etkilenenSayfalar = new Set<string>();

  for (const s of enYeni.values()) {
    const ogeler = (s.items ?? []) as SerpOgesi[];

    // Bize ait organik sonuçlar
    const bizimkiler = ogeler
      .filter(
        (o) =>
          o.tur === "organic" &&
          o.pozisyon !== null &&
          o.url &&
          (o.bizim_mi || o.alan_adi === bizimAlanAdi),
      )
      .map((o) => ({ url: o.url!, pozisyon: o.pozisyon! }));

    // Aynı adresin tekrarı çakışma sayılmaz.
    const benzersiz = new Map<string, number>();
    for (const b of bizimkiler) {
      const mevcut = benzersiz.get(b.url);
      if (mevcut === undefined || b.pozisyon < mevcut) benzersiz.set(b.url, b.pozisyon);
    }

    if (benzersiz.size < 2) continue;

    const sayfalar = [...benzersiz.entries()]
      .map(([url, pozisyon]) => ({ url, pozisyon }))
      .sort((a, b) => a.pozisyon - b.pozisyon);

    for (const p of sayfalar) etkilenenSayfalar.add(p.url);

    const hacim = hacimler.get(s.keyword) ?? null;
    const enIyi = sayfalar[0].pozisyon;

    satirlar.push({
      keyword: s.keyword,
      aramaHacmi: hacim,
      sayfalar,
      enIyiPozisyon: enIyi,
      cakismaSayisi: sayfalar.length,
      onem: onemHesapla(hacim, enIyi, sayfalar.length),
    });
  }

  satirlar.sort((a, b) => b.onem - a.onem);

  return {
    incelenenKelime: enYeni.size,
    cakisanKelime: satirlar.length,
    etkilenenSayfa: etkilenenSayfalar.size,
    toplamHacim: satirlar.reduce((t, s) => t + (s.aramaHacmi ?? 0), 0),
    satirlar: satirlar.slice(0, 100),
  };
}
