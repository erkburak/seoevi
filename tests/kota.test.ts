import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  yoneticiIstemcisi: () => {
    throw new Error("Testte veritabanına erişilmemeli.");
  },
}));

const { turkiyeGunu, sifirlanmayaKalan } = await import("@/lib/araclar/kota");
const { geciciEpostaMi } = await import("@/lib/guvenlik");

/**
 * Kota günü Türkiye saatine bağlıdır; yanlış hesaplanırsa haklar
 * yanlış saatte sıfırlanır ve kullanıcılar haksız yere engellenir.
 */
describe("turkiyeGunu", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("YYYY-AA-GG biçiminde döner", () => {
    expect(turkiyeGunu()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("Türkiye saatine göre gün belirler (UTC değil)", () => {
    // 27 Ağustos 22:30 UTC = 28 Ağustos 01:30 İstanbul → gün İSTANBUL'a göre 28 olmalı.
    expect(turkiyeGunu(new Date("2026-08-27T22:30:00Z"))).toBe("2026-08-28");
  });

  it("İstanbul gece yarısından hemen önce günü değiştirmez", () => {
    // 27 Ağustos 20:59 UTC = 27 Ağustos 23:59 İstanbul
    expect(turkiyeGunu(new Date("2026-08-27T20:59:00Z"))).toBe("2026-08-27");
  });

  it("İstanbul gece yarısında yeni güne geçer", () => {
    // 27 Ağustos 21:00 UTC = 28 Ağustos 00:00 İstanbul
    expect(turkiyeGunu(new Date("2026-08-27T21:00:00Z"))).toBe("2026-08-28");
  });
});

describe("sifirlanmayaKalan", () => {
  it("gece yarısına kalan süreyi hesaplar", () => {
    // İstanbul'da 22:00 → 2 saat kaldı
    const k = sifirlanmayaKalan(new Date("2026-08-27T19:00:00Z"));
    expect(k.saat).toBe(2);
    expect(k.dakika).toBe(0);
  });

  it("gün başında neredeyse tam gün kalır", () => {
    // İstanbul'da 00:30 → 23 saat 30 dakika
    const k = sifirlanmayaKalan(new Date("2026-08-27T21:30:00Z"));
    expect(k.saat).toBe(23);
    expect(k.dakika).toBe(30);
  });

  it("saat ve dakika geçerli aralıkta kalır", () => {
    const k = sifirlanmayaKalan();
    expect(k.saat).toBeGreaterThanOrEqual(0);
    expect(k.saat).toBeLessThan(24);
    expect(k.dakika).toBeGreaterThanOrEqual(0);
    expect(k.dakika).toBeLessThan(60);
  });
});

describe("geciciEpostaMi", () => {
  it("bilinen geçici sağlayıcıları yakalar", () => {
    expect(geciciEpostaMi("birisi@mailinator.com")).toBe(true);
    expect(geciciEpostaMi("test@yopmail.com")).toBe(true);
    expect(geciciEpostaMi("x@10minutemail.com")).toBe(true);
  });

  it("büyük/küçük harf farkını yok sayar", () => {
    expect(geciciEpostaMi("Birisi@MAILINATOR.COM")).toBe(true);
  });

  it("gerçek sağlayıcıları engellemez", () => {
    expect(geciciEpostaMi("burak@gmail.com")).toBe(false);
    expect(geciciEpostaMi("info@magazam.com.tr")).toBe(false);
    expect(geciciEpostaMi("destek@seoevi.com.tr")).toBe(false);
  });

  it("bozuk girdide çökmez", () => {
    expect(geciciEpostaMi("eposta-degil")).toBe(false);
    expect(geciciEpostaMi("")).toBe(false);
  });
});
