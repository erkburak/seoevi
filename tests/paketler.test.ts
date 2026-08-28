import { describe, expect, it, vi } from "vitest";

// Paket modülü Supabase yönetici istemcisini içe aktarır; testte ağa çıkılmaz.
vi.mock("@/lib/supabase/admin", () => ({
  yoneticiIstemcisi: () => {
    throw new Error("Testte veritabanına erişilmemeli.");
  },
}));

const { limitMetni, SINIRSIZ_ESIGI, LIMIT_ADLARI, METRIK_LIMITI } = await import("@/lib/plans");

/**
 * Limit gösterimi kullanıcının ne satın aldığını anlamasını sağlar.
 * Yanlış gösterim doğrudan bir ticari yanlış anlamaya yol açar.
 */
describe("limitMetni", () => {
  it("sayıyı Türkçe biçimde gösterir", () => {
    expect(limitMetni(1500)).toBe("1.500");
  });

  it("eşiğin üzerindeki değeri sınırsız sayar", () => {
    expect(limitMetni(SINIRSIZ_ESIGI)).toBe("Sınırsız");
    expect(limitMetni(SINIRSIZ_ESIGI + 1)).toBe("Sınırsız");
  });

  it("eşiğin hemen altını sayı olarak gösterir", () => {
    expect(limitMetni(SINIRSIZ_ESIGI - 1)).not.toBe("Sınırsız");
  });

  it("mantıksal limitleri dahil/yok olarak gösterir", () => {
    expect(limitMetni(true)).toBe("Dahil");
    expect(limitMetni(false)).toBe("Yok");
  });

  it("sıfırı sınırsız saymaz", () => {
    expect(limitMetni(0)).toBe("0");
  });
});

describe("limit tanımları", () => {
  it("her limitin Türkçe bir adı vardır", () => {
    for (const [anahtar, ad] of Object.entries(LIMIT_ADLARI)) {
      expect(ad.length, `${anahtar} için ad tanımsız`).toBeGreaterThan(0);
    }
  });

  it("her kullanım metriği bir plan limitine bağlıdır", () => {
    for (const [metrik, limit] of Object.entries(METRIK_LIMITI)) {
      expect(LIMIT_ADLARI[limit], `${metrik} geçersiz limite bağlı`).toBeDefined();
    }
  });
});
