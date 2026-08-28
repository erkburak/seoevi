import "server-only";

import type { Cihaz, SerpOgesi } from "@/types/database";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, yenidenDene } from "./client";

/* ------------------------------------------------------------------ */
/* Ham tipler                                                          */
/* ------------------------------------------------------------------ */

type HamSerpOgesi = {
  type: string;
  rank_group?: number;
  rank_absolute?: number;
  position?: string;
  domain?: string;
  title?: string;
  description?: string;
  url?: string;
  breadcrumb?: string;
  is_featured_snippet?: boolean;
  is_image?: boolean;
  is_video?: boolean;
  price?: { current?: number; currency?: string };
  seller?: string;
  source?: string;
  links?: { title?: string; url?: string }[];
  items?: HamSerpOgesi[];
  expanded_element?: { title?: string; description?: string; url?: string }[];
  rating?: { value?: number; votes_count?: number };
  rectangle?: unknown;
};

type HamSerpSonuc = {
  keyword: string;
  se_results_count?: number;
  items_count?: number;
  items?: HamSerpOgesi[];
};

/* ------------------------------------------------------------------ */
/* Özellik adları                                                      */
/* ------------------------------------------------------------------ */

export const SERP_OZELLIK_ADI: Record<string, string> = {
  organic: "Organik sonuç",
  paid: "Reklam",
  featured_snippet: "Öne çıkan snippet",
  answer_box: "Cevap kutusu",
  local_pack: "Yerel sonuçlar",
  map: "Harita",
  people_also_ask: "İnsanlar bunu da soruyor",
  related_searches: "İlgili aramalar",
  shopping: "Alışveriş",
  google_shopping: "Google Alışveriş",
  popular_products: "Popüler ürünler",
  images: "Görseller",
  video: "Video",
  top_stories: "Haberler",
  knowledge_graph: "Bilgi paneli",
  carousel: "Karusel",
  twitter: "Sosyal",
  faq: "Sık sorulanlar",
  ai_overview: "AI özeti",
  discussions_and_forums: "Tartışmalar",
};

export function serpOzellikAdi(tur: string): string {
  return SERP_OZELLIK_ADI[tur] ?? tur.replace(/_/g, " ");
}

/* ------------------------------------------------------------------ */
/* Normalizasyon                                                       */
/* ------------------------------------------------------------------ */

