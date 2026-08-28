import type { AramaAmaci, Etki, Onem, ProjeSkorlari } from "@/types/database";

import { arasinda } from "@/lib/utils";

/**
 * Skorlama motoru.
 *
 * Tüm skorlar gerçek sinyallerden hesaplanır; görsel bir gösterge değildir.
 * Ağırlıklar app_config üzerinden değiştirilebilir, buradaki değerler
 * yalnızca varsayılandır.
 */

/* ================================================================== */
/* 1. Anahtar kelime fırsat skoru                                     */
/* ================================================================== */

export type FirsatAgirliklari = {
  hacim: number;
  rekabet: number;
  mevcut_siralama: number;
  ticari_amac: number;
  serp_yapisi: number;
  rakip_yogunlugu: number;
};

export const VARSAYILAN_FIRSAT_AGIRLIKLARI: FirsatAgirliklari = {
  hacim: 25,
  rekabet: 20,
  mevcut_siralama: 20,
  ticari_amac: 15,
  serp_yapisi: 10,
  rakip_yogunlugu: 10,
};

export type FirsatGirdisi = {
  aramaHacmi: number | null;
  zorluk: number | null;
  rekabet: number | null;
  mevcutPozisyon: number | null;
  amac: AramaAmaci | null;
  /** SERP'te reklam/alışveriş/öne çıkan snippet gibi özellik sayısı. */
  serpOzellikSayisi?: number;
  alisverisVar?: boolean;
  /** İlk 10'daki rakip sayısı. */
  rakipSayisi?: number;
  /** Alan adı gücü 0-100. */
  alanAdiGucu?: number | null;
};

export type FirsatSonucu = {
  skor: number;
  sinyaller: Record<keyof FirsatAgirliklari, number>;
  tahminiTrafik: number;
  hedefPozisyon: number;
  gerekce: string;
};

/** Logaritmik hacim puanı: 10 arama da 100.000 arama da 0-100 aralığına oturur. */
function hacimPuani(hacim: number | null): number {
  if (!hacim || hacim <= 0) return 0;
  // 10 -> ~14, 1.000 -> ~60, 10.000 -> ~80, 100.000 -> 100
  return arasinda((Math.log10(hacim) / 5) * 100, 0, 100);
}

/** Rekabet puanı: düşük rekabet yüksek puan. */
function rekabetPuani(zorluk: number | null, rekabet: number | null): number {
  const z = zorluk !== null && zorluk !== undefined ? zorluk : rekabet !== null && rekabet !== undefined ? rekabet * 100 : 50;
  return arasinda(100 - z, 0, 100);
}

/**
 * Mevcut sıralama puanı.
 * En yüksek puan 4-20 arasındaki kelimelerde: küçük bir iyileştirme
 * doğrudan trafiğe dönüşür. Zaten ilk 3'teyse fırsat düşüktür.
 */
function siralamaPuani(pozisyon: number | null): number {
  if (pozisyon === null || pozisyon === undefined) return 42; // henüz sıralanmıyor
  if (pozisyon <= 3) return 8;
  if (pozisyon <= 10) return 78;
  if (pozisyon <= 20) return 100;
  if (pozisyon <= 30) return 82;
  if (pozisyon <= 50) return 55;
  return 30;
}

const AMAC_PUANI: Record<AramaAmaci, number> = {
  islem: 100,
  ticari: 85,
  gezinme: 35,
  bilgi: 45,
};

/** Ticari değer puanı. */
function amacPuani(amac: AramaAmaci | null, alisverisVar: boolean): number {
  const temel = amac ? AMAC_PUANI[amac] : 50;
  return arasinda(alisverisVar ? temel + 10 : temel, 0, 100);
}

/**
 * SERP yapısı puanı.
 * Çok sayıda özellik organik tıklamayı azaltır; alışveriş modülü ise
 * e-ticaret için ek bir kazanım alanıdır.
 */
function serpPuani(ozellikSayisi: number, alisverisVar: boolean): number {
  const ceza = arasinda(ozellikSayisi * 9, 0, 55);
  return arasinda(100 - ceza + (alisverisVar ? 15 : 0), 0, 100);
}

