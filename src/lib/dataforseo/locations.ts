import "server-only";

import { dfsTumSonuclar } from "./client";
import { onbellekli } from "./cache";

/**
 * Konum ve dil kodları.
 *
 * Kodlar DataForSEO'nun kendi uç noktasından okunur ve 30 gün önbelleklenir.
 * Sabit değerler yalnızca sağlayıcıya hiç ulaşılamadığında devreye giren
 * son çare olarak tutulur (Türkiye = 2792, Türkçe = "tr").
 */

const SON_CARE_TURKIYE = { location_code: 2792, location_name: "Turkey" } as const;

export type Konum = {
  location_code: number;
  location_name: string;
  location_code_parent: number | null;
  country_iso_code: string;
  location_type: string;
};

export type Dil = {
  language_name: string;
  language_code: string;
};

/** Bir ülkenin tüm konumlarını döndürür. */
export async function ulkeKonumlari(ulkeKodu = "TR"): Promise<Konum[]> {
  const { veri } = await onbellekli(
    {
      endpoint: "/serp/google/locations/country",
      parametreler: { ulke: ulkeKodu },
      grup: "locations",
    },
    async () => dfsTumSonuclar<Konum>(`/serp/google/locations/${ulkeKodu}`, undefined, "GET"),
  );
  return veri;
}

/**
 * Ülke düzeyindeki konum kodunu döndürür.
 * Sağlayıcıya ulaşılamazsa son çare değeri kullanılır ve uyarı loglanır.
 */
export async function ulkeKonumu(
  ulkeKodu = "TR",
): Promise<{ location_code: number; location_name: string }> {
  try {
    const konumlar = await ulkeKonumlari(ulkeKodu);
    const ulke = konumlar.find(
      (k) => k.location_type === "Country" && k.country_iso_code === ulkeKodu.toUpperCase(),
    );
    if (ulke) {
      return { location_code: ulke.location_code, location_name: ulke.location_name };
    }
    console.warn("[dataforseo] ülke konumu bulunamadı, son çare kullanılıyor", { ulkeKodu });
  } catch (hata) {
    console.warn("[dataforseo] konum listesi alınamadı, son çare kullanılıyor", {
      ulkeKodu,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  }
  return { ...SON_CARE_TURKIYE };
}

/** Şehir/bölge araması — proje ayarlarında konum seçimi için. */
export async function konumAra(sorgu: string, ulkeKodu = "TR"): Promise<Konum[]> {
  const konumlar = await ulkeKonumlari(ulkeKodu);
  const q = sorgu.trim().toLocaleLowerCase("tr-TR");
  if (!q) return konumlar.slice(0, 30);
  return konumlar.filter((k) => k.location_name.toLocaleLowerCase("tr-TR").includes(q)).slice(0, 30);
}

/** Desteklenen diller. */
export async function diller(): Promise<Dil[]> {
  const { veri } = await onbellekli(
    { endpoint: "/serp/google/languages", parametreler: {}, grup: "locations" },
    async () => dfsTumSonuclar<Dil>("/serp/google/languages", undefined, "GET"),
  );
  return veri;
}

/** Dil kodunu doğrular; bulunamazsa gönderilen kodu aynen döndürür. */
export async function dilDogrula(kod = "tr"): Promise<{ language_code: string; language_name: string }> {
  try {
    const liste = await diller();
    const dil = liste.find((d) => d.language_code === kod);
    if (dil) return { language_code: dil.language_code, language_name: dil.language_name };
  } catch {
    // sessizce son çareye düş
  }
  return { language_code: kod, language_name: kod === "tr" ? "Turkish" : kod };
}
