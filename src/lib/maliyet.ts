/**
 * DataForSEO birim maliyetleri ve paket maliyet modeli.
 *
 * Buradaki rakamlar hesabın kendi fiyat listesinden alınmıştır
 * (`/v3/appendix/user_data` → `price`). Paket limitleri belirlenirken
 * tahmin yapılmaz; her limitin aylık en kötü durum maliyeti hesaplanır.
 *
 * Fiyat listesi değişirse `npm run tani:servis` ile karşılaştırıp
 * bu dosyayı güncelleyin.
 *
 * Son doğrulama: 27 Ağustos 2026
 */

/** Sağlayıcı birim fiyatları — USD. */
export const BIRIM_MALIYET = {
  /** Canlı SERP sorgusu (google organic live advanced). */
  serp: 0.002,
  /** Kuyruklu SERP görevi — canlıya göre ucuz, sonuç gecikmeli. */
  serpGorev: 0.0006,
  /** OnPage taramasında sayfa başına. */
  taramaSayfa: 0.00015,
  /** Tek sayfa anlık analizi (instant_pages). */
  anlikSayfa: 0.00015,
  /** DataForSEO Labs — taban + 1000 satır başına. */
  labsTaban: 0.00012,
  labsBinSatir: 0.012,
  /** Google Ads anahtar kelime verisi — çağrı başına. En pahalı uç nokta. */
  kelimeArastirmasi: 0.09,
  /** Geri bağlantı uç noktaları — taban + 1000 satır başına. */
  backlinkTaban: 0.000036,
  backlinkBinSatir: 0.024,
  /** İçerik analizi — taban + 1000 satır başına. */
  icerikTaban: 0.000036,
  icerikBinSatir: 0.024,
  /** Merchant ürün görevi. */
  merchantGorev: 0.001,
} as const;

/**
 * Yapay zekâ çağrısı başına yaklaşık maliyet (USD).
 * ~2.000 girdi + ~800 çıktı jetonu üzerinden hesaplanmıştır.
 */
export const AI_CAGRI_MALIYETI = 0.018;

/**
 * Türk lirası karşılığı.
 * Fiyatlar TL cinsinden sabitlendiğinden, maliyet oranı bu kura bağlıdır.
 * Kur ciddi biçimde değişirse paket limitleri gözden geçirilmelidir.
 */
export const USD_TRY = 48.14;

/** Hedeflenen azami API maliyeti / gelir oranı. */
export const HEDEF_MALIYET_ORANI = 0.25;

export type LimitGirdisi = {
  gunluk_serp: number;
  aylik_site_taramasi: number;
  tarama_sayfa: number;
  aylik_kelime_arastirmasi: number;
  aylik_ai: number;
  rakip: number;
  geri_baglanti: boolean;
  merchant: boolean;
  ai_gorunurlugu: boolean;
};

export type MaliyetDokumu = {
  serp: number;
  tarama: number;
  kelimeArastirmasi: number;
  labs: number;
  backlink: number;
  merchant: number;
  icerik: number;
  ai: number;
  toplam: number;
};

/** Bir paketin aylık en kötü durum maliyetini USD olarak hesaplar. */
export function aylikMaliyet(limit: LimitGirdisi, gunSayisi = 30): MaliyetDokumu {
  const serp = limit.gunluk_serp * gunSayisi * BIRIM_MALIYET.serp;

  const tarama =
    limit.aylik_site_taramasi * limit.tarama_sayfa * BIRIM_MALIYET.taramaSayfa;

  const kelimeArastirmasi =
    limit.aylik_kelime_arastirmasi * BIRIM_MALIYET.kelimeArastirmasi;

  // Labs çağrıları rakip başına ayda birkaç kez yenilenir.
  const labsCagri = (limit.rakip + 1) * 4;
  const labs = labsCagri * (BIRIM_MALIYET.labsTaban + BIRIM_MALIYET.labsBinSatir);

  const backlink = limit.geri_baglanti
    ? 30 * (BIRIM_MALIYET.backlinkTaban + BIRIM_MALIYET.backlinkBinSatir)
    : 0;

  const merchant = limit.merchant ? 30 * BIRIM_MALIYET.merchantGorev + 20 * BIRIM_MALIYET.serp : 0;

  // İçerik analizi SERP çağrısını zaten günlük SERP limitinden düşer;
  // burada yalnızca incelenen rakip sayfalarının ek maliyeti sayılır.
  const icerikAnalizi = Math.min(20, limit.gunluk_serp);
  const icerik = icerikAnalizi * 7 * BIRIM_MALIYET.anlikSayfa;

  const ai = limit.aylik_ai * AI_CAGRI_MALIYETI;

  const toplam = serp + tarama + kelimeArastirmasi + labs + backlink + merchant + icerik + ai;

  return { serp, tarama, kelimeArastirmasi, labs, backlink, merchant, icerik, ai, toplam };
}

/** Paketin maliyet / gelir oranını döndürür. */
export function maliyetOrani(limit: LimitGirdisi, aylikFiyatTl: number): number {
  const gelirUsd = aylikFiyatTl / USD_TRY;
  if (gelirUsd <= 0) return Infinity;
  return aylikMaliyet(limit).toplam / gelirUsd;
}

/** Bir paketin sürdürülebilir olup olmadığını söyler. */
export function surdurulebilirMi(limit: LimitGirdisi, aylikFiyatTl: number): boolean {
  return maliyetOrani(limit, aylikFiyatTl) <= HEDEF_MALIYET_ORANI;
}
