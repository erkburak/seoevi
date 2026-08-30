import "server-only";

import type { AramaAmaci } from "@/types/database";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, yenidenDene } from "./client";
import { amacCevir } from "./keywords";

/* ------------------------------------------------------------------ */
/* Tipler                                                              */
/* ------------------------------------------------------------------ */

export type AylikHacim = { yil: number; ay: number; hacim: number };

export type SiralananKelime = {
  keyword: string;
  pozisyon: number | null;
  onceki_pozisyon: number | null;
  url: string | null;
  arama_hacmi: number | null;
  cpc: number | null;
  rekabet: number | null;
  zorluk: number | null;
  amac: AramaAmaci | null;
  etv: number | null;
  yeni_mi: boolean;
  kayip_mi: boolean;
  /**
   * Sağlayıcının bu sıralamayı EN SON ne zaman gördüğü.
   *
   * `ranked_keywords` canlı bir arama değil, geçmişe dayalı bir
   * veritabanıdır; kayıtlar aylar öncesine ait olabilir. Sıranın ne
   * kadar eski olduğunu bilmeden "şu an şuradasınız" demek yanlış olur.
   */
  olculdu_at: string | null;
  /** Son 12 ayın arama hacmi; mevsimsellik bundan çıkarılır. */
  trend: AylikHacim[];
};

export type AlanAdiOzeti = {
  organik_kelime: number;
  tahmini_trafik: number;
  ilk_uc: number;
  ilk_on: number;
  on_bir_yirmi: number;
  yirmi_bir_yuz: number;
  reklam_kelime: number;
};

export type RakipAdayi = {
  alan_adi: string;
  ortak_kelime: number;
  organik_kelime: number;
  tahmini_trafik: number;
  ortalama_pozisyon: number | null;
};

/* ------------------------------------------------------------------ */
/* Ham yapı yardımcıları                                               */
/* ------------------------------------------------------------------ */

type HamSiraliOge = {
  keyword_data?: {
    keyword?: string;
    keyword_info?: {
      search_volume?: number | null;
      cpc?: number | null;
      competition?: number | null;
      /** Son 12 ayın arama hacmi — mevsimsellik analizi için. */
      monthly_searches?: { year: number; month: number; search_volume: number | null }[] | null;
    };
    keyword_properties?: { keyword_difficulty?: number | null };
    search_intent_info?: { main_intent?: string | null };
  };
  ranked_serp_element?: {
    /** Sağlayıcının bu sıralamayı son gördüğü an. */
    last_updated_time?: string | null;
    serp_item?: {
      /** SERP öğesinin türü: organic, local_pack, paid… */
      type?: string | null;
      /** Organik blok içindeki sıra. */
      rank_group?: number | null;
      /** Tüm SERP öğeleri arasındaki sıra — görsel, video, PAA dahil. */
      rank_absolute?: number | null;
      url?: string | null;
      etv?: number | null;
      rank_changes?: {
        previous_rank_absolute?: number | null;
        is_new?: boolean;
        is_up?: boolean;
        is_down?: boolean;
      };
    };
  };
};

function siraliOgeCevir(oge: HamSiraliOge): SiralananKelime | null {
  const kd = oge.keyword_data;
  const serp = oge.ranked_serp_element?.serp_item;
  if (!kd?.keyword) return null;

  /*
   * Yalnızca organik sonuçlar sıralama sayılır.
   *
   * Sağlayıcı yerel paket ve reklam gibi öğeleri de döndürebilir; bunları
   * "organik sıranız" diye göstermek yanlış olur.
   */
  if (serp?.type && serp.type !== "organic") return null;

  return {
    keyword: kd.keyword,
    /*
     * ORGANİK sıra `rank_group`'tur.
     *
     * `rank_absolute` tüm SERP öğeleri arasındaki sıradır: görsel paketi,
     * videolar, "insanlar bunu da soruyor" kutusu da sayılır. Kullanıcı
     * "10. sıradasınız" ifadesini organik sonuçlarda 10. olmak diye okur;
     * oysa mutlak sırada 10 olmak, araya giren görsel bloğu yüzünden
     * organikte 9. olmak anlamına gelebiliyordu. İkisini aynı kefeye
     * koymak sıralamaları sistematik olarak olduğundan kötü gösteriyordu.
     */
    pozisyon: serp?.rank_group ?? null,
    /*
     * Sağlayıcı önceki sırayı yalnızca MUTLAK ölçekte veriyor
     * (`previous_rank_absolute`); organik ölçekte karşılığı yok. İki
     * farklı ölçeği çıkarmak anlamsız bir değişim üretir, bu yüzden
     * önceki sıra kendi ölçüm geçmişimizden hesaplanır.
     */
    onceki_pozisyon: null,
    url: serp?.url ?? null,
    arama_hacmi: kd.keyword_info?.search_volume ?? null,
    cpc: kd.keyword_info?.cpc ?? null,
    rekabet: kd.keyword_info?.competition ?? null,
    zorluk: kd.keyword_properties?.keyword_difficulty ?? null,
    amac: amacCevir(kd.search_intent_info?.main_intent),
    etv: serp?.etv ?? null,
    olculdu_at: oge.ranked_serp_element?.last_updated_time ?? null,
    yeni_mi: serp?.rank_changes?.is_new ?? false,
    kayip_mi: false,
    trend: (kd.keyword_info?.monthly_searches ?? [])
      .filter((m) => m.search_volume !== null)
      .slice(0, 12)
      .map((m) => ({ yil: m.year, ay: m.month, hacim: m.search_volume ?? 0 })),
  };
}

