import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { dfsIstek, dfsTekSonuc, yenidenDene } from "./client";

/**
 * Google Alışveriş (Merchant) verileri.
 * Bu uç noktalar görev tabanlıdır: önce görev açılır, sonuç hazır olunca okunur.
 */

export type AlisverisUrunu = {
  urun_id: string | null;
  baslik: string;
  fiyat: number | null;
  para_birimi: string;
  satici: string | null;
  alan_adi: string | null;
  pozisyon: number | null;
  puan: number | null;
  yorum_sayisi: number | null;
  gorsel: string | null;
  url: string | null;
};

/** Alışveriş sonuçları için görev açar. */
export async function alisverisGoreviAc({
  keyword,
  locationCode,
  languageCode = "tr",
}: {
  keyword: string;
  locationCode: number;
  languageCode?: string;
}): Promise<string> {
  const gövde = [
    {
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      depth: 50,
    },
  ];

  const yanit = await yenidenDene(() => dfsIstek<never>("/merchant/google/products/task_post", gövde));
  const id = yanit.tasks?.[0]?.id;
  if (!id) throw new Error("Merchant görevi oluşturulamadı.");
  return id;
}

type HamAlisverisOgesi = {
  type?: string;
  rank_absolute?: number;
  title?: string;
  price?: number | null;
  currency?: string | null;
  seller?: string | null;
  data_docid?: string | null;
  product_id?: string | null;
  url?: string | null;
  image_url?: string | null;
  rating?: { value?: number | null; votes_count?: number | null } | null;
  domain?: string | null;
};

function urunCevir(o: HamAlisverisOgesi): AlisverisUrunu {
  let alanAdi = o.domain ?? null;
  if (!alanAdi && o.url) {
    try {
      alanAdi = new URL(o.url).hostname.replace(/^www\./, "");
    } catch {
      alanAdi = null;
    }
  }

  return {
    urun_id: o.product_id ?? o.data_docid ?? null,
    baslik: o.title ?? "",
    fiyat: o.price ?? null,
    para_birimi: o.currency ?? "TRY",
    satici: o.seller ?? null,
    alan_adi: alanAdi,
    pozisyon: o.rank_absolute ?? null,
    puan: o.rating?.value ?? null,
    yorum_sayisi: o.rating?.votes_count ?? null,
    gorsel: o.image_url ?? null,
    url: o.url ?? null,
  };
}

/** Görev sonucunu okur. Hazır değilse null döner. */
export async function alisverisSonucu(gorevId: string): Promise<AlisverisUrunu[] | null> {
  try {
    const veri = await dfsTekSonuc<{ items?: HamAlisverisOgesi[] }>(
      `/merchant/google/products/task_get/advanced/${gorevId}`,
      undefined,
      "GET",
    );
    if (!veri) return null;
    return (veri.items ?? []).map(urunCevir);
  } catch {
    return null;
  }
}

/**
 * Bir ürün için Merchant görünürlüğünü değerlendirir.
 * Görev tamamlanana kadar kısa aralıklarla yoklar.
 */
export async function alisverisGorunurlugu({
  keyword,
  locationCode,
  languageCode = "tr",
  bizimAlanAdi,
  maksBekleme = 45_000,
  tazelik,
}: {
  keyword: string;
  locationCode: number;
  languageCode?: string;
  bizimAlanAdi: string;
  maksBekleme?: number;
  tazelik?: Tazelik;
}): Promise<{
  urunler: AlisverisUrunu[];
  bizim_urun: AlisverisUrunu | null;
  satici_sayisi: number;
  fiyat_konumu: "en_ucuz" | "ortalama" | "pahali" | null;
}> {
  const { veri: urunler } = await onbellekli(
    {
      endpoint: "/merchant/google/products",
      parametreler: { keyword, locationCode, languageCode },
      grup: "merchant",
      tazelik,
    },
    async () => {
      const gorevId = await alisverisGoreviAc({ keyword, locationCode, languageCode });
      const baslangic = Date.now();

      while (Date.now() - baslangic < maksBekleme) {
        await new Promise((r) => setTimeout(r, 4000));
        const sonuc = await alisverisSonucu(gorevId);
        if (sonuc && sonuc.length) return sonuc;
      }
      return [] as AlisverisUrunu[];
    },
  );

  const bizimUrun = urunler.find((u) => u.alan_adi === bizimAlanAdi || u.satici?.toLowerCase().includes(bizimAlanAdi.split(".")[0])) ?? null;
  const fiyatlar = urunler.map((u) => u.fiyat).filter((f): f is number => f !== null && f > 0);

  let fiyatKonumu: "en_ucuz" | "ortalama" | "pahali" | null = null;
  if (bizimUrun?.fiyat && fiyatlar.length > 1) {
    const sirali = [...fiyatlar].sort((a, b) => a - b);
    const indeks = sirali.indexOf(bizimUrun.fiyat);
    const oran = indeks / (sirali.length - 1);
    fiyatKonumu = oran <= 0.25 ? "en_ucuz" : oran >= 0.75 ? "pahali" : "ortalama";
  }

  return {
    urunler,
    bizim_urun: bizimUrun,
    satici_sayisi: new Set(urunler.map((u) => u.satici ?? u.alan_adi).filter(Boolean)).size,
    fiyat_konumu: fiyatKonumu,
  };
}
