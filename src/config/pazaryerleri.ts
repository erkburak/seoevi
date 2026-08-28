/**
 * Türkiye e-ticaret arama sonuçlarındaki baskın oyuncular.
 *
 * Türkiye'de bir e-ticaret sitesinin en büyük SEO rakibi genellikle
 * başka bir e-ticaret sitesi değil, kendi ürününü de satan pazaryeridir.
 * Aynı ürün için Trendyol ya da Hepsiburada üstte çıktığında, satış
 * komisyonlu kanala kayar — yani doğrudan gelir kaybı olur.
 *
 * Bu liste, arama sonuçlarında bu oyuncuları tanıyıp kullanıcının kendi
 * konumuyla karşılaştırabilmek için kullanılır.
 */

export type OyuncuTuru =
  /** Çok satıcılı pazaryeri — sizin ürününüzü de satıyor olabilir. */
  | "pazaryeri"
  /** Fiyat karşılaştırma sitesi — tıklamayı toplayıp dağıtır. */
  | "fiyat_karsilastirma"
  /** Büyük perakende zinciri — kendi stoğunu satar. */
  | "perakende"
  /** İçerik/inceleme sitesi — bilgi amaçlı aramalarda öne çıkar. */
  | "icerik";

export type Oyuncu = {
  alanAdi: string;
  ad: string;
  tur: OyuncuTuru;
};

export const TURKIYE_OYUNCULARI: Oyuncu[] = [
  /* --- Pazaryerleri --- */
  { alanAdi: "trendyol.com", ad: "Trendyol", tur: "pazaryeri" },
  { alanAdi: "hepsiburada.com", ad: "Hepsiburada", tur: "pazaryeri" },
  { alanAdi: "n11.com", ad: "n11", tur: "pazaryeri" },
  { alanAdi: "amazon.com.tr", ad: "Amazon TR", tur: "pazaryeri" },
  { alanAdi: "pazarama.com", ad: "Pazarama", tur: "pazaryeri" },
  { alanAdi: "ciceksepeti.com", ad: "Çiçeksepeti", tur: "pazaryeri" },
  { alanAdi: "modanisa.com", ad: "Modanisa", tur: "pazaryeri" },
  { alanAdi: "dolap.com", ad: "Dolap", tur: "pazaryeri" },
  { alanAdi: "letgo.com", ad: "letgo", tur: "pazaryeri" },
  { alanAdi: "sahibinden.com", ad: "Sahibinden", tur: "pazaryeri" },
  { alanAdi: "gardrops.com", ad: "Gardrops", tur: "pazaryeri" },
  { alanAdi: "idefix.com", ad: "idefix", tur: "pazaryeri" },

  /* --- Fiyat karşılaştırma --- */
  { alanAdi: "cimri.com", ad: "Cimri", tur: "fiyat_karsilastirma" },
  { alanAdi: "akakce.com", ad: "Akakçe", tur: "fiyat_karsilastirma" },
  { alanAdi: "epey.com", ad: "Epey", tur: "fiyat_karsilastirma" },
  { alanAdi: "encazip.com", ad: "Encazip", tur: "fiyat_karsilastirma" },

  /* --- Büyük perakende --- */
  { alanAdi: "teknosa.com", ad: "Teknosa", tur: "perakende" },
  { alanAdi: "vatanbilgisayar.com", ad: "Vatan Bilgisayar", tur: "perakende" },
  { alanAdi: "mediamarkt.com.tr", ad: "MediaMarkt", tur: "perakende" },
  { alanAdi: "migros.com.tr", ad: "Migros", tur: "perakende" },
  { alanAdi: "a101.com.tr", ad: "A101", tur: "perakende" },
  { alanAdi: "bim.com.tr", ad: "BİM", tur: "perakende" },
  { alanAdi: "carrefoursa.com", ad: "CarrefourSA", tur: "perakende" },
  { alanAdi: "lcw.com", ad: "LC Waikiki", tur: "perakende" },
  { alanAdi: "boyner.com.tr", ad: "Boyner", tur: "perakende" },
  { alanAdi: "defacto.com.tr", ad: "DeFacto", tur: "perakende" },
  { alanAdi: "koctas.com.tr", ad: "Koçtaş", tur: "perakende" },
  { alanAdi: "gratis.com", ad: "Gratis", tur: "perakende" },
  { alanAdi: "watsons.com.tr", ad: "Watsons", tur: "perakende" },
  { alanAdi: "rossmann.com.tr", ad: "Rossmann", tur: "perakende" },
  { alanAdi: "decathlon.com.tr", ad: "Decathlon", tur: "perakende" },
  { alanAdi: "ikea.com.tr", ad: "IKEA", tur: "perakende" },
  { alanAdi: "arcelik.com.tr", ad: "Arçelik", tur: "perakende" },
  { alanAdi: "vestel.com.tr", ad: "Vestel", tur: "perakende" },

  /* --- İçerik --- */
  { alanAdi: "sikayetvar.com", ad: "Şikayetvar", tur: "icerik" },
  { alanAdi: "eksisozluk.com", ad: "Ekşi Sözlük", tur: "icerik" },
  { alanAdi: "youtube.com", ad: "YouTube", tur: "icerik" },
  { alanAdi: "wikipedia.org", ad: "Wikipedia", tur: "icerik" },
];

const HARITA = new Map(TURKIYE_OYUNCULARI.map((o) => [o.alanAdi, o]));

/**
 * Bir alan adının bilinen bir oyuncuya ait olup olmadığını döndürür.
 * Alt alan adları da eşleşir (ör. "m.trendyol.com" → Trendyol).
 */
export function oyuncuTani(alanAdi: string | null | undefined): Oyuncu | null {
  if (!alanAdi) return null;
  const temiz = alanAdi.toLowerCase().replace(/^www\./, "");

  const dogrudan = HARITA.get(temiz);
  if (dogrudan) return dogrudan;

  // Alt alan adı eşleşmesi
  for (const o of TURKIYE_OYUNCULARI) {
    if (temiz === o.alanAdi || temiz.endsWith(`.${o.alanAdi}`)) return o;
  }
  return null;
}

export const TUR_ADI: Record<OyuncuTuru, string> = {
  pazaryeri: "Pazaryeri",
  fiyat_karsilastirma: "Fiyat karşılaştırma",
  perakende: "Perakende zinciri",
  icerik: "İçerik sitesi",
};

/**
 * Tür bazında tehdit ağırlığı.
 *
 * Pazaryeri en yüksek: sizin ürününüzü satıp komisyon alıyor olabilir.
 * Fiyat karşılaştırma da yüksek: tıklamayı toplayıp size ücretli
 * yönlendiriyor. Perakende normal rekabet. İçerik sitesi ise ticari
 * aramalarda genellikle tehdit değildir.
 */
export const TUR_AGIRLIGI: Record<OyuncuTuru, number> = {
  pazaryeri: 1,
  fiyat_karsilastirma: 0.8,
  perakende: 0.5,
  icerik: 0.15,
};