/** Rakip yoğunluğu puanı: ilk 10'da az rakip varsa fırsat yüksek. */
function rakipPuani(rakipSayisi: number, alanAdiGucu: number | null): number {
  const yogunluk = arasinda(100 - rakipSayisi * 18, 0, 100);
  const guc = alanAdiGucu !== null && alanAdiGucu !== undefined ? alanAdiGucu : 40;
  return arasinda(yogunluk * 0.7 + guc * 0.3, 0, 100);
}

/** Pozisyona göre tıklama oranı — trafik tahmininde kullanılır. */
export function tiklamaOrani(pozisyon: number): number {
  const tablo = [0.278, 0.152, 0.11, 0.077, 0.056, 0.042, 0.032, 0.026, 0.022, 0.019];
  if (pozisyon <= 10) return tablo[pozisyon - 1];
  if (pozisyon <= 20) return 0.012;
  if (pozisyon <= 30) return 0.006;
  return 0.002;
}

export function firsatSkoru(
  girdi: FirsatGirdisi,
  agirliklar: FirsatAgirliklari = VARSAYILAN_FIRSAT_AGIRLIKLARI,
): FirsatSonucu {
  const alisveris = girdi.alisverisVar ?? false;

  const sinyaller = {
    hacim: hacimPuani(girdi.aramaHacmi),
    rekabet: rekabetPuani(girdi.zorluk, girdi.rekabet),
    mevcut_siralama: siralamaPuani(girdi.mevcutPozisyon),
    ticari_amac: amacPuani(girdi.amac, alisveris),
    serp_yapisi: serpPuani(girdi.serpOzellikSayisi ?? 0, alisveris),
    rakip_yogunlugu: rakipPuani(girdi.rakipSayisi ?? 0, girdi.alanAdiGucu ?? null),
  };

  const toplamAgirlik = Object.values(agirliklar).reduce((t, a) => t + a, 0) || 1;
  const agirlikliToplam = (Object.keys(sinyaller) as (keyof FirsatAgirliklari)[]).reduce(
    (t, k) => t + sinyaller[k] * agirliklar[k],
    0,
  );

  const skor = Math.round(arasinda(agirlikliToplam / toplamAgirlik, 0, 100));

  // Ulaşılabilir hedef pozisyon
  const mevcut = girdi.mevcutPozisyon;
  const hedefPozisyon = mevcut === null || mevcut === undefined
    ? 10
    : mevcut <= 3
      ? Math.max(1, mevcut - 1)
      : mevcut <= 10
        ? 3
        : mevcut <= 20
          ? 8
          : mevcut <= 50
            ? 15
            : 25;

  const hacim = girdi.aramaHacmi ?? 0;
  const mevcutTrafik = mevcut ? hacim * tiklamaOrani(mevcut) : 0;
  const hedefTrafik = hacim * tiklamaOrani(hedefPozisyon);
  const tahminiTrafik = Math.max(0, Math.round(hedefTrafik - mevcutTrafik));

  return { skor, sinyaller, tahminiTrafik, hedefPozisyon, gerekce: gerekceUret(skor, girdi, sinyaller) };
}

function gerekceUret(
  skor: number,
  girdi: FirsatGirdisi,
  sinyaller: Record<keyof FirsatAgirliklari, number>,
): string {
  const parcalar: string[] = [];

  if (girdi.mevcutPozisyon && girdi.mevcutPozisyon > 10 && girdi.mevcutPozisyon <= 20) {
    parcalar.push(`${girdi.mevcutPozisyon}. sıradasınız; ilk sayfaya çok yakınsınız`);
  } else if (girdi.mevcutPozisyon && girdi.mevcutPozisyon <= 10) {
    parcalar.push(`ilk sayfadasınız, üst sıralara çıkma alanı var`);
  } else if (!girdi.mevcutPozisyon) {
    parcalar.push("bu kelimede henüz sıralanmıyorsunuz");
  }

  if (sinyaller.rekabet >= 65) parcalar.push("rekabet düşük");
  if (girdi.amac === "islem" || girdi.amac === "ticari") parcalar.push("satın alma niyeti güçlü");
  if (girdi.alisverisVar) parcalar.push("Google Alışveriş alanı açık");

  if (!parcalar.length) {
    return skor >= 70
      ? "Arama hacmi ve rekabet dengesi bu kelimeyi öncelikli hale getiriyor."
      : "Bu kelime orta vadede değerlendirilebilir.";
  }

  const metin = parcalar.join(", ");
  return `${metin.charAt(0).toLocaleUpperCase("tr-TR")}${metin.slice(1)}.`;
}

