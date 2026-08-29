import { describe, expect, it } from "vitest";

import { gorunurlukSkoru } from "@/lib/analiz/ai-gorunurluk";

/**
 * AI görünürlük skoru.
 *
 * Mutlak bahis sayısı tek başına anlamsızdır: beş bahis küçük bir
 * kategoride iyi, büyük bir kategoride görünmemek demektir. Skor bu
 * yüzden aynı cevaplarda gösterilen en güçlü siteye göre hesaplanır.
 */
describe("görünürlük skoru", () => {
  it("en güçlü siteyle eşitken tam puan verir", () => {
    const skor = gorunurlukSkoru(
      5,
      [
        { alanAdi: "www.gursoy.com", bahis: 5 },
        { alanAdi: "www.vestel.com.tr", bahis: 5 },
      ],
      "gursoy.com",
    );
    expect(skor).toBe(100);
  });

  it("rakip baskınsa oransal düşer", () => {
    const skor = gorunurlukSkoru(
      5,
      [
        { alanAdi: "gursoy.com", bahis: 5 },
        { alanAdi: "hepsiburada.com", bahis: 50 },
      ],
      "gursoy.com",
    );
    expect(skor).toBe(10);
  });

  it("hiç bahis yoksa sıfırdır", () => {
    expect(gorunurlukSkoru(0, [{ alanAdi: "x.com", bahis: 9 }], "gursoy.com")).toBe(0);
  });

  it("veri yoksa sıfırdır", () => {
    expect(gorunurlukSkoru(5, [], "gursoy.com")).toBe(0);
  });

  it("www öneki ve alt alan adı aynı site sayılır", () => {
    // Kendimizi rakip sanıp skoru düşürmemeliyiz.
    const skor = gorunurlukSkoru(
      8,
      [{ alanAdi: "www.gursoy.com", bahis: 8 }],
      "gursoy.com",
    );
    expect(skor).toBe(100);
  });

  it("skor yüzü aşmaz", () => {
    const skor = gorunurlukSkoru(
      100,
      [{ alanAdi: "gursoy.com", bahis: 100 }, { alanAdi: "a.com", bahis: 2 }],
      "gursoy.com",
    );
    expect(skor).toBeLessThanOrEqual(100);
  });
});
