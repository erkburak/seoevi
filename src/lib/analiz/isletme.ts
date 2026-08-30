import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { isletmeYorumlariGetir } from "@/lib/dataforseo/isletme";
import { abonelikDurumu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * Google İşletme puanı ve yorumları.
 *
 * Marka aramalarında Google işletme kartını yıldızıyla gösterir; düşük
 * puan tıklamayı ve güveni düşürür. Yorum metinleri ayrıca somut sorunlara
 * işaret eder — kargo gecikmesi, iade zorluğu, beden uyumsuzluğu gibi
 * konular çoğu zaman ürün sayfasında da düzeltilebilir.
 *
 * SINIR: veri Google İşletme kaydı gerektirir. İşletme adı girilmemişse
 * ya da kayıt bulunamazsa modül boş veri üretmez; durumu açıkça bildirir.
 */

export type IsletmeAnaliziSonucu = {
  /** İşletme adı hiç girilmemiş. */
  adGirilmemis: boolean;
  /** Ad girilmiş ama Google'da eşleşen kayıt bulunamamış. */
  kayitBulunamadi: boolean;
  baslik: string | null;
  puan: number | null;
  oySayisi: number | null;
  yeniYorum: number;
  /** Çekilen yorumlar içindeki 1-2 yıldızlı yorum sayısı. */
  olumsuzYorum: number;
};

const BOS: IsletmeAnaliziSonucu = {
  adGirilmemis: true,
  kayitBulunamadi: false,
  baslik: null,
  puan: null,
  oySayisi: null,
  yeniYorum: 0,
  olumsuzYorum: 0,
};

export async function isletmeAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<IsletmeAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const { limitler, aktifMi } = await abonelikDurumu(proje.user_id);

  if (!aktifMi || limitler?.isletme_yorumlari !== true) return BOS;

  const { data: ayar } = await supabase
    .from("project_settings")
    .select("google_isletme_adi")
    .eq("project_id", proje.id)
    .maybeSingle();

  const isletmeAdi = (ayar?.google_isletme_adi ?? "").trim();
  if (!isletmeAdi) return BOS;

  const sonuc = await isletmeYorumlariGetir({
    isletmeAdi,
    locationCode: proje.location_code ?? 2792,
    languageCode: proje.language_code,
    tazelik,
  });

  if (!sonuc.bulundu) {
    return { ...BOS, adGirilmemis: false, kayitBulunamadi: true };
  }

  /* ---------------- Kaydet ---------------- */

  await supabase.from("isletme_ozeti").upsert(
    {
      project_id: proje.id,
      baslik: sonuc.baslik,
      puan: sonuc.puan,
      oy_sayisi: sonuc.oySayisi,
      olculdu_at: new Date().toISOString(),
    } as never,
    { onConflict: "project_id" },
  );

  const yorumlar = sonuc.yorumlar.map((y) => ({
    project_id: proje.id,
    yorum_id: y.yorumId,
    yazar: y.yazar,
    puan: y.puan,
    metin: y.metin,
    yorum_tarihi: y.tarih,
    olculdu_at: new Date().toISOString(),
  }));

  if (yorumlar.length) {
    for (let i = 0; i < yorumlar.length; i += 200) {
      await supabase
        .from("isletme_yorumlari")
        .upsert(yorumlar.slice(i, i + 200) as never, { onConflict: "project_id,yorum_id" });
    }
  }

  return {
    adGirilmemis: false,
    kayitBulunamadi: false,
    baslik: sonuc.baslik,
    puan: sonuc.puan,
    oySayisi: sonuc.oySayisi,
    yeniYorum: yorumlar.length,
    olumsuzYorum: sonuc.yorumlar.filter((y) => y.puan !== null && y.puan <= 2).length,
  };
}
