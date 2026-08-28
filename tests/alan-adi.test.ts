import { describe, expect, it } from "vitest";

import { alanAdiNormalize, slugify, urlYolu, alanAdiCikar, kirp } from "@/lib/utils";

/**
 * Alan adı normalizasyonu, proje oluşturmanın giriş kapısıdır.
 * Buradaki bir hata yanlış alan adının analiz edilmesine yol açar.
 */
describe("alanAdiNormalize", () => {
  it("protokolü tamamlar", () => {
    const s = alanAdiNormalize("magazam.com");
    expect(s.gecerli).toBe(true);
    if (s.gecerli) {
      expect(s.domain).toBe("magazam.com");
      expect(s.url).toBe("https://magazam.com");
    }
  });

  it("www ön ekini kaldırır", () => {
    const s = alanAdiNormalize("https://www.magazam.com");
    expect(s.gecerli && s.domain).toBe("magazam.com");
  });

  it("sondaki eğik çizgiyi ve yolu temizler", () => {
    const s = alanAdiNormalize("https://magazam.com/urunler/");
    expect(s.gecerli && s.url).toBe("https://magazam.com");
  });

  it("büyük harfleri küçültür", () => {
    const s = alanAdiNormalize("HTTPS://MAGAZAM.COM");
    expect(s.gecerli && s.domain).toBe("magazam.com");
  });

  it("baştaki ve sondaki boşlukları yok sayar", () => {
    const s = alanAdiNormalize("  magazam.com  ");
    expect(s.gecerli && s.domain).toBe("magazam.com");
  });

  it("alt alan adını korur", () => {
    const s = alanAdiNormalize("shop.magazam.com.tr");
    expect(s.gecerli && s.domain).toBe("shop.magazam.com.tr");
  });

  it("localhost adresini geliştirme için kabul eder", () => {
    expect(alanAdiNormalize("http://localhost:3000").gecerli).toBe(true);
  });

  it("boş girdiyi reddeder", () => {
    const s = alanAdiNormalize("");
    expect(s.gecerli).toBe(false);
    if (!s.gecerli) expect(s.hata).toContain("boş olamaz");
  });

  it("uzantısız girdiyi reddeder", () => {
    expect(alanAdiNormalize("magazam").gecerli).toBe(false);
  });

  it("boşluk içeren girdiyi reddeder", () => {
    expect(alanAdiNormalize("iki kelime").gecerli).toBe(false);
  });
});

describe("slugify", () => {
  it("Türkçe karakterleri sadeleştirir", () => {
    expect(slugify("İçerik Analizi")).toBe("icerik-analizi");
    expect(slugify("Ürün Şğüöç")).toBe("urun-sguoc");
  });

  it("art arda gelen ayırıcıları teke indirir", () => {
    expect(slugify("Vestel   Buzdolabı!!!")).toBe("vestel-buzdolabi");
  });

  it("baştaki ve sondaki tireleri kırpar", () => {
    expect(slugify("  -test-  ")).toBe("test");
  });
});

describe("urlYolu ve alanAdiCikar", () => {
  it("yalnızca yolu döndürür", () => {
    expect(urlYolu("https://magazam.com/urun/abc")).toBe("/urun/abc");
  });

  it("kök adres için eğik çizgi döndürür", () => {
    expect(urlYolu("https://magazam.com")).toBe("/");
  });

  it("boş değer için tire döndürür", () => {
    expect(urlYolu(null)).toBe("—");
  });

  it("alan adını www olmadan çıkarır", () => {
    expect(alanAdiCikar("https://www.rakip.com/sayfa")).toBe("rakip.com");
  });
});

describe("kirp", () => {
  it("sınırın altındaki metni değiştirmez", () => {
    expect(kirp("kısa", 10)).toBe("kısa");
  });

  it("uzun metni üç nokta ile kısaltır", () => {
    expect(kirp("abcdefghij", 5)).toBe("abcd…");
  });
});
