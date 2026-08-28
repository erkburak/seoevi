import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsTekSonuc, yenidenDene } from "./client";

export type BacklinkOzeti = {
  toplam_backlink: number;
  referans_alan_adi: number;
  dofollow: number;
  nofollow: number;
  alan_adi_gucu: number | null;
  yeni_30_gun: number;
  kayip_30_gun: number;
  anchor_dagilimi: { anchor: string; adet: number }[];
};

/** Alan adının geri bağlantı özeti. */
export async function backlinkOzeti({
  domain,
  tazelik,
}: {
  domain: string;
  tazelik?: Tazelik;
}): Promise<BacklinkOzeti> {
  const gövde = [{ target: domain, internal_list_limit: 10, backlinks_status_type: "live" }];

  const { veri } = await onbellekli(
    { endpoint: "/backlinks/summary/live", parametreler: { domain }, grup: "backlinks", tazelik },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          backlinks?: number;
          referring_domains?: number;
          referring_main_domains?: number;
          rank?: number;
          backlinks_spam_score?: number;
          referring_links_attributes?: Record<string, number>;
          referring_links_types?: Record<string, number>;
          anchors?: Record<string, number>;
          new_backlinks?: number;
          lost_backlinks?: number;
        }>("/backlinks/summary/live", gövde),
      ),
  );

  const anchorlar = Object.entries(veri?.anchors ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([anchor, adet]) => ({ anchor, adet }));

  return {
    toplam_backlink: veri?.backlinks ?? 0,
    referans_alan_adi: veri?.referring_main_domains ?? veri?.referring_domains ?? 0,
    dofollow: veri?.referring_links_attributes?.dofollow ?? 0,
    nofollow: veri?.referring_links_attributes?.nofollow ?? 0,
    alan_adi_gucu: veri?.rank ?? null,
    yeni_30_gun: veri?.new_backlinks ?? 0,
    kayip_30_gun: veri?.lost_backlinks ?? 0,
    anchor_dagilimi: anchorlar,
  };
}

export type BacklinkKaydi = {
  kaynak_url: string;
  hedef_url: string | null;
  anchor: string | null;
  dofollow: boolean;
  guc: number | null;
  ilk_gorulme: string | null;
  son_gorulme: string | null;
  kayip_mi: boolean;
  yeni_mi: boolean;
  alan_adi: string;
};

/** Geri bağlantı listesi. */
export async function backlinkListesi({
  domain,
  limit = 200,
  durum = "live",
  tazelik,
}: {
  domain: string;
  limit?: number;
  durum?: "live" | "lost" | "new";
  tazelik?: Tazelik;
}): Promise<BacklinkKaydi[]> {
  const gövde = [
    {
      target: domain,
      limit,
      mode: "as_is",
      backlinks_status_type: durum === "live" ? "live" : "lost",
      order_by: ["rank,desc"],
    },
  ];

  const { veri } = await onbellekli(
    { endpoint: "/backlinks/backlinks/live", parametreler: { domain, limit, durum }, grup: "backlinks", tazelik },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            domain_from?: string;
            url_from?: string;
            url_to?: string;
            anchor?: string;
            dofollow?: boolean;
            rank?: number;
            first_seen?: string;
            last_seen?: string;
            is_lost?: boolean;
            is_new?: boolean;
          }[];
        }>("/backlinks/backlinks/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.url_from)
    .map((i) => ({
      kaynak_url: i.url_from!,
      hedef_url: i.url_to ?? null,
      anchor: i.anchor ?? null,
      dofollow: i.dofollow ?? true,
      guc: i.rank ?? null,
      ilk_gorulme: i.first_seen ?? null,
      son_gorulme: i.last_seen ?? null,
      kayip_mi: i.is_lost ?? durum === "lost",
      yeni_mi: i.is_new ?? false,
      alan_adi: i.domain_from ?? "",
    }));
}

export type ReferansAlanAdiKaydi = {
  alan_adi: string;
  backlink_sayisi: number;
  guc: number | null;
  ilk_gorulme: string | null;
  kayip_mi: boolean;
};

/** Referans veren alan adları. */
export async function referansAlanAdlari({
  domain,
  limit = 200,
  tazelik,
}: {
  domain: string;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<ReferansAlanAdiKaydi[]> {
  const gövde = [{ target: domain, limit, order_by: ["rank,desc"], backlinks_status_type: "live" }];

  const { veri } = await onbellekli(
    { endpoint: "/backlinks/referring_domains/live", parametreler: { domain, limit }, grup: "backlinks", tazelik },
    async () =>
      yenidenDene(() =>
        dfsTekSonuc<{
          items?: {
            domain?: string;
            backlinks?: number;
            rank?: number;
            first_seen?: string;
            lost_date?: string | null;
          }[];
        }>("/backlinks/referring_domains/live", gövde),
      ),
  );

  return (veri?.items ?? [])
    .filter((i) => i.domain)
    .map((i) => ({
      alan_adi: i.domain!,
      backlink_sayisi: i.backlinks ?? 0,
      guc: i.rank ?? null,
      ilk_gorulme: i.first_seen ?? null,
      kayip_mi: Boolean(i.lost_date),
    }));
}