/* ================================================================== */
/* 2. Teknik SEO skoru                                                */
/* ================================================================== */

export type TeknikKirilim = {
  tarama: number;
  indeksleme: number;
  meta: number;
  baslik: number;
  link: number;
  gorsel: number;
  schema: number;
  mimari: number;
};

export const TEKNIK_KATEGORI_ADI: Record<keyof TeknikKirilim, string> = {
  tarama: "Tarama",
  indeksleme: "İndeksleme",
  meta: "Meta veriler",
  baslik: "Başlık yapısı",
  link: "Link yapısı",
  gorsel: "Görseller",
  schema: "Schema",
  mimari: "Site mimarisi",
};

export type SayfaSinyali = {
  durumKodu: number | null;
  title: string | null;
  titleUzunluk: number | null;
  aciklama: string | null;
  aciklamaUzunluk: number | null;
  h1Sayisi: number;
  kelimeSayisi: number | null;
  icLink: number | null;
  gorselSayisi: number | null;
  altMetinsizGorsel: number;
  canonical: string | null;
  indekslenebilir: boolean | null;
  tiklamaDerinligi: number | null;
  yetimMi: boolean;
  schemaVarMi: boolean;
};

/** Sayfa listesinden kategori bazlı teknik skor üretir. */
export function teknikSkor(sayfalar: SayfaSinyali[]): { skor: number; kirilim: TeknikKirilim } {
  if (!sayfalar.length) {
    return {
      skor: 0,
      kirilim: { tarama: 0, indeksleme: 0, meta: 0, baslik: 0, link: 0, gorsel: 0, schema: 0, mimari: 0 },
    };
  }

  const n = sayfalar.length;
  const oran = (sayi: number) => arasinda((sayi / n) * 100, 0, 100);

  const saglikliDurum = sayfalar.filter((s) => s.durumKodu !== null && s.durumKodu >= 200 && s.durumKodu < 300).length;
  const indekslenebilir = sayfalar.filter((s) => s.indekslenebilir !== false).length;
  const canonicalli = sayfalar.filter((s) => Boolean(s.canonical)).length;

  const iyiTitle = sayfalar.filter(
    (s) => s.title && s.titleUzunluk !== null && s.titleUzunluk >= 25 && s.titleUzunluk <= 65,
  ).length;
  const iyiAciklama = sayfalar.filter(
    (s) => s.aciklama && s.aciklamaUzunluk !== null && s.aciklamaUzunluk >= 70 && s.aciklamaUzunluk <= 165,
  ).length;
  const tekH1 = sayfalar.filter((s) => s.h1Sayisi === 1).length;
  const yeterliIcerik = sayfalar.filter((s) => (s.kelimeSayisi ?? 0) >= 150).length;

  const icLinkli = sayfalar.filter((s) => (s.icLink ?? 0) >= 3).length;
  const yetimOlmayan = sayfalar.filter((s) => !s.yetimMi).length;

  const gorselliSayfalar = sayfalar.filter((s) => (s.gorselSayisi ?? 0) > 0);
  const altMetinli = gorselliSayfalar.filter((s) => s.altMetinsizGorsel === 0).length;

  const schemali = sayfalar.filter((s) => s.schemaVarMi).length;
  const sigDerinlik = sayfalar.filter((s) => (s.tiklamaDerinligi ?? 99) <= 3).length;

  const kirilim: TeknikKirilim = {
    tarama: Math.round(oran(saglikliDurum)),
    indeksleme: Math.round(oran(indekslenebilir) * 0.7 + oran(canonicalli) * 0.3),
    meta: Math.round(oran(iyiTitle) * 0.55 + oran(iyiAciklama) * 0.45),
    baslik: Math.round(oran(tekH1) * 0.6 + oran(yeterliIcerik) * 0.4),
    link: Math.round(oran(icLinkli) * 0.6 + oran(yetimOlmayan) * 0.4),
    gorsel: gorselliSayfalar.length
      ? Math.round(arasinda((altMetinli / gorselliSayfalar.length) * 100, 0, 100))
      : 100,
    schema: Math.round(oran(schemali)),
    mimari: Math.round(oran(sigDerinlik)),
  };

  // Kategori ağırlıkları: tarama ve indeksleme temel şart.
  const agirlik: Record<keyof TeknikKirilim, number> = {
    tarama: 20,
    indeksleme: 18,
    meta: 16,
    baslik: 12,
    link: 12,
    gorsel: 8,
    schema: 8,
    mimari: 6,
  };

  const toplamAgirlik = Object.values(agirlik).reduce((t, a) => t + a, 0);
  const skor = Math.round(
    (Object.keys(kirilim) as (keyof TeknikKirilim)[]).reduce((t, k) => t + kirilim[k] * agirlik[k], 0) /
      toplamAgirlik,
  );

  return { skor, kirilim };
}

