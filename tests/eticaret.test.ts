import { describe, expect, it, vi } from "vitest";

import { oyuncuTani, TUR_AGIRLIGI, TURKIYE_OYUNCULARI } from "@/config/pazaryerleri";

vi.mock("@/lib/supabase/admin", () => ({
  yoneticiIstemcisi: () => {
    throw new Error("Testte veritabanına erişilmemeli.");
  },
}));

const { stoktaYokMu } = await import("@/lib/analiz/stok");

/**
 * E-ticarete özgü mantık.
 * Yanlış tanıma, kullanıcıya yanlış rakip veya yanlış kayıp göstermek demek.
 */

describe("pazaryeri tanıma", () => {
  it("büyük Türk pazaryerlerini tanır", () => {
    for (const alan of ["trendyol.com", "hepsiburada.com", "n11.com", "amazon.com.tr"]) {
      expect(oyuncuTani(alan)?.tur).toBe("pazaryeri");
    }
  });

  it("fiyat karşılaştırma sitelerini ayırır", () => {
    expect(oyuncuTani("cimri.com")?.tur).toBe("fiyat_karsilastirma");
    expect(oyuncuTani("akakce.com")?.tur).toBe("fiyat_karsilastirma");
  });

  it("perakende zincirlerini pazaryerinden ayırır", () => {
    expect(oyuncuTani("teknosa.com")?.tur).toBe("perakende");
    expect(oyuncuTani("migros.com.tr")?.tur).toBe("perakende");
  });

  it("www ön ekini ve alt alan adını çözer", () => {
    expect(oyuncuTani("www.trendyol.com")?.alanAdi).toBe("trendyol.com");
    expect(oyuncuTani("m.trendyol.com")?.alanAdi).toBe("trendyol.com");
    expect(oyuncuTani("TRENDYOL.COM")?.alanAdi).toBe("trendyol.com");
  });

  it("kullanıcının kendi sitesini oyuncu saymaz", () => {
    expect(oyuncuTani("benimmagazam.com.tr")).toBeNull();
    expect(oyuncuTani("gursoy.com")).toBeNull();
  });

  it("boş girdide çökmez", () => {
    expect(oyuncuTani(null)).toBeNull();
    expect(oyuncuTani("")).toBeNull();
  });

  it("tehdit ağırlıkları doğru sıralanır", () => {
    // Pazaryeri en tehlikeli: sizin ürününüzü komisyonla satıyor.
    expect(TUR_AGIRLIGI.pazaryeri).toBeGreaterThan(TUR_AGIRLIGI.fiyat_karsilastirma);
    expect(TUR_AGIRLIGI.fiyat_karsilastirma).toBeGreaterThan(TUR_AGIRLIGI.perakende);
    expect(TUR_AGIRLIGI.perakende).toBeGreaterThan(TUR_AGIRLIGI.icerik);
  });

  it("kayıtta yinelenen alan adı yok", () => {
    const alanlar = TURKIYE_OYUNCULARI.map((o) => o.alanAdi);
    expect(new Set(alanlar).size).toBe(alanlar.length);
  });
});

describe("stok durumu tespiti", () => {
  it("schema.org değerlerini tanır", () => {
    expect(stoktaYokMu("https://schema.org/OutOfStock")).toBe(true);
    expect(stoktaYokMu("OutOfStock")).toBe(true);
    expect(stoktaYokMu("out_of_stock")).toBe(true);
    expect(stoktaYokMu("SoldOut")).toBe(true);
    expect(stoktaYokMu("Discontinued")).toBe(true);
  });

  it("Türkçe değerleri tanır", () => {
    expect(stoktaYokMu("Tükendi")).toBe(true);
    expect(stoktaYokMu("stokta yok")).toBe(true);
  });

  it("stokta olan ürünü sorun saymaz", () => {
    expect(stoktaYokMu("https://schema.org/InStock")).toBe(false);
    expect(stoktaYokMu("InStock")).toBe(false);
    expect(stoktaYokMu("PreOrder")).toBe(false);
    expect(stoktaYokMu("stokta")).toBe(false);
  });

  it("bilinmeyen veya boş değerde sorun bildirmez", () => {
    // Emin olunamayan durumda yanlış alarm vermemek daha doğru.
    expect(stoktaYokMu(null)).toBe(false);
    expect(stoktaYokMu(undefined)).toBe(false);
    expect(stoktaYokMu("")).toBe(false);
    expect(stoktaYokMu("bilinmiyor")).toBe(false);
  });
});
