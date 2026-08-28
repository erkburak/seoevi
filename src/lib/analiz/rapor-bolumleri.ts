/**
 * Rapor bölümlerinin tanımları.
 *
 * Bu modül bilinçli olarak `server-only` değildir: bölüm listesi hem rapor
 * üretiminde (sunucu) hem de bölüm seçme formunda (istemci) kullanılır.
 * Sunucuya özel mantık `rapor.ts` içinde kalır.
 */

export const RAPOR_BOLUMLERI = [
  "genel",
  "teknik",
  "kelime",
  "rakip",
  "eticaret",
  "backlink",
  "icerik",
  "ai",
  "aksiyon",
] as const;

export type RaporBolumu = (typeof RAPOR_BOLUMLERI)[number];

export const BOLUM_ADI: Record<RaporBolumu, string> = {
  genel: "Genel skor",
  teknik: "Teknik SEO",
  kelime: "Anahtar kelimeler",
  rakip: "Rakipler",
  eticaret: "E-ticaret SEO",
  backlink: "Geri bağlantılar",
  icerik: "İçerik",
  ai: "AI görünürlüğü",
  aksiyon: "Aksiyonlar",
};

export const BOLUM_ACIKLAMASI: Record<RaporBolumu, string> = {
  genel: "Genel SEO skoru ve temel istatistikler",
  teknik: "Tarama sonuçları ve açık teknik sorunlar",
  kelime: "Sıralamalar, yükselenler ve düşenler",
  rakip: "Rakip alan adları ve karşılaştırma",
  eticaret: "Ürün ve kategori SEO skorları",
  backlink: "Geri bağlantı ve referans alan adı özeti",
  icerik: "İçerik analizleri ve açık fırsatlar",
  ai: "Yapay zekâ aramalarındaki görünürlük",
  aksiyon: "Öncelikli yapılacaklar listesi",
};