/* ================================================================== */
/* 3. Ürün SEO skoru                                                  */
/* ================================================================== */

export type UrunSinyali = {
  ad: string | null;
  title: string | null;
  titleUzunluk: number | null;
  aciklamaUzunluk: number | null;
  metaAciklamaUzunluk: number | null;
  h1: string | null;
  gorselSayisi: number | null;
  altMetinsizGorsel: number;
  ozellikSayisi: number | null;
  marka: string | null;
  gtin: string | null;
  mpn: string | null;
  sku: string | null;
  fiyat: number | null;
  stokDurumu: string | null;
  yorumSayisi: number | null;
  urunSchemaVarMi: boolean;
  breadcrumbVarMi: boolean;
  canonical: string | null;
  icLink: number | null;
};

export type UrunKontrolu = {
  kod: string;
  ad: string;
  gecti: boolean;
  onem: Onem;
  aciklama: string;
  oneri: string;
};

/** Ürün sayfası için 18 maddelik kontrol listesi ve skor. */
export function urunSkoru(u: UrunSinyali): { skor: number; kontroller: UrunKontrolu[] } {
  const k: UrunKontrolu[] = [
    {
      kod: "urun_basligi",
      ad: "Ürün başlığı",
      gecti: Boolean(u.ad && u.ad.length >= 15),
      onem: "kritik",
      aciklama: "Ürün adı yeterince açıklayıcı değil.",
      oneri: "Marka, model ve ayırt edici özelliği içeren bir ürün adı kullanın.",
    },
    {
      kod: "seo_title",
      ad: "SEO başlığı",
      gecti: Boolean(u.titleUzunluk && u.titleUzunluk >= 25 && u.titleUzunluk <= 65),
      onem: "kritik",
      aciklama: "Sayfa başlığı 25-65 karakter aralığında olmalı.",
      oneri: "Hedef kelimeyi başa alın ve başlığı 60 karakter civarında tutun.",
    },
    {
      kod: "meta_aciklama",
      ad: "Meta açıklama",
      gecti: Boolean(u.metaAciklamaUzunluk && u.metaAciklamaUzunluk >= 70 && u.metaAciklamaUzunluk <= 165),
      onem: "uyari",
      aciklama: "Meta açıklama eksik ya da uygun uzunlukta değil.",
      oneri: "Ürünün farkını ve teslimat/garanti gibi satın alma gerekçesini yazın.",
    },
    {
      kod: "h1",
      ad: "H1 başlığı",
      gecti: Boolean(u.h1),
      onem: "kritik",
      aciklama: "Sayfada H1 başlığı bulunmuyor.",
      oneri: "Ürün adını H1 olarak işaretleyin.",
    },
    {
      kod: "aciklama",
      ad: "Ürün açıklaması",
      gecti: (u.aciklamaUzunluk ?? 0) >= 300,
      onem: "kritik",
      aciklama: "Ürün açıklaması çok kısa.",
      oneri: "En az 300 karakterlik, kullanım ve fayda odaklı açıklama ekleyin.",
    },
    {
      kod: "teknik_ozellik",
      ad: "Teknik özellikler",
      gecti: (u.ozellikSayisi ?? 0) >= 5,
      onem: "uyari",
      aciklama: "Teknik özellik tablosu yetersiz.",
      oneri: "En az 5 teknik özellik ekleyin; bu alan uzun kuyruk aramalarını besler.",
    },
    {
      kod: "gorsel",
      ad: "Görsel sayısı",
      gecti: (u.gorselSayisi ?? 0) >= 3,
      onem: "uyari",
      aciklama: "Ürün görseli sayısı az.",
      oneri: "Farklı açılardan en az 3 görsel kullanın.",
    },
    {
      kod: "alt_metin",
      ad: "Görsel alt metni",
      gecti: u.altMetinsizGorsel === 0,
      onem: "uyari",
      aciklama: "Bazı görsellerde alt metni eksik.",
      oneri: "Her görsele ürünü tanımlayan alt metni ekleyin.",
    },
    {
      kod: "urun_schema",
      ad: "Ürün schema",
      gecti: u.urunSchemaVarMi,
      onem: "kritik",
      aciklama: "Product yapısal verisi bulunamadı.",
      oneri: "Product schema ekleyin; zengin sonuç ve Alışveriş görünürlüğü için gereklidir.",
    },
    {
      kod: "fiyat",
      ad: "Fiyat verisi",
      gecti: u.fiyat !== null && u.fiyat > 0,
      onem: "kritik",
      aciklama: "Yapısal veride fiyat bilgisi yok.",
      oneri: "Schema içinde offers.price ve priceCurrency alanlarını doldurun.",
    },
    {
      kod: "stok",
      ad: "Stok durumu",
      gecti: Boolean(u.stokDurumu),
      onem: "uyari",
      aciklama: "Stok durumu yapısal veride belirtilmemiş.",
      oneri: "offers.availability alanını InStock/OutOfStock olarak işaretleyin.",
    },
    {
      kod: "marka",
      ad: "Marka",
      gecti: Boolean(u.marka),
      onem: "uyari",
      aciklama: "Marka bilgisi eksik.",
      oneri: "brand alanını doldurun; marka aramalarında eşleşmeyi artırır.",
    },
    {
      kod: "gtin",
      ad: "GTIN",
      gecti: Boolean(u.gtin),
      onem: "uyari",
      aciklama: "GTIN (barkod) bilgisi yok.",
      oneri: "GTIN ekleyin; Google Alışveriş eşleştirmesinin en güçlü sinyalidir.",
    },
    {
      kod: "mpn",
      ad: "MPN",
      gecti: Boolean(u.mpn),
      onem: "bilgi",
      aciklama: "Üretici parça numarası eksik.",
      oneri: "MPN alanını doldurun.",
    },
    {
      kod: "sku",
      ad: "SKU",
      gecti: Boolean(u.sku),
      onem: "bilgi",
      aciklama: "Stok kodu yapısal veride yok.",
      oneri: "SKU alanını ekleyin.",
    },
    {
      kod: "yorum",
      ad: "Ürün yorumları",
      gecti: (u.yorumSayisi ?? 0) > 0,
      onem: "uyari",
      aciklama: "Sayfada ürün yorumu bulunmuyor.",
      oneri: "Yorum toplayın ve AggregateRating olarak işaretleyin.",
    },
    {
      kod: "breadcrumb",
      ad: "Breadcrumb",
      gecti: u.breadcrumbVarMi,
      onem: "uyari",
      aciklama: "Breadcrumb yapısal verisi yok.",
      oneri: "BreadcrumbList ekleyin; kategori bağlamını Google'a iletir.",
    },
    {
      kod: "canonical",
      ad: "Canonical",
      gecti: Boolean(u.canonical),
      onem: "uyari",
      aciklama: "Canonical etiketi tanımlı değil.",
      oneri: "Varyant sayfalarında canonical ile asıl ürünü işaret edin.",
    },
    {
      kod: "ic_link",
      ad: "İç bağlantı",
      gecti: (u.icLink ?? 0) >= 3,
      onem: "bilgi",
      aciklama: "Sayfaya yeterli iç bağlantı yok.",
      oneri: "İlgili ürün ve kategori sayfalarından bu ürüne bağlantı verin.",
    },
  ];

  const agirlik: Record<Onem, number> = { kritik: 3, uyari: 2, bilgi: 1 };
  const toplam = k.reduce((t, c) => t + agirlik[c.onem], 0);
  const kazanilan = k.reduce((t, c) => t + (c.gecti ? agirlik[c.onem] : 0), 0);

  return { skor: Math.round((kazanilan / toplam) * 100), kontroller: k };
}

