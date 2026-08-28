import { describe, expect, it } from "vitest";

import {
  firsatSkoru,
  genelSeoSkoru,
  tiklamaOrani,
  urunSkoru,
  VARSAYILAN_SEO_AGIRLIKLARI,
} from "@/lib/scoring";

/**
 * Skorlar kullanıcının hangi işe öncelik vereceğini belirler.
 * Yanlış bir skor, yanlış işe zaman harcanmasına yol açar.
 */

describe("genelSeoSkoru", () => {
  it("tüm bileşenler tamsa ağırlıklı ortalamayı verir", () => {
    expect(genelSeoSkoru({ teknik: 100, icerik: 100, keyword: 100, otorite: 100, eticaret: 100, ai: 100 })).toBe(100);
    expect(genelSeoSkoru({ teknik: 0, icerik: 0, keyword: 0, otorite: 0, eticaret: 0, ai: 0 })).toBe(0);
  });

  it("eksik bileşenleri ağırlık dağılımından çıkarır", () => {
    // Yalnızca teknik verisi varsa skor teknik skoruna eşit olmalı;
    // eksik veri skoru haksız yere düşürmemeli.
    expect(genelSeoSkoru({ teknik: 80 })).toBe(80);
  });

  it("hiç veri yoksa sıfır döndürür", () => {
    expect(genelSeoSkoru({})).toBe(0);
  });

  it("ağırlıkların yapılandırılabilir olduğunu doğrular", () => {
    const varsayilan = genelSeoSkoru({ teknik: 100, ai: 0 });
    const aiAgirlikli = genelSeoSkoru({ teknik: 100, ai: 0 }, { ...VARSAYILAN_SEO_AGIRLIKLARI, ai: 100 });

    // AI ağırlığı arttığında sıfır olan AI skoru genel skoru daha çok düşürmeli.
    expect(aiAgirlikli).toBeLessThan(varsayilan);
  });

  it("skoru 0-100 aralığında tutar", () => {
    const skor = genelSeoSkoru({ teknik: 150, icerik: -20 });
    expect(skor).toBeGreaterThanOrEqual(0);
    expect(skor).toBeLessThanOrEqual(100);
  });
});

describe("tiklamaOrani", () => {
  it("ilk sıra en yüksek orana sahiptir", () => {
    expect(tiklamaOrani(1)).toBeGreaterThan(tiklamaOrani(2));
    expect(tiklamaOrani(2)).toBeGreaterThan(tiklamaOrani(10));
  });

  it("sıra düştükçe oran azalır", () => {
    expect(tiklamaOrani(15)).toBeGreaterThan(tiklamaOrani(25));
    expect(tiklamaOrani(25)).toBeGreaterThan(tiklamaOrani(60));
  });
});

describe("firsatSkoru", () => {
  it("skoru 0-100 aralığında üretir", () => {
    const s = firsatSkoru({
      aramaHacmi: 8100,
      zorluk: 42,
      rekabet: 0.5,
      mevcutPozisyon: 18,
      amac: "ticari",
    });

    expect(s.skor).toBeGreaterThanOrEqual(0);
    expect(s.skor).toBeLessThanOrEqual(100);
  });

  it("ilk sayfaya yakın kelimeye daha yüksek puan verir", () => {
    const ortak = { aramaHacmi: 5000, zorluk: 40, rekabet: 0.4, amac: "ticari" as const };

    const yakin = firsatSkoru({ ...ortak, mevcutPozisyon: 12 });
    const uzak = firsatSkoru({ ...ortak, mevcutPozisyon: 85 });

    expect(yakin.skor).toBeGreaterThan(uzak.skor);
  });

  it("düşük rekabeti fırsat olarak değerlendirir", () => {
    const ortak = { aramaHacmi: 5000, mevcutPozisyon: 15, amac: "ticari" as const };

    const kolay = firsatSkoru({ ...ortak, zorluk: 10, rekabet: 0.1 });
    const zor = firsatSkoru({ ...ortak, zorluk: 90, rekabet: 0.95 });

    expect(kolay.skor).toBeGreaterThan(zor.skor);
  });

  it("11-20 arası kelimeler için gerekçe üretir", () => {
    const s = firsatSkoru({
      aramaHacmi: 3000,
      zorluk: 30,
      rekabet: 0.3,
      mevcutPozisyon: 14,
      amac: "ticari",
    });

    expect(s.gerekce).toContain("ilk sayfaya çok yakınsınız");
  });

  it("hedef pozisyonu mevcut sıradan daha iyi belirler", () => {
    const s = firsatSkoru({ aramaHacmi: 1000, zorluk: 35, rekabet: 0.3, mevcutPozisyon: 18, amac: "bilgi" });
    expect(s.hedefPozisyon).toBeLessThan(18);
  });

  it("sıralanmayan kelime için tahmini trafiği pozitif hesaplar", () => {
    const s = firsatSkoru({ aramaHacmi: 10000, zorluk: 30, rekabet: 0.3, mevcutPozisyon: null, amac: "ticari" });
    expect(s.tahminiTrafik).toBeGreaterThan(0);
  });
});

describe("urunSkoru", () => {
  it("eksiksiz ürün yüksek skor alır", () => {
    const { skor } = urunSkoru({
      ad: "Vestel No Frost Buzdolabı",
      title: "Vestel No Frost Buzdolabı Modelleri ve Fiyatları",
      titleUzunluk: 48,
      metaAciklamaUzunluk: 140,
      h1: "Vestel No Frost Buzdolabı",
      aciklamaUzunluk: 900,
      gorselSayisi: 6,
      altMetinsizGorsel: 0,
      urunSchemaVarMi: true,
      breadcrumbVarMi: true,
      fiyat: 24999,
      stokDurumu: "InStock",
      marka: "Vestel",
      gtin: "8690000000000",
      mpn: "NF-480",
      sku: "VST-480",
      yorumSayisi: 42,
      ozellikSayisi: 18,
      icLink: 12,
      canonical: "https://magazam.com/urun/vestel-no-frost",
    });

    expect(skor).toBeGreaterThan(80);
  });

  it("eksik ürün düşük skor alır ve eksikleri raporlar", () => {
    const { skor, kontroller } = urunSkoru({
      ad: null,
      title: null,
      titleUzunluk: null,
      metaAciklamaUzunluk: null,
      h1: null,
      aciklamaUzunluk: 0,
      gorselSayisi: 0,
      altMetinsizGorsel: 0,
      urunSchemaVarMi: false,
      breadcrumbVarMi: false,
      fiyat: null,
      stokDurumu: null,
      marka: null,
      gtin: null,
      mpn: null,
      sku: null,
      yorumSayisi: 0,
      ozellikSayisi: 0,
      icLink: 0,
      canonical: null,
    });

    expect(skor).toBeLessThan(40);
    expect(kontroller.some((k) => !k.gecti)).toBe(true);
  });
});
