import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, yenidenDene } from "./client";

/**
 * İçerik analizi ve marka bahsedilmeleri.
 * AI Görünürlüğü modülünün veri kaynaklarından biridir.
 */

export type MarkaBahsiOzeti = {
  toplam_bahis: number;
  bahseden_alan_adi: number;
  duygu: { olumlu: number; notr: number; olumsuz: number };
  onemli_alan_adlari: { alan_adi: string; adet: number }[];
  gunluk_dagilim: { tarih: string; adet: number }[];
};

/** Bir marka veya ürün adının web genelindeki bahsedilme özeti. */
export async function markaBahisOzeti({
  ifade,
  tazelik,
}: {
  ifade: string;
  tazelik?: Tazelik;
}): Promise<MarkaBahsiOzeti> {
  const gövde = [
    {
      keyword: ifade,
      page_type: ["ecommerce", "news", "blogs", "message-boards", "organization"],
      internal_list_limit: 10,
    },
  ];

  const { veri } = await onbellekli(
    { endpoint: "/content_analysis/summary/live", parametreler: { ifade }, grup: "content_analysis", tazelik },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          total_count?: number;
          rank?: number;
          top_domains?: { domain?: string; count?: number }[];
          sentiment_connotation_distribution?: Record<string, number>;
          text_category_distribution?: unknown;
          country_distribution?: unknown;
          connotation_types?: { positive?: number; negative?: number; neutral?: number };
        }>("/content_analysis/summary/live", gövde),
      ),
  );

  const duygu = veri?.connotation_types ?? {};

  return {
    toplam_bahis: veri?.total_count ?? 0,
    bahseden_alan_adi: veri?.top_domains?.length ?? 0,
    duygu: {
      olumlu: Math.round(duygu.positive ?? 0),
      notr: Math.round(duygu.neutral ?? 0),
      olumsuz: Math.round(duygu.negative ?? 0),
    },
    onemli_alan_adlari: (veri?.top_domains ?? [])
      .filter((d) => d.domain)
      .slice(0, 10)
      .map((d) => ({ alan_adi: d.domain!, adet: d.count ?? 0 })),
    gunluk_dagilim: [],
  };
}

export type IcerikBahsi = {
  url: string;
  alan_adi: string;
  baslik: string | null;
  ozet: string | null;
  tarih: string | null;
};

/** Marka/ürün adının geçtiği içerikleri listeler. */
export async function icerikBahisleri({
  ifade,
  limit = 30,
  tazelik,
}: {
  ifade: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<IcerikBahsi[]> {
  const gövde = [
    {
      keyword: ifade,
      limit,
      search_mode: "as_is",
      order_by: ["content_info.connotation_types.positive,desc"],
    },
  ];

  const { veri } = await onbellekli(
    { endpoint: "/content_analysis/search/live", parametreler: { ifade, limit }, grup: "content_analysis", tazelik },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            url?: string;
            domain?: string;
            content_info?: { title?: string; snippet?: string; main_title?: string };
            page_types?: string[];
            published_date?: string;
          }[];
        }>("/content_analysis/search/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.url)
    .map((i) => ({
      url: i.url!,
      alan_adi: i.domain ?? "",
      baslik: i.content_info?.main_title ?? i.content_info?.title ?? null,
      ozet: i.content_info?.snippet ?? null,
      tarih: i.published_date ?? null,
    }));
}
