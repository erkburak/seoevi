import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { alanAdiOzeti, ortakKelimeler, rakipAdaylari, trafikSayfalari } from "@/lib/dataforseo/labs";
import { firsatSkoru } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, Rakip } from "@/types/database";

/**
 * Rakip analizi: görünürlük karşılaştırması, kelime boşluğu ve
 * "Rakibin Açığı" fırsat kırılımı.
 */

export type RakipAnaliziSonucu = {
  rakipSayisi: number;
  toplamFirsat: number;
  onerilenRakipler: string[];
};

/** Rakip önerilerini üretir (kullanıcı hiç rakip eklemediyse). */
export async function rakipOnerileri(proje: Proje): Promise<string[]> {
  try {
    const adaylar = await rakipAdaylari({
      domain: proje.domain,
      locationCode: proje.location_code ?? 2792,
      languageCode: proje.language_code,
      limit: 8,
    });
    return adaylar.map((a) => a.alan_adi);
  } catch {
    return [];
  }
}

export async function rakipAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<RakipAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const locationCode = proje.location_code ?? 2792;

  const { data: rakipVerisi } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", proje.id)
    .eq("is_active", true);

  const rakipler = (rakipVerisi ?? []) as Rakip[];
  if (!rakipler.length) {
    return { rakipSayisi: 0, toplamFirsat: 0, onerilenRakipler: await rakipOnerileri(proje) };
  }

  let toplamFirsat = 0;

  for (const rakip of rakipler) {
    try {
      const [ozet, ortak, sayfalar] = await Promise.all([
        alanAdiOzeti({ domain: rakip.domain, locationCode, languageCode: proje.language_code, tazelik }),
        ortakKelimeler({
          bizimDomain: proje.domain,
          rakipDomain: rakip.domain,
          locationCode,
          languageCode: proje.language_code,
          limit: 400,
          tazelik,
        }),
        trafikSayfalari({
          domain: rakip.domain,
          locationCode,
          languageCode: proje.language_code,
          limit: 25,
          tazelik,
        }),
      ]);

      // Rakibin önde olduğu kelimeler = fırsat
      const acikKelimeler = ortak.filter(
        (k) =>
          k.rakip_pozisyon !== null &&
          k.rakip_pozisyon <= 20 &&
          (k.bizim_pozisyon === null || k.bizim_pozisyon > k.rakip_pozisyon + 3),
      );

      toplamFirsat += acikKelimeler.length;

      const kirilim = {
        dusuk_rekabet: acikKelimeler.filter((k) => (k.zorluk ?? 100) < 35).length,
        ticari: acikKelimeler.filter((k) => k.amac === "ticari" || k.amac === "islem").length,
        bilgi: acikKelimeler.filter((k) => k.amac === "bilgi").length,
        sadece_rakipte: acikKelimeler.filter((k) => k.bizim_pozisyon === null).length,
      };

      await supabase
        .from("competitors")
        .update({
          metrics: {
            organik_kelime: ozet.organik_kelime,
            tahmini_trafik: ozet.tahmini_trafik,
            ilk_uc: ozet.ilk_uc,
            ilk_on: ozet.ilk_on,
            ortak_kelime: ortak.length,
            acik_firsat: acikKelimeler.length,
            kirilim,
            trafik_sayfalari: sayfalar.slice(0, 10),
          } as never,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", rakip.id);

      /* --- Rakip açığından kelime ve fırsat kayıtları --- */

      const yeniKelimeler = acikKelimeler
        .filter((k) => (k.arama_hacmi ?? 0) > 0)
        .slice(0, 200)
        .map((k) => ({
          project_id: proje.id,
          keyword: k.keyword,
          search_volume: k.arama_hacmi,
          difficulty: k.zorluk,
          intent: k.amac,
          source: "rakip",
          location_code: locationCode,
          language_code: proje.language_code,
          last_refreshed_at: new Date().toISOString(),
        }));

      if (yeniKelimeler.length) {
        await supabase
          .from("keywords")
          .upsert(yeniKelimeler as never, { onConflict: "project_id,keyword", ignoreDuplicates: false });

        const { data: kayitli } = await supabase
          .from("keywords")
          .select("id, keyword")
          .eq("project_id", proje.id)
          .in(
            "keyword",
            yeniKelimeler.map((k) => k.keyword),
          );

        const kimlikler = new Map((kayitli ?? []).map((k) => [k.keyword, k.id]));

        // Rakibin sıralaması da kaydedilir; karşılaştırma ekranı bunu kullanır.
        const rakipSiralamalari = acikKelimeler
          .filter((k) => kimlikler.has(k.keyword))
          .slice(0, 200)
          .map((k) => ({
            project_id: proje.id,
            keyword_id: kimlikler.get(k.keyword)!,
            domain: rakip.domain,
            is_competitor: true,
            position: k.rakip_pozisyon,
            url: k.rakip_url,
            device: "desktop",
            checked_at: new Date().toISOString(),
          }));

        if (rakipSiralamalari.length) {
          await supabase.from("keyword_rankings").insert(rakipSiralamalari as never);
        }

        const firsatlar = acikKelimeler
          .filter((k) => kimlikler.has(k.keyword) && (k.arama_hacmi ?? 0) > 0)
          .slice(0, 150)
          .map((k) => {
            const sonuc = firsatSkoru({
              aramaHacmi: k.arama_hacmi,
              zorluk: k.zorluk,
              rekabet: null,
              mevcutPozisyon: k.bizim_pozisyon,
              amac: k.amac,
              rakipSayisi: 1,
            });

            return {
              project_id: proje.id,
              keyword_id: kimlikler.get(k.keyword)!,
              score: sonuc.skor,
              potential_traffic: sonuc.tahminiTrafik,
              current_position: k.bizim_pozisyon,
              target_position: k.rakip_pozisyon,
              reason: `${rakip.domain} bu kelimede ${k.rakip_pozisyon}. sırada.`,
              signals: sonuc.sinyaller as never,
              opportunity_type: "rakip_acigi",
              status: "acik",
            };
          });

        if (firsatlar.length) {
          await supabase.from("keyword_opportunities").upsert(firsatlar as never, {
            onConflict: "project_id,keyword_id,opportunity_type",
          });
        }
      }
    } catch (hata) {
      console.error("[rakip] analiz hatası", {
        rakip: rakip.domain,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  return { rakipSayisi: rakipler.length, toplamFirsat, onerilenRakipler: [] };
}
