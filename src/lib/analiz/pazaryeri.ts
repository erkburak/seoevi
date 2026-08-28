import "server-only";

import { oyuncuTani, TUR_AGIRLIGI, type OyuncuTuru } from "@/config/pazaryerleri";
import { tiklamaOrani } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, SerpOgesi } from "@/types/database";

/**
 * Pazaryeri Radarı.
 *
 * Türkiye'de bir e-ticaret sitesinin en büyük SEO rakibi genellikle
 * başka bir mağaza değil, kendi ürününü de satan pazaryeridir. Kendi
 * ürününüzde Trendyol üstte çıktığında satış olmuyor değil — oluyor,
 * ama komisyonlu kanaldan. Bu doğrudan kâr kaybıdır.
 *
 * Bu modül, takip edilen kelimelerin mevcut SERP kayıtlarını okuyup
 * hangi pazaryerinin nerede olduğunu ve size göre konumunu çıkarır.
 * Ek sağlayıcı çağrısı yapılmaz; maliyeti sıfırdır.
 */

export type RadarOyuncusu = {
  alan_adi: string;
  ad: string;
  tur: OyuncuTuru;
  pozisyon: number;
  ustumuzde: boolean;
};

export type RadarSatiri = {
  keyword: string;
  keywordId: string | null;
  bizimPozisyon: number | null;
  oyuncular: RadarOyuncusu[];
  ustumuzdekiPazaryeri: number;
  ustumuzdekiOyuncu: number;
  baskiSkoru: number;
  aramaHacmi: number | null;
  kayipTahmini: number;
};

/**
 * Baskı skoru (0-100).
 *
 * Üç sinyalden oluşur:
 *   - Üstümüzdeki oyuncuların ağırlıklı sayısı (pazaryeri en ağır)
 *   - İlk 10'daki oyuncu yoğunluğu (organik alan ne kadar dar)
 *   - Bizim konumumuz (hiç sıralanmıyorsak baskı en yüksek)
 */
function baskiSkoruHesapla(
  oyuncular: RadarOyuncusu[],
  bizimPozisyon: number | null,
): number {
  const ustteAgirlik = oyuncular
    .filter((o) => o.ustumuzde)
    .reduce((t, o) => t + TUR_AGIRLIGI[o.tur], 0);

  // 3 ve üzeri ağırlıklı oyuncu üstteyse bu bileşen doyuma ulaşır.
  const ustPuan = Math.min(1, ustteAgirlik / 3) * 55;

  const ilkOnda = oyuncular.filter((o) => o.pozisyon <= 10);
  const yogunlukAgirlik = ilkOnda.reduce((t, o) => t + TUR_AGIRLIGI[o.tur], 0);
  const yogunlukPuan = Math.min(1, yogunlukAgirlik / 6) * 25;

  const konumPuan =
    bizimPozisyon === null ? 20 : bizimPozisyon > 20 ? 14 : bizimPozisyon > 10 ? 8 : 0;

  return Math.round(Math.min(100, ustPuan + yogunlukPuan + konumPuan));
}

/**
 * Üstümüzdeki oyuncular yüzünden kaybedilen tahmini aylık ziyaret.
 * "Onlar olmasaydı kaç sıra yukarıda olurduk?" varsayımına dayanır.
 */
function kayipHesapla(
  oyuncular: RadarOyuncusu[],
  bizimPozisyon: number | null,
  aramaHacmi: number | null,
): number {
  if (!aramaHacmi || aramaHacmi <= 0) return 0;

  const ustte = oyuncular.filter((o) => o.ustumuzde).length;
  if (ustte === 0) return 0;

  const mevcut = bizimPozisyon ?? 30;
  // Üstümüzdeki oyuncular olmasaydı bulunacağımız yaklaşık konum.
  const olasi = Math.max(1, mevcut - ustte);

  const simdiki = (aramaHacmi * tiklamaOrani(mevcut)) / 100;
  const olasiTrafik = (aramaHacmi * tiklamaOrani(olasi)) / 100;

  return Math.round(Math.max(0, olasiTrafik - simdiki) * 100) / 100;
}

