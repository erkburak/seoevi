import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { onbellekAnahtari, onbellekli } from "@/lib/dataforseo/cache";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Önbellek katmanının canlı veritabanına karşı davranışı.
 *
 * Sağlayıcıya gidilmez; üretici fonksiyon taklit edilerek kaç kez
 * çağrıldığı sayılır. Bu testler doğrudan para tasarrufunu doğrular:
 * üretici beklenenden fazla çağrılırsa fazladan ödeme yapılıyor demektir.
 *
 * Çalıştırma: npm run test:entegrasyon
 */

const UC = "/test/onbellek";
const PARAMETRELER = { kelime: "deneme", konum: 2792 };
const ANAHTAR = onbellekAnahtari(UC, PARAMETRELER);

function sayacliUretici() {
  const durum = { cagri: 0 };
  const uretici = async () => {
    durum.cagri++;
    await new Promise((r) => setTimeout(r, 80));
    return { deger: `sonuc-${durum.cagri}` };
  };
  return { durum, uretici };
}

async function kaydiSil() {
  await yoneticiIstemcisi().from("api_cache").delete().eq("cache_key", ANAHTAR);
}

beforeEach(kaydiSil);
afterAll(kaydiSil);

describe("önbellek okuma", () => {
  it("ilk istek sağlayıcıya gider, ikincisi önbellekten gelir", async () => {
    const { durum, uretici } = sayacliUretici();

    const ilk = await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    expect(ilk.onbellekten).toBe(false);
    expect(durum.cagri).toBe(1);

    const ikinci = await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    expect(ikinci.onbellekten).toBe(true);
    expect(durum.cagri).toBe(1); // sağlayıcıya tekrar gidilmedi
    expect(ikinci.veri).toEqual(ilk.veri);
  });

  it("parametre sırası değişse de aynı kaydı bulur", async () => {
    const { durum, uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: { kelime: "deneme", konum: 2792 }, grup: "serp" }, uretici);
    const ters = await onbellekli(
      { endpoint: UC, parametreler: { konum: 2792, kelime: "deneme" }, grup: "serp" },
      uretici,
    );

    expect(ters.onbellekten).toBe(true);
    expect(durum.cagri).toBe(1);
  });

  it("önbellekten gelen istek maliyet üretmez", async () => {
    const { uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    const ikinci = await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);

    expect(ikinci.maliyet).toBe(0);
  });

  it("süresi dolmuş kayıt yenilenir", async () => {
    const { durum, uretici } = sayacliUretici();
    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);

    await yoneticiIstemcisi()
      .from("api_cache")
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq("cache_key", ANAHTAR);

    const sonra = await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    expect(sonra.onbellekten).toBe(false);
    expect(durum.cagri).toBe(2);
  });
});

describe("tazelik politikası", () => {
  it("'yenile' taze kaydı yeniden satın almaz", async () => {
    // Kullanıcının arka arkaya 'Yenile' tıklamasının maliyet doğurmaması gerekir.
    const { durum, uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    const yenile = await onbellekli(
      { endpoint: UC, parametreler: PARAMETRELER, grup: "serp", tazelik: "yenile" },
      uretici,
    );

    expect(yenile.onbellekten).toBe(true);
    expect(durum.cagri).toBe(1);
  });

  it("'yenile' asgari yaşı geçmiş kaydı tazeler", async () => {
    const { durum, uretici } = sayacliUretici();
    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);

    // serp grubunun asgari yaşı 30 dakika; kaydı 1 saat eskitiyoruz.
    await yoneticiIstemcisi()
      .from("api_cache")
      .update({ created_at: new Date(Date.now() - 3_600_000).toISOString() })
      .eq("cache_key", ANAHTAR);

    const yenile = await onbellekli(
      { endpoint: UC, parametreler: PARAMETRELER, grup: "serp", tazelik: "yenile" },
      uretici,
    );

    expect(yenile.onbellekten).toBe(false);
    expect(durum.cagri).toBe(2);
  });

  it("'zorla' önbelleği her koşulda atlar", async () => {
    const { durum, uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    const zorla = await onbellekli(
      { endpoint: UC, parametreler: PARAMETRELER, grup: "serp", tazelik: "zorla" },
      uretici,
    );

    expect(zorla.onbellekten).toBe(false);
    expect(durum.cagri).toBe(2);
  });

  it("eski zorla:true bayrağı 'yenile' gibi davranır", async () => {
    // Geriye dönük uyumluluk: körü körüne atlama yapılmamalı.
    const { durum, uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    const eski = await onbellekli(
      { endpoint: UC, parametreler: PARAMETRELER, grup: "serp", zorla: true },
      uretici,
    );

    expect(eski.onbellekten).toBe(true);
    expect(durum.cagri).toBe(1);
  });
});

describe("uçuştaki istekleri birleştirme", () => {
  it("eşzamanlı özdeş istekler tek sağlayıcı çağrısına iner", async () => {
    // Aynı popüler kelimeyi aynı anda soran kullanıcılar bir kez ödetmeli.
    const { durum, uretici } = sayacliUretici();

    const sonuclar = await Promise.all(
      Array.from({ length: 5 }, () =>
        onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici),
      ),
    );

    expect(durum.cagri).toBe(1);
    expect(sonuclar.filter((s) => !s.onbellekten)).toHaveLength(1);
    expect(sonuclar.filter((s) => s.onbellekten)).toHaveLength(4);

    // Hepsi aynı veriyi almalı.
    for (const s of sonuclar) expect(s.veri).toEqual(sonuclar[0].veri);
  });

  it("farklı parametreler ayrı çağrı üretir", async () => {
    const { durum, uretici } = sayacliUretici();

    await Promise.all([
      onbellekli({ endpoint: UC, parametreler: { kelime: "a" }, grup: "serp" }, uretici),
      onbellekli({ endpoint: UC, parametreler: { kelime: "b" }, grup: "serp" }, uretici),
    ]);

    expect(durum.cagri).toBe(2);

    const yonetici = yoneticiIstemcisi();
    for (const k of ["a", "b"]) {
      await yonetici.from("api_cache").delete().eq("cache_key", onbellekAnahtari(UC, { kelime: k }));
    }
  });
});

describe("kayıt", () => {
  it("isabet sayacı artar", async () => {
    const { uretici } = sayacliUretici();

    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);
    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);

    // Sayaç güncellemesi bloklamayan biçimde yazılır; kısa bir bekleme gerekir.
    await new Promise((r) => setTimeout(r, 700));

    const { data } = await yoneticiIstemcisi()
      .from("api_cache")
      .select("hit_count, endpoint, provider")
      .eq("cache_key", ANAHTAR)
      .maybeSingle();

    expect(data?.endpoint).toBe(UC);
    expect(data?.provider).toBe("dataforseo");
    expect(Number(data?.hit_count)).toBeGreaterThanOrEqual(1);
  });

  it("maliyet alanı yazılır", async () => {
    const { uretici } = sayacliUretici();
    await onbellekli({ endpoint: UC, parametreler: PARAMETRELER, grup: "serp" }, uretici);

    const { data } = await yoneticiIstemcisi()
      .from("api_cache")
      .select("cost")
      .eq("cache_key", ANAHTAR)
      .maybeSingle();

    // Taklit üretici sağlayıcıya gitmediği için 0; alan artık NULL değil.
    expect(data?.cost).not.toBeNull();
    expect(Number(data?.cost)).toBe(0);
  });
});
