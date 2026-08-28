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

  if (ayarlar?.urunKalibi && yol.includes(ayarlar.urunKalibi)) return "urun";
  if (ayarlar?.kategoriKalibi && yol.includes(ayarlar.kategoriKalibi)) return "kategori";

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