/* ================================================================== */
/* 4. Kategori SEO skoru                                              */
/* ================================================================== */

export type KategoriSinyali = {
  title: string | null;
  titleUzunluk: number | null;
  metaAciklamaUzunluk: number | null;
  h1: string | null;
  aciklamaUzunluk: number | null;
  urunSayisi: number | null;
  altKategoriSayisi: number | null;
  icLink: number | null;
  hedefKelime: string | null;
};

export function kategoriSkoru(k: KategoriSinyali): { skor: number; kontroller: UrunKontrolu[] } {
  const kontroller: UrunKontrolu[] = [
    {
      kod: "kategori_title",
      ad: "Kategori başlığı",
      gecti: Boolean(k.titleUzunluk && k.titleUzunluk >= 25 && k.titleUzunluk <= 65),
      onem: "kritik",
      aciklama: "Kategori başlığı uygun uzunlukta değil.",
      oneri: "\"Kategori adı + Modelleri ve Fiyatları\" kalıbı Türkçe e-ticarette iyi çalışır.",
    },
    {
      kod: "kategori_meta",
      ad: "Meta açıklama",
      gecti: Boolean(k.metaAciklamaUzunluk && k.metaAciklamaUzunluk >= 70),
      onem: "uyari",
      aciklama: "Meta açıklama eksik.",
      oneri: "Ürün çeşitliliği, fiyat aralığı ve kargo avantajını yazın.",
    },
    {
      kod: "kategori_h1",
      ad: "H1 başlığı",
      gecti: Boolean(k.h1),
      onem: "kritik",
      aciklama: "H1 bulunmuyor.",
      oneri: "Kategori adını H1 olarak işaretleyin.",
    },
    {
      kod: "kategori_aciklama",
      ad: "Kategori açıklaması",
      gecti: (k.aciklamaUzunluk ?? 0) >= 400,
      onem: "kritik",
      aciklama: "Kategori metni yetersiz.",
      oneri: "Seçim rehberi niteliğinde 400+ karakterlik özgün bir metin ekleyin.",
    },
    {
      kod: "urun_sayisi",
      ad: "Ürün derinliği",
      gecti: (k.urunSayisi ?? 0) >= 8,
      onem: "uyari",
      aciklama: "Kategoride az sayıda ürün var.",
      oneri: "Ürün sayısını artırın veya bu kategoriyi üst kategoriyle birleştirin.",
    },
    {
      kod: "alt_kategori",
      ad: "Alt kategoriler",
      gecti: (k.altKategoriSayisi ?? 0) >= 2,
      onem: "bilgi",
      aciklama: "Alt kategori bağlantısı yok.",
      oneri: "Alt kırılımlar ekleyerek uzun kuyruk aramalarını yakalayın.",
    },
    {
      kod: "kategori_ic_link",
      ad: "İç bağlantı",
      gecti: (k.icLink ?? 0) >= 10,
      onem: "uyari",
      aciklama: "Kategoriye yeterli iç bağlantı verilmemiş.",
      oneri: "Menü ve içerik sayfalarından bu kategoriye bağlantı verin.",
    },
    {
      kod: "hedef_kelime",
      ad: "Hedef kelime",
      gecti: Boolean(k.hedefKelime),
      onem: "uyari",
      aciklama: "Kategoriye atanmış hedef kelime yok.",
      oneri: "Kategoriye tek bir ana kelime atayın ve başlıkta kullanın.",
    },
  ];

  const agirlik: Record<Onem, number> = { kritik: 3, uyari: 2, bilgi: 1 };
  const toplam = kontroller.reduce((t, c) => t + agirlik[c.onem], 0);
  const kazanilan = kontroller.reduce((t, c) => t + (c.gecti ? agirlik[c.onem] : 0), 0);

  return { skor: Math.round((kazanilan / toplam) * 100), kontroller };
}

