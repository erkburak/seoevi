import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  baglantiGrafiginiKaydet,
  icBaglantiOzeti,
  oneriUret,
  urlNormalle,
} from "@/lib/analiz/ic-baglanti";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * İç bağlantı öneri motorunun canlı veritabanına karşı doğrulaması.
 *
 * Gerçekçi ama denetimli bir mini e-ticaret sitesi kurulur; böylece hangi
 * önerinin çıkması gerektiği önceden bilinir.
 */

const supabase = yoneticiIstemcisi();
const ALAN = "https://test-magaza.example";

let projeId: string;

/** Sayfalar: iki kategori, iki ürün, bir blog, bir ana sayfa. */
const SAYFALAR = [
  {
    url: `${ALAN}/`,
    path: "/",
    page_type: "anasayfa",
    title: "Test Mağaza — Beyaz Eşya",
    h1: "Test Mağaza",
    word_count: 400,
  },
  {
    url: `${ALAN}/buzdolabi`,
    path: "/buzdolabi",
    page_type: "kategori",
    title: "Buzdolabı Modelleri ve Fiyatları",
    h1: "Buzdolabı",
    word_count: 600,
  },
  {
    // Asıl hedef: kimse bağlantı vermiyor, ikinci sayfada takılı.
    url: `${ALAN}/vestel-no-frost-buzdolabi`,
    path: "/vestel-no-frost-buzdolabi",
    page_type: "kategori",
    title: "Vestel No Frost Buzdolabı",
    h1: "Vestel No Frost Buzdolabı Modelleri",
    word_count: 500,
  },
  {
    url: `${ALAN}/vestel-buzdolabi`,
    path: "/vestel-buzdolabi",
    page_type: "kategori",
    title: "Vestel Buzdolabı Modelleri",
    h1: "Vestel Buzdolabı",
    word_count: 700,
  },
  {
    url: `${ALAN}/blog/buzdolabi-nasil-secilir`,
    path: "/blog/buzdolabi-nasil-secilir",
    page_type: "icerik",
    title: "Buzdolabı Nasıl Seçilir? Vestel No Frost Rehberi",
    h1: "Buzdolabı Nasıl Seçilir",
    word_count: 1500,
  },
  {
    // Yinelenen adres: canonical ile asıl sayfaya işaret ediyor.
    url: `${ALAN}/vestel-no-frost-buzdolabi?is_link=1`,
    path: "/vestel-no-frost-buzdolabi",
    page_type: "kategori",
    title: "Vestel No Frost Buzdolabı",
    h1: "Vestel No Frost Buzdolabı Modelleri",
    word_count: 500,
    canonical_url: `${ALAN}/vestel-no-frost-buzdolabi`,
  },
  {
    // Alakasız: hiçbir buzdolabı önerisinde kaynak olmamalı.
    url: `${ALAN}/kadin-mont`,
    path: "/kadin-mont",
    page_type: "kategori",
    title: "Kadın Mont Modelleri",
    h1: "Kadın Mont",
    word_count: 600,
  },
];

/** Mevcut bağlantılar: ana sayfa herkese bağlanır, hedefe kimse bağlanmaz. */
const BAGLANTILAR = [
  { kaynak: `${ALAN}/`, hedef: `${ALAN}/buzdolabi`, anchor: "Buzdolabı", dofollow: true },
  { kaynak: `${ALAN}/`, hedef: `${ALAN}/vestel-buzdolabi`, anchor: "Vestel", dofollow: true },
  { kaynak: `${ALAN}/`, hedef: `${ALAN}/kadin-mont`, anchor: "Mont", dofollow: true },
  {
    kaynak: `${ALAN}/`,
    hedef: `${ALAN}/blog/buzdolabi-nasil-secilir`,
    anchor: "Rehber",
    dofollow: true,
  },
  {
    kaynak: `${ALAN}/buzdolabi`,
    hedef: `${ALAN}/vestel-buzdolabi`,
    anchor: "Vestel buzdolabı",
    dofollow: true,
  },
];

