import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { etkileriOlc, etkiTakibiBaslat, etkiTakibiIptal, kazancOzeti, projeEtkileri } from "@/lib/analiz/etki";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Etki takibinin canlı veritabanına karşı doğrulanması.
 *
 * Bu, kullanıcının "neden ödeyeyim" sorusuna verdiğimiz cevap:
 * yapılan işin sonuç verip vermediğini ölçüyoruz. Yanlış ölçüm,
 * kullanıcıya yanlış kanıt göstermek demek olur.
 */

const s = yoneticiIstemcisi();

let projeId = "";
let aksiyonId = "";
let kelimeId = "";

const TEST_URL = "https://etki-testi.example/urun/test";

beforeAll(async () => {
  const { data: proje } = await s
    .from("projects")
    .select("id")
    .eq("is_deleted", false)
    .limit(1)
    .single();

  projeId = proje!.id;

  // Test kelimesi ve sıralaması
  const { data: kelime } = await s
    .from("keywords")
    .insert({
      project_id: projeId,
      keyword: "etki testi kelimesi",
      search_volume: 1000,
      cpc: 0.5,
      is_tracked: true,
      source: "test",
    })
    .select("id")
    .single();
  kelimeId = kelime!.id;

  await s.from("keyword_rankings").insert({
    project_id: projeId,
    keyword_id: kelimeId,
    domain: "etki-testi.example",
    position: 20,
    url: TEST_URL,
    device: "desktop",
    etv: 100,
  });

  const { data: aksiyon } = await s
    .from("seo_actions")
    .insert({
      project_id: projeId,
      title: "Etki testi aksiyonu",
      category: "test",
      priority: "orta",
      impact: "orta",
      effort: "kolay",
      status: "bekliyor",
      affected_count: 1,
      source_urls: [TEST_URL] as never,
      dedupe_key: `etki_testi_${Date.now()}`,
    })
    .select("id")
    .single();
  aksiyonId = aksiyon!.id;
});

afterAll(async () => {
  await s.from("action_impact").delete().eq("action_id", aksiyonId);
  await s.from("seo_actions").delete().eq("id", aksiyonId);
  await s.from("keyword_rankings").delete().eq("keyword_id", kelimeId);
  await s.from("keywords").delete().eq("id", kelimeId);
});

describe("etki takibi", () => {
  it("aksiyon tamamlanmadan başlangıç alınmaz", async () => {
    await etkiTakibiBaslat(aksiyonId);
    const { data } = await s.from("action_impact").select("id").eq("action_id", aksiyonId);
    expect(data?.length ?? 0).toBe(0);
  });

  it("aksiyon tamamlandığında o anki durum dondurulur", async () => {
    await s.from("seo_actions").update({ status: "tamamlandi" }).eq("id", aksiyonId);
    await etkiTakibiBaslat(aksiyonId);

    const { data } = await s
      .from("action_impact")
      .select("*")
      .eq("action_id", aksiyonId)
      .maybeSingle();

    expect(data).toBeTruthy();
    expect(data!.baz_kelime_sayisi).toBe(1);
    expect(Number(data!.baz_ortalama_pozisyon)).toBe(20);
    expect(Number(data!.baz_etv)).toBe(100);
    // Trafik değeri: 100 ziyaret × $0,5 CPC × kur
    expect(Number(data!.baz_deger)).toBeGreaterThan(0);
    expect(data!.durum).toBe("bekliyor");
  });

  it("aynı aksiyon için ikinci kez başlangıç alınmaz", async () => {
    await etkiTakibiBaslat(aksiyonId);
    const { data } = await s.from("action_impact").select("id").eq("action_id", aksiyonId);
    expect(data?.length).toBe(1);
  });

  it("ölçüm penceresi açılmadan ölçüm yapılmaz", async () => {
    // Aksiyon az önce tamamlandı; başlangıç günü henüz gelmedi.
    const olculen = await etkileriOlc();
    const { data } = await s
      .from("action_impact")
      .select("olcum_sayisi")
      .eq("action_id", aksiyonId)
      .maybeSingle();

    expect(data!.olcum_sayisi).toBe(0);
    expect(olculen).toBe(0);
  });

  it("pencere açıldığında sıralama değişimi ölçülür", async () => {
    // Aksiyonu 5 gün öncesine al ve sıralamayı iyileştir.
    await s
      .from("action_impact")
      .update({ completed_at: new Date(Date.now() - 5 * 86_400_000).toISOString() })
      .eq("action_id", aksiyonId);

    await s.from("keyword_rankings").update({ position: 8, etv: 260 }).eq("keyword_id", kelimeId);

    const olculen = await etkileriOlc();
    expect(olculen).toBeGreaterThan(0);

    const etkiler = await projeEtkileri(projeId);
    const etki = etkiler.get(aksiyonId);

    expect(etki).toBeTruthy();
    // 20 → 8 : negatif değişim = sıra yükseldi
    expect(etki!.pozisyonDegisimi).toBe(-12);
    expect(etki!.etvDegisimi).toBe(160);
    expect(etki!.degerDegisimi).toBeGreaterThan(0);
  });

  it("kazanç özeti yükselen aksiyonu sayar", async () => {
    const ozet = await kazancOzeti(projeId);
    expect(ozet.olculenAksiyon).toBeGreaterThanOrEqual(1);
    expect(ozet.yukselenAksiyon).toBeGreaterThanOrEqual(1);
    expect(ozet.toplamEtvDegisimi).toBeGreaterThan(0);
  });

  it("sıralama düşerse bu da doğru ölçülür", async () => {
    await s.from("keyword_rankings").update({ position: 35, etv: 20 }).eq("keyword_id", kelimeId);
    await s
      .from("action_impact")
      .update({ son_olcum_at: new Date(Date.now() - 5 * 86_400_000).toISOString() })
      .eq("action_id", aksiyonId);

    await etkileriOlc();
    const etkiler = await projeEtkileri(projeId);
    const etki = etkiler.get(aksiyonId);

    // 20 → 35 : pozitif değişim = sıra düştü
    expect(etki!.pozisyonDegisimi).toBe(15);
    expect(etki!.etvDegisimi).toBeLessThan(0);
  });

  it("ölçüm penceresi kapandığında sonuçlandırılır", async () => {
    await s
      .from("action_impact")
      .update({ completed_at: new Date(Date.now() - 60 * 86_400_000).toISOString() })
      .eq("action_id", aksiyonId);

    await etkileriOlc();
    const { data } = await s
      .from("action_impact")
      .select("durum")
      .eq("action_id", aksiyonId)
      .maybeSingle();

    expect(data!.durum).toBe("sonuclandi");
  });

  it("aksiyon tekrar açılınca ölçüm iptal edilir", async () => {
    await etkiTakibiIptal(aksiyonId);
    const { data } = await s.from("action_impact").select("id").eq("action_id", aksiyonId);
    expect(data?.length ?? 0).toBe(0);
  });
});