/* ================================================================== */
/* 5. Merchant sağlık skoru                                           */
/* ================================================================== */

export type MerchantSinyali = {
  gtin: boolean;
  mpn: boolean;
  marka: boolean;
  fiyat: boolean;
  stok: boolean;
  urunSchema: boolean;
  urunAdi: boolean;
  aciklama: boolean;
  alisverisGorunur: boolean;
};

export function merchantSkoru(m: MerchantSinyali): { skor: number; eksikler: string[] } {
  const alanlar: { anahtar: keyof MerchantSinyali; ad: string; agirlik: number }[] = [
    { anahtar: "gtin", ad: "GTIN", agirlik: 18 },
    { anahtar: "mpn", ad: "MPN", agirlik: 8 },
    { anahtar: "marka", ad: "Marka", agirlik: 12 },
    { anahtar: "fiyat", ad: "Fiyat", agirlik: 15 },
    { anahtar: "stok", ad: "Stok durumu", agirlik: 12 },
    { anahtar: "urunSchema", ad: "Ürün schema", agirlik: 15 },
    { anahtar: "urunAdi", ad: "Ürün adı", agirlik: 8 },
    { anahtar: "aciklama", ad: "Ürün açıklaması", agirlik: 7 },
    { anahtar: "alisverisGorunur", ad: "Alışveriş görünürlüğü", agirlik: 5 },
  ];

  const toplam = alanlar.reduce((t, a) => t + a.agirlik, 0);
  const kazanilan = alanlar.reduce((t, a) => t + (m[a.anahtar] ? a.agirlik : 0), 0);

  return {
    skor: Math.round((kazanilan / toplam) * 100),
    eksikler: alanlar.filter((a) => !m[a.anahtar]).map((a) => a.ad),
  };
}

