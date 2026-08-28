import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { alanAdiOzeti, siralananKelimeler, type SiralananKelime } from "@/lib/dataforseo/labs";
import { firsatSkoru } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { arasinda } from "@/lib/utils";
import type { FirsatTuru, Proje } from "@/types/database";

/**
 * Alan adının sıralama verisini işler:
 * anahtar kelimeler, sıralamalar, görünürlük ve fırsat skorları.
 */

export type KelimeAnaliziSonucu = {
  toplamKelime: number;
  ilkOn: number;
  tahminiTrafik: number;
  keywordSkoru: number;
  firsatSayisi: number;
  enIyiFirsatlar: { keyword: string; skor: number; pozisyon: number | null }[];
};

/** Sıralama dağılımından anahtar kelime performans skoru üretir. */
export function kelimePerformansSkoru(kelimeler: SiralananKelime[]): number {
  if (!kelimeler.length) return 0;

  const puan = kelimeler.reduce((t, k) => {
    const p = k.pozisyon;
    if (p === null) return t;
    if (p <= 3) return t + 100;
    if (p <= 10) return t + 72;
    if (p <= 20) return t + 42;
    if (p <= 50) return t + 18;
    return t + 6;
  }, 0);

  return Math.round(arasinda(puan / kelimeler.length, 0, 100));
}

export async function kelimeAnaliziYap({
  proje,
  limit = 500,
  tazelik,
}: {
  proje: Proje;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<KelimeAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const locationCode = proje.location_code ?? 2792;

  const [ozet, kelimeler] = await Promise.all([
    alanAdiOzeti({ domain: proje.domain, locationCode, languageCode: proje.language_code, tazelik }),
    siralananKelimeler({
      domain: proje.domain,
      locationCode,
      languageCode: proje.language_code,
      limit,
      tazelik,
    }),
  ]);

  if (!kelimeler.length) {
    return {
      toplamKelime: ozet.organik_kelime,
      ilkOn: ozet.ilk_on,
      tahminiTrafik: ozet.tahmini_trafik,
      keywordSkoru: 0,
      firsatSayisi: 0,
      enIyiFirsatlar: [],
    };
  }

  /* ---------------- Anahtar kelimeler ---------------- */

  const kelimeKayitlari = kelimeler.map((k) => ({
    project_id: proje.id,
    keyword: k.keyword,
    search_volume: k.arama_hacmi,
    cpc: k.cpc,
    competition: k.rekabet,
    competition_level:
      k.rekabet === null ? null : k.rekabet < 0.34 ? "dusuk" : k.rekabet < 0.67 ? "orta" : "yuksek",
    difficulty: k.zorluk,
    intent: k.amac,
    is_tracked: true,
    source: "labs",
    // Mevsimsellik analizi bu alandan beslenir.
    trend: k.trend as never,
    location_code: locationCode,
    language_code: proje.language_code,
    last_refreshed_at: new Date().toISOString(),
  }));

  for (let i = 0; i < kelimeKayitlari.length; i += 500) {
    await supabase
      .from("keywords")
      .upsert(kelimeKayitlari.slice(i, i + 500) as never, { onConflict: "project_id,keyword" });
  }

  const { data: kayitli } = await supabase
    .from("keywords")
    .select("id, keyword")
    .eq("project_id", proje.id);

  const kelimeKimlik = new Map((kayitli ?? []).map((k) => [k.keyword, k.id]));

  /* ---------------- Sıralamalar ---------------- */

  const siralamalar = kelimeler
    .filter((k) => kelimeKimlik.has(k.keyword))
    .map((k) => ({
      project_id: proje.id,
      keyword_id: kelimeKimlik.get(k.keyword)!,
      domain: proje.domain,
      is_competitor: false,
      position: k.pozisyon,
      previous_position: k.onceki_pozisyon,
      url: k.url,
      device: "desktop",
      etv: k.etv,
      checked_at: new Date().toISOString(),
    }));

  for (let i = 0; i < siralamalar.length; i += 500) {
    await supabase.from("keyword_rankings").insert(siralamalar.slice(i, i + 500) as never);
  }

  /* ---------------- Fırsat skorları ---------------- */

  // Not: Fırsat skoru burada SERP çağrısı yapmadan, mevcut sinyallerle
  // hesaplanır. Kullanıcı bir kelimenin detayını açtığında SERP verisi
  // canlı çekilir ve skor SERP yapısıyla birlikte yenilenir.
  const firsatlar = kelimeler
    .filter((k) => kelimeKimlik.has(k.keyword) && (k.arama_hacmi ?? 0) > 0)
    .map((k) => {
      const sonuc = firsatSkoru({
        aramaHacmi: k.arama_hacmi,
        zorluk: k.zorluk,
        rekabet: k.rekabet,
        mevcutPozisyon: k.pozisyon,
        amac: k.amac,
        serpOzellikSayisi: 0,
        alisverisVar: false,
        rakipSayisi: 0,
        alanAdiGucu: null,
      });

      const tur: FirsatTuru =
        k.pozisyon !== null && k.pozisyon > 10 && k.pozisyon <= 20 ? "hizli_kazanim" : "genel";

      return {
        project_id: proje.id,
        keyword_id: kelimeKimlik.get(k.keyword)!,
        score: sonuc.skor,
        potential_traffic: sonuc.tahminiTrafik,
        current_position: k.pozisyon,
        target_position: sonuc.hedefPozisyon,
        reason: sonuc.gerekce,
        signals: sonuc.sinyaller as never,
        opportunity_type: tur,
        status: "acik",
        keyword: k.keyword,
        _skor: sonuc.skor,
      };
    })
    .sort((a, b) => b._skor - a._skor);

  const kaydedilecek = firsatlar.slice(0, 300).map(({ keyword: _k, _skor, ...rest }) => {
    void _k;
    void _skor;
    return rest;
  });

  if (kaydedilecek.length) {
    for (let i = 0; i < kaydedilecek.length; i += 300) {
      await supabase
        .from("keyword_opportunities")
        .upsert(kaydedilecek.slice(i, i + 300) as never, {
          onConflict: "project_id,keyword_id,opportunity_type",
        });
    }
  }

  return {
    toplamKelime: ozet.organik_kelime || kelimeler.length,
    ilkOn: ozet.ilk_on,
    tahminiTrafik: ozet.tahmini_trafik,
    keywordSkoru: kelimePerformansSkoru(kelimeler),
    firsatSayisi: firsatlar.filter((f) => f._skor >= 60).length,
    enIyiFirsatlar: firsatlar.slice(0, 5).map((f) => ({
      keyword: f.keyword,
      skor: f._skor,
      pozisyon: f.current_position,
    })),
  };
}