function alanAdi(url: string | undefined, domain: string | undefined): string | null {
  if (domain) return domain.replace(/^www\./, "");
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function normalizeOgeler(
  ham: HamSerpOgesi[],
  bizimAlanAdi: string,
  rakipAlanAdlari: string[],
): SerpOgesi[] {
  const rakipSeti = new Set(rakipAlanAdlari.map((d) => d.replace(/^www\./, "")));

  return ham.map((o) => {
    const ad = alanAdi(o.url, o.domain);
    const ek: Record<string, never> = {};

    return {
      tur: o.type,
      pozisyon: o.rank_group ?? o.rank_absolute ?? null,
      baslik: o.title ?? null,
      aciklama: o.description ?? null,
      url: o.url ?? null,
      alan_adi: ad,
      bizim_mi: ad === bizimAlanAdi,
      rakip_mi: ad ? rakipSeti.has(ad) : false,
      ek: {
        ...ek,
        ...(o.price?.current !== undefined ? { fiyat: o.price.current, para_birimi: o.price.currency ?? "TRY" } : {}),
        ...(o.seller ? { satici: o.seller } : {}),
        ...(o.rating?.value !== undefined ? { puan: o.rating.value, oy: o.rating.votes_count ?? 0 } : {}),
        ...(o.links?.length ? { site_baglantilari: o.links.length } : {}),
        ...(o.items?.length ? { alt_oge: o.items.length } : {}),
        ...(o.type === "people_also_ask" && o.items
          ? { sorular: o.items.map((s) => s.title).filter(Boolean).slice(0, 8) }
          : {}),
        ...(o.type === "related_searches" && o.items
          ? { aramalar: o.items.map((s) => s.title).filter(Boolean).slice(0, 10) }
          : {}),
      } as SerpOgesi["ek"],
    };
  });
}

export type SerpAnalizi = {
  keyword: string;
  toplam_sonuc: number | null;
  ogeler: SerpOgesi[];
  ozellikler: { tur: string; ad: string; pozisyon: number | null; bizde_mi: boolean }[];
  bizim_pozisyon: number | null;
  bizim_url: string | null;
  rakip_pozisyonlari: { alan_adi: string; pozisyon: number; url: string | null }[];
  sorular: string[];
  ilgili_aramalar: string[];
  alisveris_var: boolean;
  onbellekten: boolean;
};

/**
 * Bir anahtar kelime için canlı SERP verisi çeker ve normalize eder.
 */
export async function serpGetir({
  keyword,
  locationCode,
  languageCode = "tr",
  device = "desktop",
  bizimAlanAdi,
  rakipler = [],
  derinlik = 30,
  tazelik,
  grup = "serp",
}: {
  keyword: string;
  locationCode: number;
  languageCode?: string;
  device?: Cihaz;
  bizimAlanAdi: string;
  rakipler?: string[];
  derinlik?: number;
  tazelik?: Tazelik;
  /**
   * Önbellek süre grubu. Ücretsiz araçlar "serp_arac" kullanır (24 saat);
   * sıralama takibinde tazelik önemli olduğu için varsayılan "serp" (6 saat).
   */
  grup?: "serp" | "serp_arac";
}): Promise<SerpAnalizi> {
  const gövde = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      device,
      os: device === "mobile" ? "android" : "windows",
      depth: derinlik,
    },
  ];

  const { veri, onbellekten } = await onbellekli(
    {
      endpoint: "/serp/google/organic/live/advanced",
      parametreler: { keyword, locationCode, languageCode, device, derinlik },
      grup,
      tazelik,
    },
    async () =>
      yenidenDene(() => dfsTekSonuc<HamSerpSonuc>("/serp/google/organic/live/advanced", gövde)),
  );

  const hamOgeler = veri?.items ?? [];
  const ogeler = normalizeOgeler(hamOgeler, bizimAlanAdi, rakipler);

  const organikler = ogeler.filter((o) => o.tur === "organic");
  const bizimki = organikler.find((o) => o.bizim_mi);

  const ozellikTurleri = new Set(ogeler.map((o) => o.tur).filter((t) => t !== "organic"));
  const ozellikler = [...ozellikTurleri].map((tur) => {
    const ilk = ogeler.find((o) => o.tur === tur)!;
    return {
      tur,
      ad: serpOzellikAdi(tur),
      pozisyon: ilk.pozisyon,
      bizde_mi: ogeler.some((o) => o.tur === tur && o.bizim_mi),
    };
  });

  const paaOgesi = ogeler.find((o) => o.tur === "people_also_ask");
  const ilgiliOge = ogeler.find((o) => o.tur === "related_searches");

  return {
    keyword: veri?.keyword ?? keyword,
    toplam_sonuc: veri?.se_results_count ?? null,
    ogeler,
    ozellikler,
    bizim_pozisyon: bizimki?.pozisyon ?? null,
    bizim_url: bizimki?.url ?? null,
    rakip_pozisyonlari: organikler
      .filter((o) => o.rakip_mi && o.pozisyon !== null && o.alan_adi)
      .map((o) => ({ alan_adi: o.alan_adi!, pozisyon: o.pozisyon!, url: o.url })),
    sorular: ((paaOgesi?.ek as { sorular?: string[] })?.sorular ?? []) as string[],
    ilgili_aramalar: ((ilgiliOge?.ek as { aramalar?: string[] })?.aramalar ?? []) as string[],
    alisveris_var: ozellikTurleri.has("shopping") || ozellikTurleri.has("popular_products") || ozellikTurleri.has("google_shopping"),
    onbellekten,
  };
}
