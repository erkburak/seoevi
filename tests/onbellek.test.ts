import { describe, expect, it, vi } from "vitest";

// Önbellek modülü Supabase yönetici istemcisini içe aktarır; testte ağ çağrısı yapılmaz.
vi.mock("@/lib/supabase/admin", () => ({
  yoneticiIstemcisi: () => {
    throw new Error("Testte veritabanına erişilmemeli.");
  },
}));

const { onbellekAnahtari } = await import("@/lib/dataforseo/cache");

/**
 * Önbellek anahtarı DataForSEO maliyetini doğrudan etkiler.
 * Aynı sorgunun aynı anahtarı üretmemesi, aynı verinin tekrar
 * satın alınması demektir.
 */
describe("onbellekAnahtari", () => {
  it("aynı girdi için aynı anahtarı üretir", () => {
    const a = onbellekAnahtari("/serp/google/organic", { keyword: "buzdolabı", locationCode: 2792 });
    const b = onbellekAnahtari("/serp/google/organic", { keyword: "buzdolabı", locationCode: 2792 });

    expect(a).toBe(b);
  });

  it("parametre sırasından etkilenmez", () => {
    const a = onbellekAnahtari("/serp", { keyword: "buzdolabı", device: "mobile", locationCode: 2792 });
    const b = onbellekAnahtari("/serp", { locationCode: 2792, keyword: "buzdolabı", device: "mobile" });

    expect(a).toBe(b);
  });

  it("farklı anahtar kelime için farklı anahtar üretir", () => {
    const a = onbellekAnahtari("/serp", { keyword: "buzdolabı" });
    const b = onbellekAnahtari("/serp", { keyword: "çamaşır makinesi" });

    expect(a).not.toBe(b);
  });

  it("farklı cihaz için farklı anahtar üretir", () => {
    const masaustu = onbellekAnahtari("/serp", { keyword: "buzdolabı", device: "desktop" });
    const mobil = onbellekAnahtari("/serp", { keyword: "buzdolabı", device: "mobile" });

    expect(masaustu).not.toBe(mobil);
  });

  it("farklı konum için farklı anahtar üretir", () => {
    const tr = onbellekAnahtari("/serp", { keyword: "buzdolabı", locationCode: 2792 });
    const de = onbellekAnahtari("/serp", { keyword: "buzdolabı", locationCode: 2276 });

    expect(tr).not.toBe(de);
  });

  it("farklı uç nokta için farklı anahtar üretir", () => {
    const serp = onbellekAnahtari("/serp/google/organic", { keyword: "buzdolabı" });
    const labs = onbellekAnahtari("/dataforseo_labs/google/ranked_keywords", { keyword: "buzdolabı" });

    expect(serp).not.toBe(labs);
  });

  it("uç nokta adını anahtarın başında tutar", () => {
    // Hata ayıklarken anahtarın hangi uç noktaya ait olduğu okunabilmeli.
    expect(onbellekAnahtari("/serp/google/organic", { a: 1 })).toMatch(/^\/serp\/google\/organic:/);
  });
});
