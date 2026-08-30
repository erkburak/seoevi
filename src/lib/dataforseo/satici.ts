import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsIstek, dfsTekSonuc, yenidenDene } from "./client";

/**
 * Bir ürünü satan diğer satıcılar ve fiyatları.
 *
 * Fiyat konumu şimdiye kadar Alışveriş arama sonuçları taranarak tahmin
 * ediliyordu: aynı ürünün farklı satıcılardaki kaydı başlık benzerliğiyle
 * eşleştiriliyor, bu da yanlış eşleşmelere açık kalıyordu. `sellers` ucu
 * Google'ın kendi ürün kimliği üzerinden gider; hangi satıcının hangi
 * fiyatı verdiği tahmin değil, doğrudan veridir.
 *
 * Ölçülen maliyet: görev başına $0.001.
 */

/** Görevin tamamlanması için tanınan azami süre. */
const AZAMI_BEKLEME_MS = 45_000;
const YOKLAMA_ARASI_MS = 3_000;

export type SaticiTeklifi = {
  satici: string;
  alanAdi: string | null;
  /** Kargo ve vergi dahil toplam. Sağlayıcı çoğu zaman yalnızca bunu verir. */
  toplamFiyat: number | null;
  /** Ürünün kendi fiyatı; her zaman dolu gelmez. */
  fiyat: number | null;
  paraBirimi: string;
  puan: number | null;
};

export type SaticiSonucu = {
  googleUrunId: string;
  baslik: string | null;
  teklifler: SaticiTeklifi[];
  onbellekten: boolean;
};

type HamSatici = {
  seller?: string | null;
  domain?: string | null;
  price?: number | null;
  total_price?: number | null;
  currency?: string | null;
  rating?: { value?: number | null } | null;
};

type HamSonuc = {
  title?: string | null;
  items?: HamSatici[];
};

function bekle(ms: number): Promise<void> {
  return new Promise((c) => setTimeout(c, ms));
}

function alanAdindanSadelestir(deger: string | null | undefined): string | null {
  if (!deger) return null;
  return deger.replace(/^www\./, "").toLocaleLowerCase("tr-TR");
}

/**
 * Bir Google ürün kimliği için satıcı listesini getirir.
 *
 * Kuyruklu uçtur: görev açılır, birkaç saniye içinde tamamlanır. Süre
 * dolarsa boş liste döner — uydurma veri üretilmez.
 */
export async function saticilariGetir({
  googleUrunId,
  locationCode,
  languageCode = "tr",
  tazelik,
}: {
  googleUrunId: string;
  locationCode: number;
  languageCode?: string;
  tazelik?: Tazelik;
}): Promise<SaticiSonucu> {
  const { veri, onbellekten } = await onbellekli<HamSonuc | null>(
    {
      endpoint: "/merchant/google/sellers/task_post",
      parametreler: { googleUrunId, locationCode, languageCode },
      grup: "merchant",
      tazelik,
    },
    async () => {
      const yanit = await yenidenDene(() =>
        dfsIstek<never>("/merchant/google/sellers/task_post", [
          { product_id: googleUrunId, location_code: locationCode, language_code: languageCode },
        ]),
      );

      const gorevId = yanit.tasks?.[0]?.id;
      if (!gorevId) return null;

      const bitis = Date.now() + AZAMI_BEKLEME_MS;
      while (Date.now() < bitis) {
        await bekle(YOKLAMA_ARASI_MS);
        try {
          const sonuc = await dfsTekSonuc<HamSonuc>(
            `/merchant/google/sellers/task_get/advanced/${gorevId}`,
            undefined,
            "GET",
          );
          if (sonuc) return sonuc;
        } catch {
          // Görev henüz hazır değil; beklemeye devam edilir.
        }
      }
      return null;
    },
  );

  const teklifler = (veri?.items ?? [])
    .map((s) => ({
      satici: s.seller ?? s.domain ?? "",
      alanAdi: alanAdindanSadelestir(s.domain ?? s.seller),
      toplamFiyat: typeof s.total_price === "number" ? s.total_price : null,
      fiyat: typeof s.price === "number" ? s.price : null,
      paraBirimi: s.currency ?? "TRY",
      puan: typeof s.rating?.value === "number" ? s.rating.value : null,
    }))
    .filter((s) => s.satici.length > 0);

  return {
    googleUrunId,
    baslik: veri?.title ?? null,
    teklifler,
    onbellekten,
  };
}
