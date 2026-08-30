import { describe, expect, it } from "vitest";

import { olculecekleriSec } from "@/lib/analiz/sayfa-hizi";

/**
 * Hız ölçümünde sayfa seçimi.
 *
 * Ölçüm sayfa başına ücretli ($0.005). Bir mağazada yüzlerce ürün sayfası
 * aynı şablonu kullandığı için rastgele 25 ürün sayfası ölçmek, aynı
 * cevabı 25 kez satın almak olur. Seçim bu yüzden şablon temsilcisi
 * mantığıyla yapılır: her sayfa türünden sırayla birer sayfa alınır.
 */

function sayfa(id: string, tur: string, skor: number | null = null) {
  return { id, url: `https://magazam.com/${id}`, page_type: tur, seo_score: skor };
}

describe("olculecekleriSec", () => {
  it("hakkı türler arasında paylaştırır", () => {
    // 100 ürün, 1 kategori, 1 anasayfa: ürünler hakkı tek başına yutmamalı.
    const sayfalar = [
      sayfa("ana", "anasayfa"),
      sayfa("kat", "kategori"),
      ...Array.from({ length: 100 }, (_, i) => sayfa(`u${i}`, "urun")),
    ];

    const secilen = olculecekleriSec(sayfalar, 6);
    const turler = secilen.map((s) => s.page_type);

    expect(secilen).toHaveLength(6);
    expect(turler).toContain("anasayfa");
    expect(turler).toContain("kategori");
    // Tek tür tüm hakkı almamalı.
    expect(turler.filter((t) => t === "urun").length).toBeLessThan(6);
  });

  it("her tür içinde en düşük SEO skorlusundan başlar", () => {
    /*
     * Skoru zaten yüksek sayfayı ölçmek yerine sorunlu olanı ölçmek daha
     * değerli: düzeltilecek şey oradadır.
     */
    const sayfalar = [
      sayfa("iyi", "urun", 90),
      sayfa("orta", "urun", 60),
      sayfa("kotu", "urun", 20),
    ];

    const secilen = olculecekleriSec(sayfalar, 2);

    expect(secilen.map((s) => s.id)).toEqual(["kotu", "orta"]);
  });

  it("limitten az sayfa varsa hepsini döndürür", () => {
    const sayfalar = [sayfa("a", "anasayfa"), sayfa("b", "urun")];

    expect(olculecekleriSec(sayfalar, 25)).toHaveLength(2);
  });

  it("limit sıfırsa hiç sayfa seçmez", () => {
    // Paketinde hakkı olmayan kullanıcı için ücret doğmamalı.
    expect(olculecekleriSec([sayfa("a", "urun")], 0)).toHaveLength(0);
  });

  it("aynı sayfayı iki kez seçmez", () => {
    const sayfalar = Array.from({ length: 5 }, (_, i) => sayfa(`u${i}`, "urun"));

    const secilen = olculecekleriSec(sayfalar, 10);
    const kimlikler = secilen.map((s) => s.id);

    expect(new Set(kimlikler).size).toBe(kimlikler.length);
  });

  it("bilinmeyen sayfa türünü kaybetmez", () => {
    // Tanımlı türlerden biri olmayan sayfa "diger" kovasına düşmeli.
    const secilen = olculecekleriSec([sayfa("x", "bilinmeyen")], 5);

    expect(secilen).toHaveLength(1);
    expect(secilen[0].id).toBe("x");
  });
});
