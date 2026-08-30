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
 * Son doğrulama: 30 Agustos 2026 (SERP fiyatlari canli olcumle duzeltildi)
 */

/** Sağlayıcı birim fiyatları — USD. */
export const BIRIM_MALIYET = {
  /**
   * Canlı SERP sorgusu (google organic live advanced), derinlik 30.
   *
   * Ölçülen değerdir, fiyat listesinden okunan tahmin değil. Derinlik
   * doğrudan fiyata yansır: 20 → $0.004, 30 → $0.006, 50 → $0.010,
   * 100 → $0.014. `serpGetir` varsayılan olarak derinlik 30 kullandığı
   * için model de bu değeri esas alır.
   */
  serp: 0.006,
  /** Canlı SERP, derinlik 100 — tam sayfa taraması gerektiğinde. */
  serpDerin: 0.014,
  /**
   * Kuyruklu SERP görevi (task_post, standart öncelik), derinlik 30.
   *
   * Canlının üçte biri fiyat; sonuç birkaç dakika gecikmeli gelir.
   * Sıralama doğrulaması arka planda çalıştığı için gecikme sorun değil,
   * fiyat farkı ise paket limitlerini doğrudan belirliyor.
   */
  serpGorev: 0.0018,
  /** OnPage taramasında sayfa başına. */
  taramaSayfa: 0.00015,
  /** Tek sayfa anlık analizi (instant_pages). */
  anlikSayfa: 0.00015,
  /** DataForSEO Labs — taban + 1000 satır başına. */
  labsTaban: 0.00012,
  labsBinSatir: 0.012,
  /** Google Ads anahtar kelime verisi — çağrı başına. En pahalı uç nokta. */
  kelimeArastirmasi: 0.09,
  /** Lighthouse ile sayfa hızı ölçümü — sayfa başına (canlı ve kuyruklu aynı). */
  sayfaHizi: 0.005,
  /** Bir ürünü satan satıcıların listesi — ürün başına. */
  saticiSorgusu: 0.001,
  /** Google İşletme yorumları — çağrı başına. */
  isletmeYorumu: 0.00075,
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

/**
 * Limitin ne kadarının gerçekte kullanıldığına dair varsayım.
 *
 * Limitlerin çoğu bir TAAHHÜT değil, bir TAVANdır. `gunluk_serp` bir
 * kullanıcının günde açabileceği azami SERP sayısıdır; her gün tavana
 * vurulacağını varsaymak, kimsenin yapmadığı bir kullanımın parasını
 * fiyata koymak olur. Ölçülen gerçek birim fiyatlarla bu varsayım
 * paketleri %43–%53 maliyet oranında gösteriyordu.
 *
 * Bu yüzden iki ayrı rakam hesaplanır:
 *
 *   `aylikMaliyet`   → TAVAN. Kullanıcı hakkının tamamını kullanırsa.
 *   `beklenenMaliyet`→ Gerçekçi kullanımla. Fiyatlandırma buna bakar.
 *
 * DİKKAT: aşağıdaki paylar şu an ÖLÇÜM DEĞİL, varsayımdır — ürün henüz
 * yayında değil. `npm run tani:kullanim` gerçek tüketimi raporlar;
 * yeterli veri biriktiğinde bu sayılar ölçümle değiştirilmelidir.
 * Değiştirilene kadar tavan rakamı da gözden kaçırılmamalıdır.
 */
export const KULLANIM_PAYI = {
  /** Kullanıcı tetikli, talep üzerine: kelimeye tıklayıp SERP açmak. */
  gunluk_serp: 0.2,
  /** Kullanıcı ayda birkaç kez analiz başlatır, hakkının tamamını nadiren kullanır. */
  aylik_site_taramasi: 0.6,
  aylik_kelime_arastirmasi: 0.6,
  aylik_ai: 0.6,
} as const;

export type LimitGirdisi = {
  gunluk_serp: number;
  /** Her analizde sırası canlı doğrulanan kelime sayısı. */
  dogrulanan_kelime: number;
  /** Her analizde hızı ölçülen sayfa sayısı. */
  hiz_olcum_sayfa: number;
  satici_karsilastirma: boolean;
  isletme_yorumlari: boolean;
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
  /** Sıralama doğrulaması — kuyruklu SERP görevleri. */
  siraDogrulama: number;
  /** Sayfa hızı ölçümü. */
  sayfaHizi: number;
  /** Satıcı fiyat karşılaştırması ve işletme yorumları. */
  saticiVeYorum: number;
  tarama: number;
  kelimeArastirmasi: number;
  labs: number;
  backlink: number;
  merchant: number;
  icerik: number;
  ai: number;
  toplam: number;
};

/**
 * Bir paketin aylık TAVAN maliyetini USD olarak hesaplar.
 *
 * `paylar` verilirse her limit o oranda kullanılmış sayılır; böylece
 * beklenen maliyet aynı formülden çıkar ve iki rakam ayrışmaz.
 */
export function aylikMaliyet(
  limit: LimitGirdisi,
  gunSayisi = 30,
  paylar: Partial<Record<keyof typeof KULLANIM_PAYI, number>> = {},
): MaliyetDokumu {
  const pay = (ad: keyof typeof KULLANIM_PAYI) => paylar[ad] ?? 1;

  const analizSayisi = limit.aylik_site_taramasi * pay("aylik_site_taramasi");

  const serp = limit.gunluk_serp * gunSayisi * BIRIM_MALIYET.serp * pay("gunluk_serp");

  /*
   * Sıralama doğrulaması her site analizinde bir kez çalışır: takip
   * edilen en yüksek fırsatlı N kelimenin sırası kuyruklu SERP göreviyle
   * canlı ölçülür. Labs verisi aylar eski olabildiği için bu kalem
   * pazarlık konusu değil; ürünün doğru olmasının bedeli.
   */
  const siraDogrulama = limit.dogrulanan_kelime * analizSayisi * BIRIM_MALIYET.serpGorev;

  const tarama = analizSayisi * limit.tarama_sayfa * BIRIM_MALIYET.taramaSayfa;

  // Hız ölçümü her site analizinde, şablon temsilcisi sayfalar için yapılır.
  const sayfaHizi = limit.hiz_olcum_sayfa * analizSayisi * BIRIM_MALIYET.sayfaHizi;

  /*
   * Satıcı sorgusu Merchant analizindeki ilk 10 ürünle sınırlı ve o
   * analizin Alışveriş sorgusu önbelleklidir; burada yalnızca satıcı
   * sorgusunun kendisi sayılır.
   */
  const saticiVeYorum =
    (limit.satici_karsilastirma ? 10 * analizSayisi * BIRIM_MALIYET.saticiSorgusu : 0) +
    (limit.isletme_yorumlari ? analizSayisi * BIRIM_MALIYET.isletmeYorumu : 0);

  const kelimeArastirmasi =
    limit.aylik_kelime_arastirmasi * pay("aylik_kelime_arastirmasi") * BIRIM_MALIYET.kelimeArastirmasi;

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

  const ai = limit.aylik_ai * pay("aylik_ai") * AI_CAGRI_MALIYETI;

  const toplam =
    serp +
    siraDogrulama +
    sayfaHizi +
    saticiVeYorum +
    tarama +
    kelimeArastirmasi +
    labs +
    backlink +
    merchant +
    icerik +
    ai;

  return {
    serp,
    siraDogrulama,
    sayfaHizi,
    saticiVeYorum,
    tarama,
    kelimeArastirmasi,
    labs,
    backlink,
    merchant,
    icerik,
    ai,
    toplam,
  };
}

/**
 * Gerçekçi kullanımla aylık maliyet.
 *
 * Fiyatlandırma kararları buna bakar; tavan rakamı riskin büyüklüğünü
 * görmek için ayrıca hesaplanır.
 */
export function beklenenMaliyet(limit: LimitGirdisi, gunSayisi = 30): MaliyetDokumu {
  return aylikMaliyet(limit, gunSayisi, KULLANIM_PAYI);
}

/** Paketin BEKLENEN maliyet / gelir oranını döndürür. */
export function maliyetOrani(limit: LimitGirdisi, aylikFiyatTl: number): number {
  const gelirUsd = aylikFiyatTl / USD_TRY;
  if (gelirUsd <= 0) return Infinity;
  return beklenenMaliyet(limit).toplam / gelirUsd;
}

/** Paketin TAVAN maliyet / gelir oranı — hakkının tamamı kullanılırsa. */
export function tavanMaliyetOrani(limit: LimitGirdisi, aylikFiyatTl: number): number {
  const gelirUsd = aylikFiyatTl / USD_TRY;
  if (gelirUsd <= 0) return Infinity;
  return aylikMaliyet(limit).toplam / gelirUsd;
}

/** Bir paketin sürdürülebilir olup olmadığını söyler. */
export function surdurulebilirMi(limit: LimitGirdisi, aylikFiyatTl: number): boolean {
  return maliyetOrani(limit, aylikFiyatTl) <= HEDEF_MALIYET_ORANI;
}