/** Bir SERP kaydından radar satırı üretir. */
function satirUret(
  keyword: string,
  keywordId: string | null,
  ogeler: SerpOgesi[],
  bizimAlanAdi: string,
  aramaHacmi: number | null,
): RadarSatiri {
  const organikler = ogeler
    .filter((o) => o.tur === "organic" && o.pozisyon !== null)
    .sort((a, b) => (a.pozisyon ?? 999) - (b.pozisyon ?? 999));

  const bizimki = organikler.find(
    (o) => o.bizim_mi || o.alan_adi === bizimAlanAdi,
  );
  const bizimPozisyon = bizimki?.pozisyon ?? null;

  const gorulen = new Set<string>();
  const oyuncular: RadarOyuncusu[] = [];

  for (const o of organikler.slice(0, 20)) {
    const oyuncu = oyuncuTani(o.alan_adi);
    if (!oyuncu) continue;
    // Aynı oyuncu birden çok kez çıkabilir; en iyi sırası alınır.
    if (gorulen.has(oyuncu.alanAdi)) continue;
    gorulen.add(oyuncu.alanAdi);

    const pozisyon = o.pozisyon!;
    oyuncular.push({
      alan_adi: oyuncu.alanAdi,
      ad: oyuncu.ad,
      tur: oyuncu.tur,
      pozisyon,
      ustumuzde: bizimPozisyon === null || pozisyon < bizimPozisyon,
    });
  }

  return {
    keyword,
    keywordId,
    bizimPozisyon,
    oyuncular,
    ustumuzdekiPazaryeri: oyuncular.filter((o) => o.ustumuzde && o.tur === "pazaryeri").length,
    ustumuzdekiOyuncu: oyuncular.filter((o) => o.ustumuzde).length,
    baskiSkoru: baskiSkoruHesapla(oyuncular, bizimPozisyon),
    aramaHacmi,
    kayipTahmini: kayipHesapla(oyuncular, bizimPozisyon, aramaHacmi),
  };
}

export type RadarSonucu = {
  incelenenKelime: number;
  baskiAltindaKelime: number;
  toplamKayip: number;
  /** Alan adına göre: kaç kelimede üstümüzde. */
  oyuncuOzeti: { alan_adi: string; ad: string; tur: OyuncuTuru; ustteKelime: number; kayip: number }[];
};

/**
 * Projedeki mevcut SERP kayıtlarını tarayıp pazaryeri baskısını çıkarır.
 * Yeni SERP çağrısı yapılmaz.
 */
