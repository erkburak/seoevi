import "server-only";

import type { AramaAmaci } from "@/types/database";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, dfsTumSonuclar, yenidenDene } from "./client";

/* ------------------------------------------------------------------ */
/* Ortak tipler                                                        */
/* ------------------------------------------------------------------ */

export type KelimeVerisi = {
  keyword: string;
  arama_hacmi: number | null;
  cpc: number | null;
  rekabet: number | null;
  rekabet_seviyesi: "dusuk" | "orta" | "yuksek" | null;
  zorluk: number | null;
  amac: AramaAmaci | null;
  trend: { yil: number; ay: number; hacim: number }[];
};

type HamKelimeBilgisi = {
  search_volume?: number | null;
  cpc?: number | null;
  competition?: number | null;
  competition_level?: string | null;
  monthly_searches?: { year: number; month: number; search_volume: number }[] | null;
};

type HamLabsOgesi = {
  keyword?: string;
  keyword_data?: {
    keyword?: string;
    keyword_info?: HamKelimeBilgisi;
    keyword_properties?: { keyword_difficulty?: number | null };
    search_intent_info?: { main_intent?: string | null };
  };
  keyword_info?: HamKelimeBilgisi;
  keyword_properties?: { keyword_difficulty?: number | null };
  search_intent_info?: { main_intent?: string | null };
};

type HamLabsSonuc = { items?: HamLabsOgesi[]; total_count?: number };

/* ------------------------------------------------------------------ */
/* Dönüştürücüler                                                      */
/* ------------------------------------------------------------------ */

const AMAC_HARITASI: Record<string, AramaAmaci> = {
  informational: "bilgi",
  navigational: "gezinme",
  commercial: "ticari",
  transactional: "islem",
};

export function amacCevir(deger: string | null | undefined): AramaAmaci | null {
  if (!deger) return null;
  return AMAC_HARITASI[deger.toLowerCase()] ?? null;
}

const REKABET_HARITASI: Record<string, "dusuk" | "orta" | "yuksek"> = {
  LOW: "dusuk",
  MEDIUM: "orta",
  HIGH: "yuksek",
};

function rekabetCevir(seviye: string | null | undefined, deger: number | null | undefined) {
  if (seviye && REKABET_HARITASI[seviye.toUpperCase()]) return REKABET_HARITASI[seviye.toUpperCase()];
  if (deger === null || deger === undefined) return null;
  if (deger < 0.34) return "dusuk" as const;
  if (deger < 0.67) return "orta" as const;
  return "yuksek" as const;
}