beforeAll(async () => {
  const { data: kullanici } = await supabase.from("profiles").select("id").limit(1).single();

  const { data: proje, error } = await supabase
    .from("projects")
    .insert({
      user_id: kullanici!.id,
      name: "TEST ic-baglanti",
      url: ALAN,
      domain: "test-magaza.example",
    })
    .select()
    .single();
  if (error) throw error;
  projeId = proje!.id;

  await supabase
    .from("pages")
    .insert(SAYFALAR.map((s) => ({ ...s, project_id: projeId, status_code: 200 })));

  // Hedef sayfa 14. sırada, iyi hacimli bir kelimede.
  const { data: kelime } = await supabase
    .from("keywords")
    .insert({
      project_id: projeId,
      keyword: "vestel no frost buzdolabı",
      search_volume: 4400,
    })
    .select()
    .single();

  await supabase.from("keyword_rankings").insert({
    project_id: projeId,
    keyword_id: kelime!.id,
    domain: "test-magaza.example",
    position: 14,
    url: `${ALAN}/vestel-no-frost-buzdolabi`,
  });

  await baglantiGrafiginiKaydet(projeId, BAGLANTILAR);
});

afterAll(async () => {
  // Yalnızca bu testin açtığı proje, kendi kimliğiyle silinir.
  if (projeId) await supabase.from("projects").delete().eq("id", projeId);
});

describe("bağlantı grafiği", () => {
  it("çiftleri tekilleştirerek saklar", async () => {
    const { data } = await supabase
      .from("internal_links")
      .select("kaynak_url, hedef_url")
      .eq("project_id", projeId);

    expect(data).toHaveLength(BAGLANTILAR.length);
  });

  it("aynı çiftin tekrarını tek satırda toplar", async () => {
    const tekrarli = [
      ...BAGLANTILAR,
      { kaynak: `${ALAN}/`, hedef: `${ALAN}/buzdolabi`, anchor: "Buzdolapları", dofollow: true },
    ];
    const yazilan = await baglantiGrafiginiKaydet(projeId, tekrarli);
    expect(yazilan).toBe(BAGLANTILAR.length);

    const { data } = await supabase
      .from("internal_links")
      .select("link_sayisi")
      .eq("project_id", projeId)
      .eq("kaynak_url", `${ALAN}`)
      .eq("hedef_url", `${ALAN}/buzdolabi`)
      .single();

    expect(data!.link_sayisi).toBe(2);
  });

  it("sayfanın kendine bağlantısını atar", async () => {
    const sayi = await baglantiGrafiginiKaydet(projeId, [
      ...BAGLANTILAR,
      { kaynak: `${ALAN}/buzdolabi`, hedef: `${ALAN}/buzdolabi/`, anchor: "aynı", dofollow: true },
    ]);
    expect(sayi).toBe(BAGLANTILAR.length);
  });
});

describe("öneri üretimi", () => {
  it("bağlantısız hedefe konu komşusu sayfalardan öneri üretir", async () => {
    await baglantiGrafiginiKaydet(projeId, BAGLANTILAR);
    const sonuc = await oneriUret(projeId);

    expect(sonuc.oneriSayisi).toBeGreaterThan(0);

    const { data } = await supabase
      .from("link_suggestions")
      .select("kaynak_url, hedef_url, anchor_metni, skor, keyword")
      .eq("project_id", projeId)
      .eq("hedef_url", `${ALAN}/vestel-no-frost-buzdolabi`)
      .order("skor", { ascending: false });

    expect(data!.length).toBeGreaterThan(0);

    const kaynaklar = data!.map((o) => o.kaynak_url);

    // Konu komşuları kaynak olmalı.
    expect(kaynaklar).toContain(`${ALAN}/vestel-buzdolabi`);
    // Alakasız sayfa asla kaynak olmamalı.
    expect(kaynaklar).not.toContain(`${ALAN}/kadin-mont`);
  });

  it("zaten var olan bağlantıyı önermez", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("kaynak_url, hedef_url")
      .eq("project_id", projeId);

    const mevcut = new Set(
      BAGLANTILAR.map((b) => `${urlNormalle(b.kaynak)}\n${urlNormalle(b.hedef)}`),
    );

    for (const o of data!) {
      expect(mevcut.has(`${o.kaynak_url}\n${o.hedef_url}`)).toBe(false);
    }
  });

  it("sayfanın kendisini kaynak göstermez", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("kaynak_url, hedef_url")
      .eq("project_id", projeId);

    for (const o of data!) expect(o.kaynak_url).not.toBe(o.hedef_url);
  });

  it("aynı hedefe giden bağlantı metinlerini çeşitlendirir", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("anchor_metni")
      .eq("project_id", projeId)
      .eq("hedef_url", `${ALAN}/vestel-no-frost-buzdolabi`);

    const metinler = data!.map((o) => o.anchor_metni);
    // Kalıp sayısı öneri sayısından azsa tekrar olabilir; kabul edilemez
    // olan, aynı hedefe giden tüm bağlantıların tek metinle verilmesidir.
    expect(new Set(metinler).size).toBeGreaterThan(1);
    expect(new Set(metinler).size).toBeGreaterThanOrEqual(Math.min(3, metinler.length));
  });

  it("bağlantı metnini hedefin kelimesinden üretir", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("anchor_metni, keyword")
      .eq("project_id", projeId)
      .eq("hedef_url", `${ALAN}/vestel-no-frost-buzdolabi`)
      .limit(1)
      .single();

    expect(data!.keyword).toBe("vestel no frost buzdolabı");
    expect(data!.anchor_metni.toLocaleLowerCase("tr-TR")).toContain("vestel no frost buzdolabı");
  });

  it("kaynak sayfa başına önerileri sınırlar", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("kaynak_url")
      .eq("project_id", projeId);

    const yuk = new Map<string, number>();
    for (const o of data!) yuk.set(o.kaynak_url, (yuk.get(o.kaynak_url) ?? 0) + 1);
    for (const sayi of yuk.values()) expect(sayi).toBeLessThanOrEqual(3);
  });

  it("kullanıcının verdiği kararı yeniden üretmez", async () => {
    const { data: ilk } = await supabase
      .from("link_suggestions")
      .select("id, kaynak_url, hedef_url")
      .eq("project_id", projeId)
      .limit(1)
      .single();

    await supabase.from("link_suggestions").update({ durum: "yoksayildi" }).eq("id", ilk!.id);

    await oneriUret(projeId);

    const { data: sonra } = await supabase
      .from("link_suggestions")
      .select("durum")
      .eq("project_id", projeId)
      .eq("kaynak_url", ilk!.kaynak_url)
      .eq("hedef_url", ilk!.hedef_url)
      .single();

    // Yoksayılan öneri "yeni" olarak geri gelmemeli.
    expect(sonra!.durum).toBe("yoksayildi");
  });
});