export async function pazaryeriRadariCalistir({
  proje,
}: {
  proje: Proje;
}): Promise<RadarSonucu> {
  const supabase = yoneticiIstemcisi();

  const { data: ayar } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "pazaryeri_radari")
    .maybeSingle();

  const sinir = Number(
    (ayar?.value as { analiz_kelime_siniri?: number })?.analiz_kelime_siniri ?? 300,
  );

  // Her kelimenin en güncel SERP kaydı.
  const { data: serpler } = await supabase
    .from("serp_results")
    .select("keyword, keyword_id, items, device, fetched_at")
    .eq("project_id", proje.id)
    .order("fetched_at", { ascending: false })
    .limit(sinir * 2);

  if (!serpler?.length) {
    return { incelenenKelime: 0, baskiAltindaKelime: 0, toplamKayip: 0, oyuncuOzeti: [] };
  }

  // Kelime + cihaz başına yalnızca en yeni kayıt.
  const enYeni = new Map<string, (typeof serpler)[number]>();
  for (const s of serpler) {
    const anahtar = `${s.keyword}|${s.device}`;
    if (!enYeni.has(anahtar)) enYeni.set(anahtar, s);
  }

  // Arama hacimleri
  const kelimeAdlari = [...new Set([...enYeni.values()].map((s) => s.keyword))];
  const { data: kelimeler } = await supabase
    .from("keywords")
    .select("keyword, search_volume")
    .eq("project_id", proje.id)
    .in("keyword", kelimeAdlari.slice(0, 500));

  const hacimler = new Map((kelimeler ?? []).map((k) => [k.keyword, k.search_volume]));

  const satirlar: RadarSatiri[] = [];
  for (const s of [...enYeni.values()].slice(0, sinir)) {
    satirlar.push(
      satirUret(
        s.keyword,
        s.keyword_id,
        (s.items ?? []) as SerpOgesi[],
        proje.domain,
        hacimler.get(s.keyword) ?? null,
      ),
    );
  }

  /* --- Kaydet --- */
  const kayitlar = satirlar.map((r) => ({
    project_id: proje.id,
    keyword_id: r.keywordId,
    keyword: r.keyword,
    bizim_pozisyon: r.bizimPozisyon,
    oyuncular: r.oyuncular as never,
    ustumuzdeki_pazaryeri: r.ustumuzdekiPazaryeri,
    ustumuzdeki_oyuncu: r.ustumuzdekiOyuncu,
    baski_skoru: r.baskiSkoru,
    arama_hacmi: r.aramaHacmi,
    kayip_tahmini: r.kayipTahmini,
    device: "desktop",
    olculdu_at: new Date().toISOString(),
  }));

  if (kayitlar.length) {
    const { error } = await supabase
      .from("marketplace_presence")
      .upsert(kayitlar, { onConflict: "project_id,keyword,device" });

    if (error) {
      console.error("[pazaryeri] kayıt yazılamadı", { mesaj: error.message });
    }
  }

  /* --- Özet --- */
  const oyuncuHaritasi = new Map<
    string,
    { alan_adi: string; ad: string; tur: OyuncuTuru; ustteKelime: number; kayip: number }
  >();

  for (const r of satirlar) {
    for (const o of r.oyuncular) {
      if (!o.ustumuzde) continue;
      const mevcut = oyuncuHaritasi.get(o.alan_adi) ?? {
        alan_adi: o.alan_adi,
        ad: o.ad,
        tur: o.tur,
        ustteKelime: 0,
        kayip: 0,
      };
      mevcut.ustteKelime += 1;
      // Kayıp, üstümüzdeki oyuncular arasında eşit paylaştırılır.
      mevcut.kayip += r.kayipTahmini / Math.max(1, r.ustumuzdekiOyuncu);
      oyuncuHaritasi.set(o.alan_adi, mevcut);
    }
  }

  return {
    incelenenKelime: satirlar.length,
    baskiAltindaKelime: satirlar.filter((r) => r.ustumuzdekiOyuncu > 0).length,
    toplamKayip: Math.round(satirlar.reduce((t, r) => t + r.kayipTahmini, 0)),
    oyuncuOzeti: [...oyuncuHaritasi.values()]
      .map((o) => ({ ...o, kayip: Math.round(o.kayip) }))
      .sort((a, b) => b.kayip - a.kayip || b.ustteKelime - a.ustteKelime),
  };
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export async function radarSatirlari(
  projeId: string,
  limit = 100,
): Promise<RadarSatiri[]> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase
    .from("marketplace_presence")
    .select("*")
    .eq("project_id", projeId)
    .order("kayip_tahmini", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    keyword: r.keyword,
    keywordId: r.keyword_id,
    bizimPozisyon: r.bizim_pozisyon,
    oyuncular: (r.oyuncular ?? []) as RadarOyuncusu[],
    ustumuzdekiPazaryeri: r.ustumuzdeki_pazaryeri,
    ustumuzdekiOyuncu: r.ustumuzdeki_oyuncu,
    baskiSkoru: r.baski_skoru,
    aramaHacmi: r.arama_hacmi,
    kayipTahmini: Number(r.kayip_tahmini ?? 0),
  }));
}

export async function radarOzeti(projeId: string): Promise<RadarSonucu> {
  const satirlar = await radarSatirlari(projeId, 500);

  const oyuncuHaritasi = new Map<
    string,
    { alan_adi: string; ad: string; tur: OyuncuTuru; ustteKelime: number; kayip: number }
  >();

  for (const r of satirlar) {
    for (const o of r.oyuncular) {
      if (!o.ustumuzde) continue;
      const mevcut = oyuncuHaritasi.get(o.alan_adi) ?? {
        alan_adi: o.alan_adi,
        ad: o.ad,
        tur: o.tur,
        ustteKelime: 0,
        kayip: 0,
      };
      mevcut.ustteKelime += 1;
      mevcut.kayip += r.kayipTahmini / Math.max(1, r.ustumuzdekiOyuncu);
      oyuncuHaritasi.set(o.alan_adi, mevcut);
    }
  }

  return {
    incelenenKelime: satirlar.length,
    baskiAltindaKelime: satirlar.filter((r) => r.ustumuzdekiOyuncu > 0).length,
    toplamKayip: Math.round(satirlar.reduce((t, r) => t + r.kayipTahmini, 0)),
    oyuncuOzeti: [...oyuncuHaritasi.values()]
      .map((o) => ({ ...o, kayip: Math.round(o.kayip) }))
      .sort((a, b) => b.kayip - a.kayip || b.ustteKelime - a.ustteKelime),
  };
}