function labsOgesiniCevir(oge: HamLabsOgesi): KelimeVerisi | null {
  const kaynak = oge.keyword_data ?? oge;
  const keyword = kaynak.keyword ?? oge.keyword;
  if (!keyword) return null;

  const bilgi = kaynak.keyword_info ?? {};

  return {
    keyword,
    arama_hacmi: bilgi.search_volume ?? null,
    cpc: bilgi.cpc ?? null,
    rekabet: bilgi.competition ?? null,
    rekabet_seviyesi: rekabetCevir(bilgi.competition_level, bilgi.competition),
    zorluk: kaynak.keyword_properties?.keyword_difficulty ?? null,
    amac: amacCevir(kaynak.search_intent_info?.main_intent),
    trend: (bilgi.monthly_searches ?? []).slice(0, 12).map((m) => ({
      yil: m.year,
      ay: m.month,
      hacim: m.search_volume,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Araştırma uç noktaları                                              */
/* ------------------------------------------------------------------ */

/**
 * Bir tohum kelimeden uzun kuyruk önerileri üretir.
 * Labs keyword_suggestions; hacim, zorluk ve amaç bilgisini tek çağrıda getirir.
 */
export async function kelimeOnerileri({
  keyword,
  locationCode,
  languageCode = "tr",
  limit = 200,
  tazelik,
}: {
  keyword: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<KelimeVerisi[]> {
  const gövde = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      include_serp_info: false,
      include_seed_keyword: true,
      limit,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/keyword_suggestions/live",
      parametreler: { keyword, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<HamLabsSonuc>("/dataforseo_labs/google/keyword_suggestions/live", gövde),
      ),
  );

  return (veri?.items ?? []).map(labsOgesiniCevir).filter((k): k is KelimeVerisi => k !== null);
}

/**
 * Verilen kelimelerle ilgili yeni fikirler üretir (aynı kategoriden kelimeler).
 */
export async function kelimeFikirleri({
  keywords,
  locationCode,
  languageCode = "tr",
  limit = 200,
  tazelik,
}: {
  keywords: string[];
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<KelimeVerisi[]> {
  if (!keywords.length) return [];

  const secilen = keywords.slice(0, 20);
  const gövde = [
    {
      keywords: secilen,
      location_code: locationCode,
      language_code: languageCode,
      limit,
      order_by: ["keyword_info.search_volume,desc"],
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/keyword_ideas/live",
      parametreler: { keywords: secilen, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() => dfsTekSonuc<HamLabsSonuc>("/dataforseo_labs/google/keyword_ideas/live", gövde)),
  );

  return (veri?.items ?? []).map(labsOgesiniCevir).filter((k): k is KelimeVerisi => k !== null);
}

/**
 * Semantik olarak ilişkili kelimeler (SERP "ilgili aramalar" grafiğinden).
 */
export async function iliskiliKelimeler({
  keyword,
  locationCode,
  languageCode = "tr",
  derinlik = 2,
  limit = 100,
  tazelik,
}: {
  keyword: string;
  locationCode: number;
  languageCode?: string;
  derinlik?: number;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<KelimeVerisi[]> {
  const gövde = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth: derinlik,
      limit,
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/related_keywords/live",
      parametreler: { keyword, locationCode, languageCode, derinlik, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<HamLabsSonuc>("/dataforseo_labs/google/related_keywords/live", gövde),
      ),
  );

  return (veri?.items ?? []).map(labsOgesiniCevir).filter((k): k is KelimeVerisi => k !== null);
}

/**
 * Belirli kelimeler için güncel arama hacmi ve maliyet verisi.
 */
export async function hacimGetir({
  keywords,
  locationCode,
  languageCode = "tr",
  tazelik,
}: {
  keywords: string[];
  locationCode: number;
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<KelimeVerisi[]> {
  if (!keywords.length) return [];

  const secilen = keywords.slice(0, 1000);
  const gövde = [
    {
      keywords: secilen,
      location_code: locationCode,
      language_code: languageCode,
      sort_by: "search_volume",
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/keywords_data/google_ads/search_volume/live",
      parametreler: { keywords: secilen, locationCode, languageCode },
      grup: "keyword_data",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTumSonuclar<{
          keyword: string;
          search_volume?: number | null;
          cpc?: number | null;
          competition?: number | null;
          competition_index?: number | null;
          monthly_searches?: { year: number; month: number; search_volume: number }[];
        }>("/keywords_data/google_ads/search_volume/live", gövde),
      ),
  );

  return (veri ?? []).map((k) => ({
    keyword: k.keyword,
    arama_hacmi: k.search_volume ?? null,
    cpc: k.cpc ?? null,
    rekabet: k.competition ?? (k.competition_index !== null && k.competition_index !== undefined ? k.competition_index / 100 : null),
    rekabet_seviyesi: rekabetCevir(null, k.competition ?? null),
    zorluk: null,
    amac: null,
    trend: (k.monthly_searches ?? []).slice(0, 12).map((m) => ({
      yil: m.year,
      ay: m.month,
      hacim: m.search_volume,
    })),
  }));
}

/** Toplu anahtar kelime zorluğu. */
export async function zorlukGetir({
  keywords,
  locationCode,
  languageCode = "tr",
  tazelik,
}: {
  keywords: string[];
  locationCode: number;
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<Map<string, number>> {
  if (!keywords.length) return new Map();

  const secilen = keywords.slice(0, 1000);
  const gövde = [{ keywords: secilen, location_code: locationCode, language_code: languageCode }];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/bulk_keyword_difficulty/live",
      parametreler: { keywords: secilen, locationCode, languageCode },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{ items?: { keyword: string; keyword_difficulty: number | null }[] }>(
          "/dataforseo_labs/google/bulk_keyword_difficulty/live",
          gövde,
        ),
      ),
  );

  const harita = new Map<string, number>();
  for (const oge of veri?.items ?? []) {
    if (oge.keyword_difficulty !== null && oge.keyword_difficulty !== undefined) {
      harita.set(oge.keyword, oge.keyword_difficulty);
    }
  }
  return harita;
}

/** Toplu arama amacı tespiti. */
export async function amacGetir({
  keywords,
  languageCode = "tr",
  tazelik,
}: {
  keywords: string[];
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<Map<string, AramaAmaci>> {
  if (!keywords.length) return new Map();

  const secilen = keywords.slice(0, 1000);
  const gövde = [{ keywords: secilen, language_code: languageCode }];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/search_intent/live",
      parametreler: { keywords: secilen, languageCode },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{ items?: { keyword: string; keyword_intent?: { label?: string } }[] }>(
          "/dataforseo_labs/google/search_intent/live",
          gövde,
        ),
      ),
  );

  const harita = new Map<string, AramaAmaci>();
  for (const oge of veri?.items ?? []) {
    const amac = amacCevir(oge.keyword_intent?.label);
    if (amac) harita.set(oge.keyword, amac);
  }
  return harita;
}
