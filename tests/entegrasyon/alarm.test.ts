import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { alarmlariUret, guncelAlarmlar, gunlukAnlikAl } from "@/lib/analiz/alarm";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Günlük alarm sisteminin canlı veritabanına karşı doğrulanması.
 *
 * Alarm yanlış üretilirse kullanıcı ya boş yere paniğe kapılır ya da
 * gerçek düşüşü kaçırır. İkisi de güveni yok eder.
 */

const s = yoneticiIstemcisi();
let projeId = "";
const kelimeIdleri: string[] = [];

const bugun = new Date().toISOString().slice(0, 10);
const dun = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

beforeAll(async () => {
  const { data: proje } = await s
    .from("projects")
    .select("id")
    .eq("is_deleted", false)
    .limit(1)
    .single();
  projeId = proje!.id;

  await s.from("alerts").delete().eq("project_id", projeId);
  await s.from("daily_snapshot").delete().eq("project_id", projeId);
});

afterAll(async () => {
  await s.from("alerts").delete().eq("project_id", projeId);
  await s.from("daily_snapshot").delete().eq("project_id", projeId);
  for (const id of kelimeIdleri) {
    await s.from("keyword_rankings").delete().eq("keyword_id", id);
    await s.from("keywords").delete().eq("id", id);
  }
});

async function kelimeEkle(keyword: string, pozisyon: number | null, onceki: number | null) {
  const { data: k } = await s
    .from("keywords")
    .insert({
      project_id: projeId,
      keyword,
      search_volume: 1000,
      is_tracked: true,
      source: "test",
    })
    .select("id")
    .single();

  kelimeIdleri.push(k!.id);

  await s.from("keyword_rankings").insert({
    project_id: projeId,
    keyword_id: k!.id,
    domain: "test.example",
    position: pozisyon,
    previous_position: onceki,
    url: `https://test.example/${keyword.replace(/\s/g, "-")}`,
    device: "desktop",
    etv: pozisyon ? 100 / pozisyon : 0,
  });
}

describe("günlük anlık görüntü", () => {
  it("sıralama durumunu ölçüp kaydeder", async () => {
    await kelimeEkle("alarm testi bir", 2, 2);
    await kelimeEkle("alarm testi iki", 8, 8);
    await kelimeEkle("alarm testi uc", 45, 45);

    const anlik = await gunlukAnlikAl(projeId);

    expect(anlik.siralananKelime).toBeGreaterThanOrEqual(3);
    expect(anlik.ilkUc).toBeGreaterThanOrEqual(1);
    expect(anlik.ilkOn).toBeGreaterThanOrEqual(2);
    expect(anlik.gorunurluk).toBeGreaterThan(0);

    const { data } = await s
      .from("daily_snapshot")
      .select("*")
      .eq("project_id", projeId)
      .eq("gun", bugun)
      .maybeSingle();

    expect(data).toBeTruthy();
    expect(data!.siralanan_kelime).toBe(anlik.siralananKelime);
  });
});

describe("alarm üretimi", () => {
  it("eşik altındaki değişimde alarm üretmez", async () => {
    // Dünkü görünürlük bugünküyle neredeyse aynı.
    const anlik = await gunlukAnlikAl(projeId);
    await s.from("daily_snapshot").upsert(
      {
        project_id: projeId,
        gun: dun,
        siralanan_kelime: anlik.siralananKelime,
        gorunurluk: anlik.gorunurluk,
        tahmini_trafik: anlik.tahminiTrafik,
      },
      { onConflict: "project_id,gun" },
    );

    await s.from("alerts").delete().eq("project_id", projeId);
    await alarmlariUret(projeId);

    const alarmlar = await guncelAlarmlar(projeId, 2);
    const gorunurlukAlarmi = alarmlar.find((a) => a.tur.startsWith("gorunurluk"));
    expect(gorunurlukAlarmi).toBeUndefined();
  });

  it("belirgin görünürlük düşüşünde kritik alarm üretir", async () => {
    // Dünü çok yüksek göstererek düşüş simüle edilir.
    const anlik = await gunlukAnlikAl(projeId);
    await s
      .from("daily_snapshot")
      .update({ gorunurluk: anlik.gorunurluk * 2 })
      .eq("project_id", projeId)
      .eq("gun", dun);

    await s.from("alerts").delete().eq("project_id", projeId);
    await alarmlariUret(projeId);

    const alarmlar = await guncelAlarmlar(projeId, 2);
    const dusus = alarmlar.find((a) => a.tur === "gorunurluk_dususu");

    expect(dusus).toBeTruthy();
    expect(dusus!.onem).toBe("kritik");
    expect(dusus!.baslik).toContain("düştü");
  });

  it("çok sayıda kelime gerilediğinde alarm üretir", async () => {
    await kelimeEkle("alarm dusen bir", 25, 5);
    await kelimeEkle("alarm dusen iki", 30, 8);
    await kelimeEkle("alarm dusen uc", 40, 12);

    await s.from("alerts").delete().eq("project_id", projeId);
    await alarmlariUret(projeId);

    const alarmlar = await guncelAlarmlar(projeId, 2);
    const kelimeAlarmi = alarmlar.find((a) => a.tur === "kelime_dususu");

    expect(kelimeAlarmi).toBeTruthy();
    expect(kelimeAlarmi!.baslik).toContain("geriledi");
    expect(Number(kelimeAlarmi!.deger)).toBeGreaterThanOrEqual(3);
  });

  it("yeni kazanılan kelimeleri olumlu alarm olarak bildirir", async () => {
    for (let i = 1; i <= 5; i++) {
      await kelimeEkle(`alarm yeni ${i}`, 10 + i, null);
    }

    await s.from("alerts").delete().eq("project_id", projeId);
    await alarmlariUret(projeId);

    const alarmlar = await guncelAlarmlar(projeId, 2);
    const kazanim = alarmlar.find((a) => a.tur === "kelime_kazanimi");

    expect(kazanim).toBeTruthy();
    expect(kazanim!.onem).toBe("olumlu");
    expect(kazanim!.baslik).toContain("yeni");
  });

  it("aynı gün aynı türde ikinci alarm oluşturmaz", async () => {
    await alarmlariUret(projeId);
    await alarmlariUret(projeId);

    const alarmlar = await guncelAlarmlar(projeId, 2);
    const turler = alarmlar.map((a) => a.tur);
    expect(new Set(turler).size).toBe(turler.length);
  });
});
