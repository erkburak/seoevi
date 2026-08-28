import { describe, expect, it } from "vitest";

import { onbellekAnahtari } from "@/lib/dataforseo/cache";
import { serpGetir } from "@/lib/dataforseo/serp";
import { ulkeKonumu } from "@/lib/dataforseo/locations";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Gerçek DataForSEO çağrısıyla önbellek tasarrufunu doğrular.
 *
 * DİKKAT: Bu dosya sağlayıcıya gerçek istek atar ve bakiye harcar
 * (tek SERP sorgusu ≈ $0,002). Yalnızca elle çalıştırılmalıdır:
 *
 *   npm run test:entegrasyon -- gercek-cagri
 *
 * Amaç: "ikinci istek bedava" iddiasının gerçekten doğru olduğunu
 * sağlayıcı faturası üzerinden kanıtlamak.
 */

const KELIME = "vestel buzdolabı";
const ALAN_ADI = "vatanbilgisayar.com";

describe("gerçek sağlayıcı çağrısı", () => {
  it("konum kimliği sağlayıcıdan okunur ve önbelleklenir", async () => {
    const konum = await ulkeKonumu("TR");

    expect(konum.location_code).toBeGreaterThan(0);
    expect(konum.location_name).toBeTruthy();

    // İkinci çağrı önbellekten gelmeli (30 gün süreli).
    const ikinci = await ulkeKonumu("TR");
    expect(ikinci.location_code).toBe(konum.location_code);
  });

  it("ilk SERP sorgusu ücretlidir, ikincisi bedava gelir", async () => {
    const konum = await ulkeKonumu("TR");
    const supabase = yoneticiIstemcisi();

    const parametreler = {
      keyword: KELIME,
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      derinlik: 20,
    };
    const anahtar = onbellekAnahtari("/serp/google/organic/live/advanced", parametreler);

    // Temiz başlangıç — bu sorgu için önbellek kaydı olmasın.
    await supabase.from("api_cache").delete().eq("cache_key", anahtar);

    /* --- 1. istek: sağlayıcıya gider --- */
    const ilk = await serpGetir({
      keyword: KELIME,
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      bizimAlanAdi: ALAN_ADI,
      derinlik: 20,
    });

    expect(ilk.onbellekten).toBe(false);
    expect(ilk.ogeler.length).toBeGreaterThan(0);

    // Gerçek maliyet kayda yazılmış olmalı.
    const { data: kayit } = await supabase
      .from("api_cache")
      .select("cost, hit_count")
      .eq("cache_key", anahtar)
      .maybeSingle();

    const maliyet = Number(kayit?.cost ?? 0);
    expect(maliyet).toBeGreaterThan(0);

    /* --- 2. istek: önbellekten --- */
    const ikinci = await serpGetir({
      keyword: KELIME,
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      bizimAlanAdi: ALAN_ADI,
      derinlik: 20,
    });

    expect(ikinci.onbellekten).toBe(true);
    expect(ikinci.ogeler.length).toBe(ilk.ogeler.length);

    console.log(
      `\n  Gerçek maliyet: $${maliyet} · ikinci istek: $0 · tasarruf %100`,
    );
  });

  it("farklı kullanıcının aynı sorgusu da bedava gelir", async () => {
    // Önbellek anahtarı kullanıcı içermez; bu paylaşımın kanıtı.
    const konum = await ulkeKonumu("TR");

    const baskaKullanici = await serpGetir({
      keyword: KELIME,
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      // Farklı alan adı = farklı kullanıcı, aynı arama sonucu.
      bizimAlanAdi: "baskabirmagaza.com",
      derinlik: 20,
    });

    expect(baskaKullanici.onbellekten).toBe(true);
  });

  it("'yenile' taze kaydı yeniden satın almaz", async () => {
    const konum = await ulkeKonumu("TR");

    const yenile = await serpGetir({
      keyword: KELIME,
      locationCode: konum.location_code,
      languageCode: "tr",
      device: "desktop",
      bizimAlanAdi: ALAN_ADI,
      derinlik: 20,
      tazelik: "yenile",
    });

    // 30 dakikadan genç olduğu için sağlayıcıya gidilmemeli.
    expect(yenile.onbellekten).toBe(true);
  });
});