/* ================================================================== */
/* 6. AI görünürlük skoru                                             */
/* ================================================================== */

export type AiSinyali = {
  /** Marka adının web genelinde bahsedilme sayısı. */
  markaBahsi: number;
  /** Marka bahsi sorgusu gerçekten yapılabildi mi? */
  markaOlculdu: boolean;
  /** Sitede taranmış sayfa sayısı — yapısal veri kapsaması bundan ölçülür. */
  toplamSayfa: number;
  /** Bahsedilen farklı alan adı sayısı. */
  bahsedenAlanAdi: number;
  /** Öne çıkan snippet / cevap kutusu kazanılan kelime sayısı. */
  snippetSayisi: number;
  /** "İnsanlar bunu da soruyor" içinde cevaplanan soru sayısı. */
  cevaplananSoru: number;
  /** Toplam takip edilen soru sayısı. */
  toplamSoru: number;
  /** İlk 10'da sıralanan kelime sayısı. */
  ilkOnKelime: number;
  /** Toplam sıralanan kelime. */
  toplamKelime: number;
  /** Alışveriş sonuçlarında görünen ürün sayısı. */
  alisverisGorunur: number;
  /** Toplam analiz edilen ürün. */
  toplamUrun: number;
  /** Schema kapsaması 0-100. */
  schemaKapsamasi: number;
  /** Geri bağlantı gücü 0-100. */
  otorite: number;
};

/**
 * AI görünürlüğü kırılımı.
 *
 * `null`, o sinyalin ÖLÇÜLEMEDİĞİNİ gösterir — sıfır olduğunu değil.
 * Aradaki fark kullanıcı için önemlidir: "ürünleriniz görünmüyor" ile
 * "bakacak ürün verisi yok" aynı şey değildir.
 */
export type AiKirilimi = {
  marka_gorunurlugu: number | null;
  icerik_guvenilirligi: number | null;
  konu_otoritesi: number | null;
  urun_gorunurlugu: number | null;
  soru_kapsamasi: number | null;
};

