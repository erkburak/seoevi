/**
 * Ana sayfadaki ürün önizlemelerinde kullanılan ÖRNEK verilerdir.
 * Gerçek kullanıcı verisi değildir ve arayüzde "Örnek proje" etiketiyle gösterilir.
 */

export const ORNEK_PROJE = {
  ad: "ornekmagaza.com",
  skorlar: { seo: 68, teknik: 74, icerik: 61, keyword: 66, otorite: 52, eticaret: 71, ai: 42 },
  metrikler: {
    siralanan_kelime: 1284,
    tahmini_trafik: 18400,
    kritik_sorun: 14,
    merchant: 63,
  },
} as const;

export const ORNEK_KELIMELER = [
  { keyword: "no frost buzdolabı", hacim: 8100, pozisyon: 18, degisim: 4, zorluk: 42, amac: "Ticari", firsat: 91 },
  { keyword: "ankastre fırın fiyatları", hacim: 5400, pozisyon: 12, degisim: 2, zorluk: 38, amac: "İşlem", firsat: 87 },
  { keyword: "çamaşır makinesi 9 kg", hacim: 3600, pozisyon: 24, degisim: -3, zorluk: 45, amac: "Ticari", firsat: 78 },
  { keyword: "bulaşık makinesi kurutma", hacim: 2900, pozisyon: null, degisim: 0, zorluk: 31, amac: "Bilgi", firsat: 74 },
  { keyword: "mini fırın tavsiye", hacim: 1900, pozisyon: 31, degisim: 6, zorluk: 27, amac: "Ticari", firsat: 69 },
] as const;

export const ORNEK_AKSIYONLAR = [
  {
    oncelik: "kritik" as const,
    baslik: "14 ürün sayfasında başlık etiketi sorunu",
    aciklama: "6 tanesi yüksek trafik potansiyeline sahip kategorilerde.",
    etki: "Yüksek",
    zorluk: "Kolay",
  },
  {
    oncelik: "yuksek" as const,
    baslik: "8 kategori sayfasında içerik fırsatı",
    aciklama: "Rakipler bu kategorilerde ortalama 3 kat daha derin içerik kullanıyor.",
    etki: "Yüksek",
    zorluk: "Orta",
  },
  {
    oncelik: "orta" as const,
    baslik: "23 kelime 11-30 arasında sıralanıyor",
    aciklama: "İlk sayfaya taşınabilecek kelimeler; küçük iyileştirmeler yeterli.",
    etki: "Çok yüksek",
    zorluk: "Orta",
  },
  {
    oncelik: "dusuk" as const,
    baslik: "17 iç bağlantı fırsatı",
    aciklama: "Yüksek otoriteli sayfalardan hedef kategorilere bağlantı verilebilir.",
    etki: "Orta",
    zorluk: "Kolay",
  },
] as const;

export const ORNEK_RAKIP = {
  alan_adi: "rakipmagaza.com",
  toplam_firsat: 183,
  kirilim: [
    { etiket: "Düşük rekabetli kelime", adet: 42 },
    { etiket: "Ticari kelime", adet: 61 },
    { etiket: "Ürün kelimesi", adet: 37 },
    { etiket: "Kategori kelimesi", adet: 24 },
    { etiket: "İçerik fırsatı", adet: 19 },
  ],
} as const;

export const ORNEK_MERCHANT = {
  saglik: 63,
  eksikler: [
    { alan: "GTIN", oran: 38 },
    { alan: "Marka", oran: 12 },
    { alan: "Stok durumu", oran: 21 },
    { alan: "Ürün schema", oran: 9 },
  ],
} as const;

export const ORNEK_AI = {
  skor: 42,
  kirilim: [
    { etiket: "Marka görünürlüğü", deger: 51 },
    { etiket: "İçerik güvenilirliği", deger: 46 },
    { etiket: "Konu otoritesi", deger: 38 },
    { etiket: "Ürün görünürlüğü", deger: 34 },
    { etiket: "Soru kapsama oranı", deger: 29 },
  ],
} as const;
