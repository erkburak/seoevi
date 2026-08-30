import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsIstek, dfsTekSonuc, yenidenDene } from "./client";

/**
 * Google İşletme kaydındaki puan ve yorumlar.
 *
 * Marka aramalarında Google, işletme kartını yıldızıyla birlikte gösterir.
 * Düşük puan hem tıklamayı hem güveni düşürür; şikâyet başlıkları da çoğu
 * zaman ürün sayfalarında düzeltilebilecek somut sorunlara işaret eder
 * (kargo, iade, beden).
 *
 * ÖNEMLİ SINIR: bu veri bir Google İşletme/Haritalar kaydı gerektirir.
 * Yalnızca çevrim içi satan ve kaydı olmayan mağazalarda sağlayıcı
 * "No Search Results" döner. Bu durumda modül boş veri uydurmaz; kaydın
 * bulunamadığını açıkça söyler.
 *
 * Ölçülen maliyet: görev başına $0.00075.
 */

const AZAMI_BEKLEME_MS = 60_000;
const YOKLAMA_ARASI_MS = 4_000;

/** Sağlayıcı bu kodla "eşleşen işletme yok" der. */
const SONUC_YOK_KODU = 40102;

export type IsletmeYorumu = {
  yorumId: string;
  yazar: string | null;
  puan: number | null;
  metin: string | null;
  tarih: string | null;
};

export type IsletmeSonucu = {
  bulundu: boolean;
  baslik: string | null;
  puan: number | null;
  oySayisi: number | null;
  yorumlar: IsletmeYorumu[];
};

type HamYorum = {
  review_id?: string | null;
  id?: string | null;
  profile_name?: string | null;
  rating?: { value?: number | null } | null;
  review_text?: string | null;
  timestamp?: string | null;
};

type HamSonuc = {
  title?: string | null;
  rating?: { value?: number | null; votes_count?: number | null } | null;
  items?: HamYorum[];
};

function bekle(ms: number): Promise<void> {
  return new Promise((c) => setTimeout(c, ms));
}

/**
 * Verilen işletme adı için puan ve son yorumları getirir.
 *
 * `bulundu: false` dönmesi hata değildir: işletmenin Google kaydı yok ya
 * da girilen ad eşleşmiyor demektir. Arayüz bu ikisini birbirinden ayırıp
 * kullanıcıya ne yapması gerektiğini söylemelidir.
 */
export async function isletmeYorumlariGetir({
  isletmeAdi,
  locationCode,
  languageCode = "tr",
  derinlik = 20,
  tazelik,
}: {
  isletmeAdi: string;
  locationCode: number;
  languageCode?: string;
  derinlik?: number;
  tazelik?: Tazelik;
}): Promise<IsletmeSonucu> {
  const ad = isletmeAdi.trim();
  if (!ad) return { bulundu: false, baslik: null, puan: null, oySayisi: null, yorumlar: [] };

  const { veri } = await onbellekli<HamSonuc | null>(
    {
      endpoint: "/business_data/google/reviews/task_post",
      parametreler: { isletmeAdi: ad, locationCode, languageCode, derinlik },
      grup: "merchant",
      tazelik,
    },
    async () => {
      const yanit = await yenidenDene(() =>
        dfsIstek<never>("/business_data/google/reviews/task_post", [
          {
            keyword: ad,
            location_code: locationCode,
            language_code: languageCode,
            depth: derinlik,
            sort_by: "newest",
          },
        ]),
      );

      const gorevId = yanit.tasks?.[0]?.id;
      if (!gorevId) return null;

      const bitis = Date.now() + AZAMI_BEKLEME_MS;
      while (Date.now() < bitis) {
        await bekle(YOKLAMA_ARASI_MS);
        try {
          const sonuc = await dfsTekSonuc<HamSonuc>(
            `/business_data/google/reviews/task_get/${gorevId}`,
            undefined,
            "GET",
          );
          if (sonuc) return sonuc;
        } catch (hata) {
          /*
           * "No Search Results" beklenen bir sonuçtur, hata değil:
           * işletmenin Google kaydı yok demektir. Beklemeye devam etmek
           * anlamsız olur.
           */
          const kod = (hata as { kod?: number })?.kod;
          if (kod === SONUC_YOK_KODU) return null;
        }
      }
      return null;
    },
  );

  if (!veri) {
    return { bulundu: false, baslik: null, puan: null, oySayisi: null, yorumlar: [] };
  }

  const yorumlar: IsletmeYorumu[] = (veri.items ?? [])
    .map((y) => ({
      yorumId: y.review_id ?? y.id ?? "",
      yazar: y.profile_name ?? null,
      puan: typeof y.rating?.value === "number" ? y.rating.value : null,
      metin: y.review_text?.replace(/\s+/g, " ").trim() || null,
      tarih: y.timestamp ? new Date(y.timestamp).toISOString() : null,
    }))
    .filter((y) => y.yorumId.length > 0);

  return {
    bulundu: true,
    baslik: veri.title ?? null,
    puan: typeof veri.rating?.value === "number" ? veri.rating.value : null,
    oySayisi: typeof veri.rating?.votes_count === "number" ? veri.rating.votes_count : null,
    yorumlar,
  };
}
