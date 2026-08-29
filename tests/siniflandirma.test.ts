import { describe, expect, it } from "vitest";

import { sayfaTuruBelirle, yapiylaKategorileriBul } from "@/lib/analiz/siniflandirma";

/**
 * Düz adresli sitelerde sınıflandırma.
 *
 * Yaşanan sorun: kullanıcı hem ürün hem kategori kalıbını "/" yapınca
 * her yol ürün kalıbına uydu, hiç kategori bulunamadı ve e-ticaret
 * ekranları boş kaldı.
 */

describe("adres kalıbı", () => {
  it("her yola uyan kalıbı yok sayar", () => {
    // "/" ayırt edici değildir; ürün kalıbı sanılırsa tüm site ürün olur.
    expect(sayfaTuruBelirle("https://a.com/vestel-buzdolabi", { urunKalibi: "/", kategoriKalibi: "/" })).toBe("diger");
  });

  it("gerçek kalıbı kullanır", () => {
    expect(sayfaTuruBelirle("https://a.com/urun/x", { urunKalibi: "/urun/", kategoriKalibi: "/kategori/" })).toBe("urun");
    expect(sayfaTuruBelirle("https://a.com/kategori/x", { urunKalibi: "/urun/", kategoriKalibi: "/kategori/" })).toBe("kategori");
  });

  it("iki kalıp aynıysa ikisini de kullanmaz", () => {
    expect(sayfaTuruBelirle("https://a.com/magaza/x", { urunKalibi: "/magaza/", kategoriKalibi: "/magaza/" })).toBe("diger");
  });

  it("ana sayfayı ve içeriği tanır", () => {
    expect(sayfaTuruBelirle("https://a.com/", { urunKalibi: "/", kategoriKalibi: "/" })).toBe("anasayfa");
    expect(sayfaTuruBelirle("https://a.com/blog/yazi", { urunKalibi: "/", kategoriKalibi: "/" })).toBe("icerik");
  });
});

describe("yapıyla kategori tespiti", () => {
  /** Gerçek gursoy.com dağılımı: kalıp 181 bağlantı, kategoriler 205. */
  const site = [
    ...Array.from({ length: 30 }, (_, i) => ({ url: `/urun-${i}`, icLink: 181, kelimeSayisi: 55 })),
    ...Array.from({ length: 6 }, (_, i) => ({ url: `/kategori-${i}`, icLink: 205, kelimeSayisi: 600 })),
  ];

  it("taban üstü bağlantı taşıyan sayfaları kategori sayar", () => {
    const kategoriler = yapiylaKategorileriBul(site);
    expect(kategoriler.size).toBe(6);
    expect(kategoriler.has("/kategori-0")).toBe(true);
    expect(kategoriler.has("/urun-0")).toBe(false);
  });

  it("tüm sayfalar aynıysa ayrım yapmaz", () => {
    const duz = Array.from({ length: 40 }, (_, i) => ({ url: `/s-${i}`, icLink: 181, kelimeSayisi: 100 }));
    expect(yapiylaKategorileriBul(duz).size).toBe(0);
  });

  it("çoğunluk eşiğin üstündeyse sinyali güvenilmez sayar", () => {
    const karisik = [
      ...Array.from({ length: 5 }, (_, i) => ({ url: `/az-${i}`, icLink: 100, kelimeSayisi: 50 })),
      ...Array.from({ length: 35 }, (_, i) => ({ url: `/cok-${i}`, icLink: 300, kelimeSayisi: 500 })),
    ];
    expect(yapiylaKategorileriBul(karisik).size).toBe(0);
  });

  it("örnek azsa tahmin yürütmez", () => {
    expect(yapiylaKategorileriBul([{ url: "/a", icLink: 500, kelimeSayisi: 900 }]).size).toBe(0);
  });
});
