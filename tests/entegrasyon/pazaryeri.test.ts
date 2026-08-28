import { describe, expect, it } from "vitest";

import { oyuncuTani, TUR_AGIRLIGI } from "@/config/pazaryerleri";
import { serpGetir } from "@/lib/dataforseo/serp";
import { ulkeKonumu } from "@/lib/dataforseo/locations";

/**
 * Pazaryeri radarının gerçek Türk arama sonuçlarıyla doğrulanması.
 *
 * DİKKAT: Sağlayıcıya gerçek istek atar (~$0,002). Önbellek sayesinde
 * tekrar çalıştırmalarda ücretsizdir.
 */

describe("oyuncu tanıma", () => {
  it("bilinen pazaryerlerini tanır", () => {
    expect(oyuncuTani("trendyol.com")?.ad).toBe("Trendyol");
    expect(oyuncuTani("hepsiburada.com")?.tur).toBe("pazaryeri");
    expect(oyuncuTani("cimri.com")?.tur).toBe("fiyat_karsilastirma");
    expect(oyuncuTani("teknosa.com")?.tur).toBe("perakende");
  });

  it("www ve alt alan adlarını çözer", () => {
    expect(oyuncuTani("www.trendyol.com")?.ad).toBe("Trendyol");
    expect(oyuncuTani("m.hepsiburada.com")?.ad).toBe("Hepsiburada");
  });

  it("bilinmeyen alan adı için null döner", () => {
    expect(oyuncuTani("benimmagazam.com.tr")).toBeNull();
    expect(oyuncuTani(null)).toBeNull();
  });

  it("pazaryeri en yüksek tehdit ağırlığına sahiptir", () => {
    expect(TUR_AGIRLIGI.pazaryeri).toBeGreaterThan(TUR_AGIRLIGI.perakende);
    expect(TUR_AGIRLIGI.fiyat_karsilastirma).toBeGreaterThan(TUR_AGIRLIGI.icerik);
  });
});

describe("gerçek SERP'te pazaryeri baskısı", () => {
  it("ticari bir aramada pazaryerlerini tespit eder", async () => {
    const konum = await ulkeKonumu("TR");

    const serp = await serpGetir({
      keyword: "bluetooth kulaklık",
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      bizimAlanAdi: "benimmagazam.com.tr",
      derinlik: 20,
    });

    const organikler = serp.ogeler.filter((o) => o.tur === "organic" && o.pozisyon !== null);
    expect(organikler.length).toBeGreaterThan(5);

    const taninanlar = organikler
      .map((o) => ({ pozisyon: o.pozisyon!, oyuncu: oyuncuTani(o.alan_adi) }))
      .filter((x) => x.oyuncu !== null);

    // Türkiye'de ticari bir aramada ilk 20'de mutlaka bilinen oyuncu vardır.
    expect(taninanlar.length).toBeGreaterThan(0);

    const pazaryerleri = taninanlar.filter((x) => x.oyuncu!.tur === "pazaryeri");
    console.log(
      `\n  "bluetooth kulaklık" ilk 20: ${taninanlar.length} bilinen oyuncu, ` +
        `${pazaryerleri.length} pazaryeri`,
    );
    for (const t of taninanlar.slice(0, 8)) {
      console.log(`    ${String(t.pozisyon).padStart(2)}. ${t.oyuncu!.ad} (${t.oyuncu!.tur})`);
    }

    expect(pazaryerleri.length).toBeGreaterThan(0);
  });
});