/* ------------------------------------------------------------------ */
/* Uç noktalar                                                         */
/* ------------------------------------------------------------------ */

/** Bir alan adının sıralandığı kelimeler. */
export async function siralananKelimeler({
  domain,
  locationCode,
  languageCode = "tr",
  limit = 500,
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<SiralananKelime[]> {
  const gövde = [
    {
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      limit,
      order_by: ["ranked_serp_element.serp_item.etv,desc"],
      load_rank_absolute: true,
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/ranked_keywords/live",
      parametreler: { domain, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{ items?: HamSiraliOge[] }>("/dataforseo_labs/google/ranked_keywords/live", gövde),
      ),
  );

  return (veri?.items ?? []).map(siraliOgeCevir).filter((k): k is SiralananKelime => k !== null);
}

/** Alan adı genel görünürlük özeti. */
export async function alanAdiOzeti({
  domain,
  locationCode,
  languageCode = "tr",
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<AlanAdiOzeti> {
  const gövde = [{ target: domain, location_code: locationCode, language_code: languageCode }];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/domain_rank_overview/live",
      parametreler: { domain, locationCode, languageCode },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            metrics?: {
              organic?: {
                count?: number;
                etv?: number;
                pos_1?: number;
                pos_2_3?: number;
                pos_4_10?: number;
                pos_11_20?: number;
                pos_21_30?: number;
                pos_31_40?: number;
                pos_41_50?: number;
                pos_51_60?: number;
                pos_61_70?: number;
                pos_71_80?: number;
                pos_81_90?: number;
                pos_91_100?: number;
              };
              paid?: { count?: number };
            };
          }[];
        }>("/dataforseo_labs/google/domain_rank_overview/live", gövde),
      ),
  );

  const m = veri?.items?.[0]?.metrics?.organic ?? {};
  const ilkUc = (m.pos_1 ?? 0) + (m.pos_2_3 ?? 0);
  const ilkOn = ilkUc + (m.pos_4_10 ?? 0);
  const onBirYirmi = m.pos_11_20 ?? 0;
  const yirmiBirYuz =
    (m.pos_21_30 ?? 0) + (m.pos_31_40 ?? 0) + (m.pos_41_50 ?? 0) + (m.pos_51_60 ?? 0) +
    (m.pos_61_70 ?? 0) + (m.pos_71_80 ?? 0) + (m.pos_81_90 ?? 0) + (m.pos_91_100 ?? 0);

  return {
    organik_kelime: m.count ?? 0,
    tahmini_trafik: Math.round(m.etv ?? 0),
    ilk_uc: ilkUc,
    ilk_on: ilkOn,
    on_bir_yirmi: onBirYirmi,
    yirmi_bir_yuz: yirmiBirYuz,
    reklam_kelime: veri?.items?.[0]?.metrics?.paid?.count ?? 0,
  };
}

/** Otomatik rakip önerileri. */
export async function rakipAdaylari({
  domain,
  locationCode,
  languageCode = "tr",
  limit = 15,
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<RakipAdayi[]> {
  const gövde = [
    {
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      limit,
      exclude_top_domains: true,
      order_by: ["intersections,desc"],
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/competitors_domain/live",
      parametreler: { domain, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            domain?: string;
            avg_position?: number | null;
            intersections?: number;
            metrics?: { organic?: { count?: number; etv?: number } };
          }[];
        }>("/dataforseo_labs/google/competitors_domain/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.domain && i.domain !== domain)
    .map((i) => ({
      alan_adi: i.domain!,
      ortak_kelime: i.intersections ?? 0,
      organik_kelime: i.metrics?.organic?.count ?? 0,
      tahmini_trafik: Math.round(i.metrics?.organic?.etv ?? 0),
      ortalama_pozisyon: i.avg_position ?? null,
    }));
}

/**
 * İki alan adının ortak kelimeleri ve karşılıklı pozisyonları.
 * Kelime boşluğu (keyword gap) analizinin temelidir.
 */
export type OrtakKelime = {
  keyword: string;
  arama_hacmi: number | null;
  zorluk: number | null;
  amac: AramaAmaci | null;
  bizim_pozisyon: number | null;
  rakip_pozisyon: number | null;
  bizim_url: string | null;
  rakip_url: string | null;
};

export async function ortakKelimeler({
  bizimDomain,
  rakipDomain,
  locationCode,
  languageCode = "tr",
  limit = 500,
  tazelik,
}: {
  bizimDomain: string;
  rakipDomain: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<OrtakKelime[]> {
  const gövde = [
    {
      targets: { 1: bizimDomain, 2: rakipDomain },
      location_code: locationCode,
      language_code: languageCode,
      limit,
      order_by: ["keyword_data.keyword_info.search_volume,desc"],
      intersections: false,
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/domain_intersection/live",
      parametreler: { bizimDomain, rakipDomain, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            keyword_data?: {
              keyword?: string;
              keyword_info?: { search_volume?: number | null };
              keyword_properties?: { keyword_difficulty?: number | null };
              search_intent_info?: { main_intent?: string | null };
            };
            first_domain_serp_element?: {
              rank_group?: number | null;
              rank_absolute?: number | null;
              url?: string | null;
            };
            second_domain_serp_element?: {
              rank_group?: number | null;
              rank_absolute?: number | null;
              url?: string | null;
            };
          }[];
        }>("/dataforseo_labs/google/domain_intersection/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.keyword_data?.keyword)
    .map((i) => ({
      keyword: i.keyword_data!.keyword!,
      arama_hacmi: i.keyword_data?.keyword_info?.search_volume ?? null,
      zorluk: i.keyword_data?.keyword_properties?.keyword_difficulty ?? null,
      amac: amacCevir(i.keyword_data?.search_intent_info?.main_intent),
      // Organik sıra `rank_group`; `rank_absolute` görsel ve reklam gibi
      // öğeleri de sayar ve iki alan adını farklı ölçekte gösterebilir.
      bizim_pozisyon: i.first_domain_serp_element?.rank_group ?? null,
      rakip_pozisyon: i.second_domain_serp_element?.rank_group ?? null,
      bizim_url: i.first_domain_serp_element?.url ?? null,
      rakip_url: i.second_domain_serp_element?.url ?? null,
    }));
}

/** Alan adının trafik getiren sayfaları. */
export type TrafikSayfasi = {
  url: string;
  kelime_sayisi: number;
  tahmini_trafik: number;
  ilk_on: number;
};

export async function trafikSayfalari({
  domain,
  locationCode,
  languageCode = "tr",
  limit = 100,
  tazelik,
}: {
  domain: string;
  locationCode: number;
  languageCode?: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<TrafikSayfasi[]> {
  const gövde = [
    {
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      limit,
      order_by: ["metrics.organic.etv,desc"],
    },
  ];

  const { veri } = await onbellekli(
    {
      endpoint: "/dataforseo_labs/google/relevant_pages/live",
      parametreler: { domain, locationCode, languageCode, limit },
      grup: "labs",
      tazelik,
    },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            page_address?: string;
            metrics?: { organic?: { count?: number; etv?: number; pos_1?: number; pos_2_3?: number; pos_4_10?: number } };
          }[];
        }>("/dataforseo_labs/google/relevant_pages/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.page_address)
    .map((i) => {
      const o = i.metrics?.organic ?? {};
      return {
        url: i.page_address!,
        kelime_sayisi: o.count ?? 0,
        tahmini_trafik: Math.round(o.etv ?? 0),
        ilk_on: (o.pos_1 ?? 0) + (o.pos_2_3 ?? 0) + (o.pos_4_10 ?? 0),
      };
    });
}
