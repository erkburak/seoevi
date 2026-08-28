import "server-only";

import { serpGetir } from "@/lib/dataforseo/serp";
import { abonelikDurumu, kullanimArtir } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * Arama sonucu toplama.
 *
 * Pazaryeri Radarı, Rakip Hareketleri ve Sayfa Çakışması üçü de
 * `serp_results` tablosunu okur. Tam analiz akışında bu tabloyu dolduran
 * bir adım bulunmadığı için üç modül de hiçbir zaman veri görmüyordu.
 *
 * SERP sorgusu ücretlidir; bu yüzden kelimeler rastgele değil, en çok
 * kazanç getirecek olanlardan seçilir ve sayı paketin günlük hakkıyla
 * sınırlanır.
 */

export type SerpToplamaSonucu = {
  sorgulanan: number;
  onbellekten: number;
  kaydedilen: number;
};

/**
 * En değerli kelimeler için arama sonuçlarını toplar ve saklar.
 *
 * Öncelik sırası: fırsat skoru yüksek olanlar, ardından arama hacmi
 * yüksek olanlar. Böylece sınırlı hak, en çok işe yarayacak kelimelere
 * harcanır.
 */
export async function serpToplamasiYap({
  proje,
  azami,
}: {
  proje: Proje;
  /** Üst sınır; verilmezse paketin günlük hakkı kullanılır. */
  azami?: number;
}): Promise<SerpToplamaSonucu> {
  const supabase = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(proje.user_id);

  const gunlukHak = typeof limitler?.gunluk_serp === "number" ? limitler.gunluk_serp : 0;
  const hedefAdet = Math.max(0, Math.min(azami ?? gunlukHak, gunlukHak));

  if (hedefAdet === 0) return { sorgulanan: 0, onbellekten: 0, kaydedilen: 0 };

  const [{ data: firsatlar }, { data: rakipVerisi }] = await Promise.all([
    supabase
      .from("kelime_ozet")
      .select("id, keyword, search_volume, opportunity_score")
      .eq("project_id", proje.id)
      .eq("is_tracked", true)
      .limit(300),
    supabase.from("competitors").select("domain").eq("project_id", proje.id).limit(10),
  ]);

  const adaylar = (firsatlar ?? [])
    .filter((k) => k.keyword)
    .sort((a, b) => {
      const fark = (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0);
      if (fark !== 0) return fark;
      return (b.search_volume ?? 0) - (a.search_volume ?? 0);
    })
    .slice(0, hedefAdet);

  if (!adaylar.length) return { sorgulanan: 0, onbellekten: 0, kaydedilen: 0 };

  const rakipler = (rakipVerisi ?? []).map((r) => r.domain);
  const locationCode = proje.location_code ?? 2792;

  let onbellekten = 0;
  let kaydedilen = 0;

  for (const aday of adaylar) {
    try {
      const serp = await serpGetir({
        keyword: aday.keyword,
        locationCode,
        languageCode: proje.language_code,
        device: "desktop",
        bizimAlanAdi: proje.domain,
        rakipler,
        tazelik: "onbellek",
      });

      if (serp.onbellekten) {
        onbellekten += 1;
      } else {
        // Yalnızca sağlayıcıya gidilen sorgular hakka sayılır.
        await kullanimArtir({ kullaniciId: proje.user_id, metrik: "serp" });
      }

      const { data: kayit } = await supabase
        .from("serp_results")
        .insert({
          project_id: proje.id,
          keyword_id: aday.id,
          keyword: aday.keyword,
          device: "desktop",
          location_code: locationCode,
          language_code: proje.language_code,
          se_results_count: serp.toplam_sonuc,
          items: serp.ogeler as never,
        })
        .select("id")
        .single();

      if (kayit) {
        kaydedilen += 1;

        if (serp.ozellikler.length) {
          await supabase.from("serp_features").insert(
            serp.ozellikler.map((o) => ({
              serp_id: kayit.id,
              project_id: proje.id,
              feature_type: o.tur,
              position: o.pozisyon,
            })) as never,
          );
        }
      }
    } catch (hata) {
      // Tek kelimenin sorgusu başarısız olursa analiz durmaz.
      console.error("[serp] kelime sorgulanamadı", {
        keyword: aday.keyword,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  return { sorgulanan: adaylar.length, onbellekten, kaydedilen };
}
