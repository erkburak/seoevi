import type { SayfaTuru } from "@/types/database";

/**
 * URL'den sayfa türünü tahmin eder.
 * Türkiye'deki yaygın e-ticaret altyapılarının kalıpları temel alınır;
 * proje ayarlarında özel kalıp tanımlanmışsa o önceliklidir.
 */

const URUN_KALIPLARI = [
  /\/urun\//i,
  /\/uruen\//i,
  /\/product\//i,
  /\/products\//i,
  /-p-\d+/i,
  /\/p\/\d+/i,
  /\/p-\d+/i,
  /pd\/\d+/i,
];

const KATEGORI_KALIPLARI = [
  /\/kategori\//i,
  /\/kategoriler\//i,
  /\/category\//i,
  /\/collections?\//i,
  /\/c\/\d+/i,
  /-c-\d+/i,
];

const ICERIK_KALIPLARI = [
  /\/blog\//i,
  /\/haber\//i,
  /\/makale\//i,
  /\/rehber\//i,
  /\/yazi\//i,
  /\/icerik\//i,
];

/**
 * Kalıp gerçekten ayırt edici mi?
 *
 * "/" gibi her yolda bulunan bir kalıp hiçbir şey söylemez; kabul
 * edilirse tüm site tek türe düşer.
 */
function ayirtEdiciKalip(kalip: string | null | undefined): string | null {
  const temiz = (kalip ?? "").trim();
  if (temiz.length < 2 || temiz === "/") return null;
  return temiz;
}

export function sayfaTuruBelirle(
  url: string,
  ayarlar?: { urunKalibi?: string | null; kategoriKalibi?: string | null },
): SayfaTuru {
  let yol: string;
  try {
    const u = new URL(url);
    yol = u.pathname;
    if (yol === "/" || yol === "") return "anasayfa";
  } catch {
    yol = url;
  }

  /*
   * Her yola uyan kalıp ayırt etmez.
   *
   * Düz adres yapısı kullanan sitelerde ("/vestel-buzdolabi") kullanıcı
   * her iki kalıbı da "/" olarak tanımlayabiliyor. Bu durumda ilk kontrol
   * her sayfayı ürün yapar ve kategori hiç bulunamaz; kalıp bilgi
   * taşımadığı için yok sayılır ve sınıflandırma yapı sinyallerine bırakılır.
   */
  const urunKalibi = ayirtEdiciKalip(ayarlar?.urunKalibi);
  const kategoriKalibi = ayirtEdiciKalip(ayarlar?.kategoriKalibi);

  if (urunKalibi && kategoriKalibi && urunKalibi === kategoriKalibi) {
    // İki kalıp aynıysa hangisinin hangisi olduğu söylenemez.
  } else {
    if (urunKalibi && yol.includes(urunKalibi)) return "urun";
    if (kategoriKalibi && yol.includes(kategoriKalibi)) return "kategori";
  }

  if (URUN_KALIPLARI.some((k) => k.test(yol))) return "urun";
  if (KATEGORI_KALIPLARI.some((k) => k.test(yol))) return "kategori";
  if (ICERIK_KALIPLARI.some((k) => k.test(yol))) return "icerik";

  return "diger";
}

/** Ürün/kategori kalıplarını taranan adreslerden otomatik çıkarır. */
export function kaliplariTahminEt(urller: string[]): {
  urunKalibi: string | null;
  kategoriKalibi: string | null;
} {
  const yollar = urller
    .map((u) => {
      try {
        return new URL(u).pathname;
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  const sayaclar = new Map<string, number>();
  for (const yol of yollar) {
    const ilkParca = yol.split("/").filter(Boolean)[0];
    if (ilkParca) sayaclar.set(`/${ilkParca}/`, (sayaclar.get(`/${ilkParca}/`) ?? 0) + 1);
  }

  const urunAdaylari = ["/urun/", "/product/", "/products/", "/p/"];
  const kategoriAdaylari = ["/kategori/", "/category/", "/collections/", "/collection/", "/c/"];

  const urunKalibi = urunAdaylari.find((a) => (sayaclar.get(a) ?? 0) >= 3) ?? null;
  const kategoriKalibi = kategoriAdaylari.find((a) => (sayaclar.get(a) ?? 0) >= 2) ?? null;

  return { urunKalibi, kategoriKalibi };
}


/* ------------------------------------------------------------------ */
/* Yapı sinyalleriyle sınıflandırma                                    */
/* ------------------------------------------------------------------ */

export type YapiSinyali = {
  url: string;
  icLink: number | null;
  kelimeSayisi: number | null;
};

/**
 * Adres yapısı ayırt etmiyorsa sayfa türünü içerik yapısından çıkarır.
 *
 * Düz adresli sitelerde ("/vestel-buzdolabi" hem kategori hem ürün
 * olabilir) adresten tür anlaşılmaz. Ama yapı anlaşılır: kategori sayfası
 * altındaki ürünleri listeler, bu yüzden sayfa kalıbının (menü, altbilgi)
 * getirdiği taban bağlantı sayısının belirgin biçimde ÜSTÜNDE bağlantı
 * taşır. Ürün sayfası ise yalnızca kalıbı taşır.
 *
 * Taban, sitenin kendi dağılımından alınır; sabit bir eşik farklı
 * temalarda yanlış sonuç verirdi.
 */
export function yapiylaKategorileriBul(sayfalar: YapiSinyali[]): Set<string> {
  const linkler = sayfalar
    .map((s) => s.icLink ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (linkler.length < 10) return new Set();

  // Onda birlik dilim, sayfa kalıbının getirdiği taban bağlantı sayısıdır.
  const taban = linkler[Math.floor(linkler.length * 0.1)];
  if (taban <= 0) return new Set();

  // Tabanın en az onda bir oranında üstü: listeleme yapan sayfalar.
  const esik = Math.max(taban + 3, Math.round(taban * 1.1));

  // Tüm sayfalar eşiğin üstündeyse ayrım yok demektir; hiçbiri seçilmez.
  const adaylar = sayfalar.filter((s) => (s.icLink ?? 0) >= esik);
  if (adaylar.length === 0 || adaylar.length > sayfalar.length * 0.6) return new Set();

  return new Set(adaylar.map((s) => s.url));
}