export function aiGorunurlukSkoru(s: AiSinyali): {
  skor: number;
  kirilim: AiKirilimi;
  olculenSinyal: number;
} {
  const markaGorunurlugu = arasinda(
    (Math.log10(Math.max(1, s.markaBahsi)) / 4) * 70 + arasinda(s.bahsedenAlanAdi * 3, 0, 30),
    0,
    100,
  );

  const icerikGuvenilirligi = arasinda(
    s.schemaKapsamasi * 0.6 + arasinda(s.snippetSayisi * 8, 0, 40),
    0,
    100,
  );

  const konuOtoritesi = arasinda(
    (s.toplamKelime > 0 ? (s.ilkOnKelime / s.toplamKelime) * 60 : 0) + s.otorite * 0.4,
    0,
    100,
  );

  const urunGorunurlugu = arasinda((s.alisverisGorunur / Math.max(1, s.toplamUrun)) * 100, 0, 100);

  const soruKapsamasi = arasinda((s.cevaplananSoru / Math.max(1, s.toplamSoru)) * 100, 0, 100);

  /*
   * Ölçülemeyen sinyal sıfır sayılmaz.
   *
   * Ürün verisi olmayan bir sitede "ürün görünürlüğü %0" demek, ürünlerin
   * görünmediğini iddia etmektir; oysa bakılacak ürün yoktur. Aynı şekilde
   * arama sonucu verisi yokken "soru kapsaması %0" ölçüm değil bilgisizlik
   * bildirir. Bu yüzden veri bulunmayan sinyaller null döner ve skor
   * yalnızca ölçülebilenlerin ağırlıklı ortalamasından hesaplanır.
   */
  const kirilim: AiKirilimi = {
    marka_gorunurlugu: s.markaOlculdu ? Math.round(markaGorunurlugu) : null,
    icerik_guvenilirligi: s.toplamSayfa > 0 ? Math.round(icerikGuvenilirligi) : null,
    konu_otoritesi: s.toplamKelime > 0 ? Math.round(konuOtoritesi) : null,
    urun_gorunurlugu: s.toplamUrun > 0 ? Math.round(urunGorunurlugu) : null,
    soru_kapsamasi: s.toplamSoru > 0 ? Math.round(soruKapsamasi) : null,
  };

  const agirlik: Record<keyof AiKirilimi, number> = {
    marka_gorunurlugu: 25,
    icerik_guvenilirligi: 25,
    konu_otoritesi: 20,
    urun_gorunurlugu: 20,
    soru_kapsamasi: 10,
  };

  const olculenler = (Object.keys(kirilim) as (keyof AiKirilimi)[]).filter(
    (k) => kirilim[k] !== null,
  );

  const toplamAgirlik = olculenler.reduce((t, k) => t + agirlik[k], 0);
  const skor =
    toplamAgirlik > 0
      ? Math.round(olculenler.reduce((t, k) => t + (kirilim[k] as number) * agirlik[k], 0) / toplamAgirlik)
      : 0;

  return { skor, kirilim, olculenSinyal: olculenler.length };
}

/* ================================================================== */
/* 7. Genel SEO skoru                                                 */
/* ================================================================== */

export type SeoAgirliklari = {
  teknik: number;
  icerik: number;
  keyword: number;
  otorite: number;
  eticaret: number;
  ai: number;
};

export const VARSAYILAN_SEO_AGIRLIKLARI: SeoAgirliklari = {
  teknik: 25,
  icerik: 20,
  keyword: 20,
  otorite: 15,
  eticaret: 15,
  ai: 5,
};

/**
 * Bileşen skorlarından genel SEO skorunu hesaplar.
 * Veri olmayan bileşenler ağırlık dağılımından çıkarılır; böylece
 * eksik veri skoru haksız yere düşürmez.
 */
export function genelSeoSkoru(
  bilesenler: Partial<Record<keyof SeoAgirliklari, number | null>>,
  agirliklar: SeoAgirliklari = VARSAYILAN_SEO_AGIRLIKLARI,
): number {
  let toplamAgirlik = 0;
  let toplam = 0;

  for (const anahtar of Object.keys(agirliklar) as (keyof SeoAgirliklari)[]) {
    const deger = bilesenler[anahtar];
    if (deger === null || deger === undefined) continue;
    toplam += deger * agirliklar[anahtar];
    toplamAgirlik += agirliklar[anahtar];
  }

  if (!toplamAgirlik) return 0;
  return Math.round(arasinda(toplam / toplamAgirlik, 0, 100));
}

/** Skor kümesini tek seferde üretir. */
export function projeSkorlari(bilesenler: {
  teknik?: number | null;
  icerik?: number | null;
  keyword?: number | null;
  otorite?: number | null;
  eticaret?: number | null;
  ai?: number | null;
  merchant?: number | null;
}, agirliklar?: SeoAgirliklari): ProjeSkorlari {
  return {
    ...bilesenler,
    seo: genelSeoSkoru(bilesenler, agirliklar),
  } as ProjeSkorlari;
}

/* ================================================================== */
/* 8. Etki ve öncelik türetme                                         */
/* ================================================================== */

/** Etkilenen sayfa sayısı ve trafik potansiyeline göre etki seviyesi. */
export function etkiSeviyesi(etkilenenSayfa: number, tahminiTrafik: number): Etki {
  const puan = etkilenenSayfa * 2 + tahminiTrafik / 50;
  if (puan >= 60) return "cok_yuksek";
  if (puan >= 25) return "yuksek";
  if (puan >= 8) return "orta";
  return "dusuk";
}
