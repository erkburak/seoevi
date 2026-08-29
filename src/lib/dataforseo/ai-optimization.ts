import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, yenidenDene } from "./client";

/**
 * Yapay zekâ cevaplarındaki görünürlük.
 *
 * Sağlayıcı, yapay zekâ asistanlarının gerçekte verdiği cevapları
 * derliyor: sorulan soru, verilen cevap, cevapta gösterilen kaynak
 * siteler ve o sorunun aylık hacmi. Bu, bir modele API'den soru sormaktan
 * farklıdır — modelin o an ne diyeceğini değil, kullanıcıların gerçekte
 * ne gördüğünü ölçer.
 *
 * Uç nokta çağrı başına 0,10 dolar; SERP'in elli katı. Bu yüzden her
 * çağrı önbelleklenir ve yalnızca üst paketlerde kullanılır.
 */

/** Verinin ağırlıklı olarak geldiği yer — arayüzde dürüstçe belirtilir. */
export const AI_KAYNAGI = "Google AI Overview";

export type AiKaynak = {
  alanAdi: string;
  bahis: number;
  aiAramaHacmi: number;
};

export type AiGorunurlukOzeti = {
  /** Kaç yapay zekâ cevabında alan adımız kaynak olarak gösterilmiş. */
  bahis: number;
  /** Bu cevapların temsil ettiği aylık arama hacmi. */
  aiAramaHacmi: number;
  /** Cevaplarda gösterilen siteler — kendimiz ve rakipler. */
  kaynaklar: AiKaynak[];
  platformlar: { ad: string; bahis: number }[];
};

type HamOlcum = {
  aggregated_metrics?: {
    platform?: { key: string; mentions: number; ai_search_volume: number }[];
    sources_domain?: { key: string; mentions: number; ai_search_volume: number }[];
    location?: { key: number; mentions: number; ai_search_volume: number }[];
  };
};

/** Ölçüm isteklerinde ortak gövde. */
function tabanGovde(locationCode: number, languageCode: string) {
  return { location_code: locationCode, language_code: languageCode };
}

/**
 * Alan adının yapay zekâ cevaplarındaki genel görünürlüğü.
 */
export async function aiGorunurlukOlc({
  domain,
  locationCode,
  languageCode = "tr",
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<AiGorunurlukOzeti> {
  const gövde = [
    { target: [{ domain }], ...tabanGovde(locationCode, languageCode) },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/ai_optimization/llm_mentions/target_metrics/live",
      parametreler: { domain, locationCode, languageCode },
      grup: "ai_gorunurluk",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<HamOlcum>("/ai_optimization/llm_mentions/target_metrics/live", gövde),
      ),
  );

  const olcumler = veri?.aggregated_metrics ?? {};
  const yerel = olcumler.location?.[0];

  return {
    bahis: yerel?.mentions ?? 0,
    aiAramaHacmi: yerel?.ai_search_volume ?? 0,
    kaynaklar: (olcumler.sources_domain ?? []).map((k) => ({
      alanAdi: k.key,
      bahis: k.mentions,
      aiAramaHacmi: k.ai_search_volume,
    })),
    platformlar: (olcumler.platform ?? []).map((p) => ({ ad: p.key, bahis: p.mentions })),
  };
}

export type AiCevap = {
  platform: string | null;
  modelAdi: string | null;
  soru: string;
  cevap: string | null;
  kaynaklar: string[];
  aiAramaHacmi: number;
  /** Cevap web aramasına mı dayanıyor? Bilinmiyorsa null. */
  webAramali: boolean | null;
};

type HamCevap = {
  platform?: string;
  model_name?: string;
  question?: string;
  answer?: string;
  sources?: ({ domain?: string; url?: string } | string)[];
  ai_search_volume?: number;
  is_web_search_based?: boolean;
};

/** Ham kaynak listesini alan adlarına indirger. */
function kaynaklariCoz(ham: HamCevap["sources"]): string[] {
  const cikan: string[] = [];

  for (const k of ham ?? []) {
    if (typeof k === "string") {
      cikan.push(k);
      continue;
    }
    if (k.domain) {
      cikan.push(k.domain);
      continue;
    }
    if (k.url) {
      try {
        cikan.push(new URL(k.url).hostname.replace(/^www\./, ""));
      } catch {
        // Adres çözümlenemiyorsa atlanır.
      }
    }
  }

  return [...new Set(cikan)];
}

function cevaplariCevir(ogeler: HamCevap[]): AiCevap[] {
  return ogeler
    .filter((o) => o.question)
    .map((o) => ({
      platform: o.platform ?? null,
      modelAdi: o.model_name ?? null,
      soru: o.question!,
      cevap: o.answer ?? null,
      kaynaklar: kaynaklariCoz(o.sources),
      aiAramaHacmi: o.ai_search_volume ?? 0,
      // Alan gelmediğinde "hayır" varsayılmaz; bilinmiyor olarak taşınır.
      webAramali: typeof o.is_web_search_based === "boolean" ? o.is_web_search_based : null,
    }));
}

/**
 * Alan adımızın kaynak gösterildiği gerçek yapay zekâ cevapları.
 */
export async function aiCevaplariGetir({
  domain,
  locationCode,
  languageCode = "tr",
  limit = 25,
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<AiCevap[]> {
  const gövde = [
    { target: [{ domain }], ...tabanGovde(locationCode, languageCode), limit },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/ai_optimization/llm_mentions/search_mentions/live",
      parametreler: { domain, locationCode, languageCode, limit },
      grup: "ai_gorunurluk",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{ items?: HamCevap[] }>(
          "/ai_optimization/llm_mentions/search_mentions/live",
          gövde,
        ),
      ),
  );

  return cevaplariCevir(veri?.items ?? []);
}

/**
 * Belirli bir soru için yapay zekânın verdiği cevaplar.
 *
 * Kullanıcının takip ettiği sorularda "ben görünüyor muyum, yerime kim
 * gösteriliyor" sorusunu cevaplar.
 */
export async function aiSoruAnalizi({
  soru,
  locationCode,
  languageCode = "tr",
  limit = 10,
  tazelik,
}: {
  soru: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<AiCevap[]> {
  const gövde = [
    { target: [{ keyword: soru }], ...tabanGovde(locationCode, languageCode), limit },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/ai_optimization/llm_mentions/search/live",
      parametreler: { soru, locationCode, languageCode, limit },
      grup: "ai_gorunurluk",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{ items?: HamCevap[] }>("/ai_optimization/llm_mentions/search/live", gövde),
      ),
  );

  return cevaplariCevir(veri?.items ?? []);
}
