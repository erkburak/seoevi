import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { backlinkListesi, backlinkOzeti, referansAlanAdlari } from "@/lib/dataforseo/backlinks";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * Geri bağlantı analizi.
 * Özet metrikler, referans veren alan adları ve bağlantı listesi kaydedilir.
 */

export type BacklinkAnaliziSonucu = {
  toplam_backlink: number;
  referans_alan_adi: number;
  alan_adi_gucu: number | null;
  yeni: number;
  kayip: number;
};

export async function backlinkAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<BacklinkAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();

  const [ozet, alanAdlari, baglantilar] = await Promise.all([
    backlinkOzeti({ domain: proje.domain, tazelik }),
    referansAlanAdlari({ domain: proje.domain, limit: 300, tazelik }),
    backlinkListesi({ domain: proje.domain, limit: 300, tazelik }),
  ]);

  /* ---------------- Referans alan adları ---------------- */

  if (alanAdlari.length) {
    const kayitlar = alanAdlari.map((a) => ({
      project_id: proje.id,
      domain: a.alan_adi,
      target_domain: proje.domain,
      is_competitor: false,
      rank: a.guc,
      backlinks_count: a.backlink_sayisi,
      first_seen: a.ilk_gorulme,
      is_lost: a.kayip_mi,
    }));

    for (let i = 0; i < kayitlar.length; i += 200) {
      await supabase
        .from("referring_domains")
        .upsert(kayitlar.slice(i, i + 200) as never, {
          onConflict: "project_id,domain,target_domain",
        });
    }
  }

  /* ---------------- Bağlantılar ---------------- */

  if (baglantilar.length) {
    const { data: kayitliAlanAdlari } = await supabase
      .from("referring_domains")
      .select("id, domain")
      .eq("project_id", proje.id);

    const alanKimlik = new Map((kayitliAlanAdlari ?? []).map((a) => [a.domain, a.id]));

    // Önceki listeyi temizleyip güncel durumu yazıyoruz.
    await supabase.from("backlinks").delete().eq("project_id", proje.id);

    const kayitlar = baglantilar.map((b) => ({
      project_id: proje.id,
      referring_domain_id: alanKimlik.get(b.alan_adi) ?? null,
      source_url: b.kaynak_url,
      target_url: b.hedef_url,
      anchor: b.anchor,
      is_dofollow: b.dofollow,
      rank: b.guc,
      first_seen: b.ilk_gorulme,
      last_seen: b.son_gorulme,
      is_lost: b.kayip_mi,
      is_new: b.yeni_mi,
    }));

    for (let i = 0; i < kayitlar.length; i += 200) {
      await supabase.from("backlinks").insert(kayitlar.slice(i, i + 200) as never);
    }
  }

  /* ---------------- Skor ---------------- */

  const mevcutSkorlar = (proje.scores ?? {}) as Record<string, number | undefined>;
  const mevcutIstatistik = (proje.stats ?? {}) as Record<string, number | undefined>;

  await supabase
    .from("projects")
    .update({
      scores: { ...mevcutSkorlar, otorite: ozet.alan_adi_gucu ?? mevcutSkorlar.otorite } as never,
      stats: {
        ...mevcutIstatistik,
        geri_baglanti: ozet.toplam_backlink,
        referans_alan_adi: ozet.referans_alan_adi,
      } as never,
    })
    .eq("id", proje.id);

  return {
    toplam_backlink: ozet.toplam_backlink,
    referans_alan_adi: ozet.referans_alan_adi,
    alan_adi_gucu: ozet.alan_adi_gucu,
    yeni: ozet.yeni_30_gun,
    kayip: ozet.kayip_30_gun,
  };
}