describe("koruma", () => {
  it("bağlantı grafiği yokken öneri üretmez", async () => {
    // Grafik olmadan hangi bağlantının zaten var olduğu bilinemez.
    await supabase.from("internal_links").delete().eq("project_id", projeId);

    const sonuc = await oneriUret(projeId);
    expect(sonuc.oneriSayisi).toBe(0);

    // Grafiği geri yükle; sonraki testler buna dayanıyor.
    await baglantiGrafiginiKaydet(projeId, BAGLANTILAR);
    await oneriUret(projeId);
  });
});

describe("yinelenen adresler", () => {
  it("canonical bildiren kopyayı ayrı sayfa saymaz", async () => {
    const ozet = await icBaglantiOzeti(projeId);
    // Yedi sayfa kaydı var; ikisi aynı sayfanın iki adresi.
    expect(ozet.incelenenSayfa).toBe(SAYFALAR.length - 1);
  });

  it("kopyaya ayrı öneri üretmez", async () => {
    const { data } = await supabase
      .from("link_suggestions")
      .select("kaynak_url, hedef_url")
      .eq("project_id", projeId);

    for (const o of data!) {
      expect(o.kaynak_url).not.toContain("is_link=1");
      expect(o.hedef_url).not.toContain("is_link=1");
    }
  });
});

describe("özet", () => {
  it("bağlantı almayan sayfaları sayar ve öneriyi hedefe göre gruplar", async () => {
    const ozet = await icBaglantiOzeti(projeId);

    expect(ozet.grafikVarMi).toBe(true);
    expect(ozet.incelenenSayfa).toBe(SAYFALAR.length - 1);
    expect(ozet.oksuzSayfa).toBeGreaterThan(0);

    const hedef = ozet.gruplar.find(
      (g) => g.hedefUrl === `${ALAN}/vestel-no-frost-buzdolabi`,
    );
    expect(hedef).toBeDefined();
    expect(hedef!.pozisyon).toBe(14);
    expect(hedef!.hacim).toBe(4400);
    expect(hedef!.mevcutGelenLink).toBe(0);
    expect(hedef!.oneriler.length).toBeGreaterThan(0);
  });

  it("yoksayılan öneriyi listede göstermez", async () => {
    const ozet = await icBaglantiOzeti(projeId);
    for (const g of ozet.gruplar) {
      for (const o of g.oneriler) expect(o.durum).not.toBe("yoksayildi");
    }
  });
});
