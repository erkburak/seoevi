import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Sıra doğrulama.
 *
 * Yaşanan arıza: sıralamalar Labs'in `ranked_keywords` ucundan alınıyordu.
 * O uç canlı arama değil, geçmişe dayalı bir veritabanıdır; ölçtüğümüz
 * gerçek örneklerde kayıtlar 44–104 gün eskiydi. "13. sıradasınız" denen
 * kelimede site canlı SERP'in ilk 67 organik sonucunda hiç yoktu; siteyi
 * yalnızca görsel paketi içinde bulduk.
 *
 * Bu yüzden gösterilen her sıra o an ölçülmüş olmak zorundadır ve
 * yalnızca ORGANİK sonuçlar sıra sayılır.
 */

const dfsIstek = vi.fn();
const dfsTekSonuc = vi.fn();
const dfsTumSonuclar = vi.fn();

vi.mock("@/lib/dataforseo/client", () => ({
  dfsIstek: (...a: unknown[]) => dfsIstek(...a),
  dfsTekSonuc: (...a: unknown[]) => dfsTekSonuc(...a),
  dfsTumSonuclar: (...a: unknown[]) => dfsTumSonuclar(...a),
  yenidenDene: (is: () => unknown) => is(),
}));

/**
 * Veritabanı katmanı taklit edilir: açılan görev kimlikleri kaydedilir,
 * bekleyen görev listesi boş döner. Amaç ölçüm mantığını sınamak.
 */
const eklenenler: unknown[] = [];

function zincir(sonuc: unknown): unknown {
  const nesne: Record<string, unknown> = {
    then: (c: (d: unknown) => unknown) => Promise.resolve(sonuc).then(c),
  };
  for (const ad of ["select", "eq", "is", "gte", "in", "update", "limit"]) {
    nesne[ad] = () => zincir(sonuc);
  }
  nesne.insert = (satirlar: unknown) => {
    eklenenler.push(satirlar);
    return zincir({ data: null, error: null });
  };
  return nesne;
}

vi.mock("@/lib/supabase/admin", () => ({
  yoneticiIstemcisi: () => ({ from: () => zincir({ data: [], error: null }) }),
}));

const { siralariDogrula } = await import("@/lib/dataforseo/sira-dogrulama");

/** Görevleri sırayla açar; sağlayıcı da gönderilen sırayla döndürür. */
function gorevleriAc(adet: number) {
  dfsIstek.mockResolvedValueOnce({
    tasks: Array.from({ length: adet }, (_, i) => ({ id: `gorev-${i}` })),
  });
}

const TEMEL = {
  projeId: "11111111-1111-1111-1111-111111111111",
  locationCode: 2792,
  bizimAlanAdi: "chuba.com.tr",
  yoklamaArasi: 0,
  ilkBekleme: 2_000,
};

beforeEach(() => {
  eklenenler.length = 0;
  dfsIstek.mockReset();
  dfsTekSonuc.mockReset();
  dfsTumSonuclar.mockReset();
});

describe("siralariDogrula", () => {
  it("organik sırayı rank_group'tan okur", async () => {
    gorevleriAc(1);
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({
      keyword: "triko tayt",
      datetime: "2026-08-30 02:14:15 +00:00",
      items: [
        { type: "organic", rank_group: 1, domain: "www.trendyol.com" },
        { type: "organic", rank_group: 9, domain: "www.chuba.com.tr", url: "https://www.chuba.com.tr/x" },
      ],
    });

    const sonuc = await siralariDogrula({ ...TEMEL, kelimeler: ["triko tayt"] });

    expect(sonuc.get("triko tayt")?.pozisyon).toBe(9);
    expect(sonuc.get("triko tayt")?.url).toBe("https://www.chuba.com.tr/x");
  });

  it("görsel paketindeki görünmeyi organik sıra saymaz", async () => {
    /*
     * Kullanıcının bildirdiği asıl arıza. "kolej ceketi erkek" aramasında
     * site organikte hiç yoktu; yalnızca görsel bloğunun içinde geçiyordu.
     * Görselde çıkmak organik sırada çıkmak değildir.
     */
    gorevleriAc(1);
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({
      keyword: "kolej ceketi erkek",
      datetime: "2026-08-30 02:10:04 +00:00",
      items: [
        { type: "images", rank_group: 1, domain: "www.chuba.com.tr" },
        { type: "organic", rank_group: 1, domain: "www.trendyol.com" },
      ],
    });

    const sonuc = await siralariDogrula({ ...TEMEL, kelimeler: ["kolej ceketi erkek"] });

    const olcum = sonuc.get("kolej ceketi erkek");
    // Ölçüm YAPILDI (haritada var) ama sıra yok: "ilk 30'da değil".
    expect(olcum).toBeDefined();
    expect(olcum?.pozisyon).toBeNull();
  });

  it("ölçülmüş ama sırasız olan ile hiç ölçülmemiş olanı ayırır", async () => {
    gorevleriAc(2);
    // Yalnızca ilk görev tamamlanır; ikincisi zamanında gelmez.
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({
      keyword: "ajur triko",
      datetime: "2026-08-30 02:00:00 +00:00",
      items: [{ type: "organic", rank_group: 4, domain: "www.hepsiburada.com" }],
    });

    const sonuc = await siralariDogrula({ ...TEMEL, kelimeler: ["ajur triko", "kolej ceket"] });

    // Ölçüldü, ilk 30'da yok.
    expect(sonuc.has("ajur triko")).toBe(true);
    expect(sonuc.get("ajur triko")?.pozisyon).toBeNull();
    // Hiç ölçülemedi — haritada yer almaz.
    expect(sonuc.has("kolej ceket")).toBe(false);
  });

  it("www öneki alan adı eşleşmesini bozmaz", async () => {
    gorevleriAc(1);
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({
      keyword: "kolej ceketi",
      items: [{ type: "organic", rank_group: 20, url: "https://www.chuba.com.tr/kolej" }],
    });

    const sonuc = await siralariDogrula({ ...TEMEL, kelimeler: ["kolej ceketi"] });

    expect(sonuc.get("kolej ceketi")?.pozisyon).toBe(20);
  });

  it("boş kelime listesinde sağlayıcıya hiç istek atmaz", async () => {
    const sonuc = await siralariDogrula({ ...TEMEL, kelimeler: [] });

    expect(sonuc.size).toBe(0);
    expect(dfsIstek).not.toHaveBeenCalled();
  });

  it("aynı kelimeyi iki kez göndermez", async () => {
    // Mükerrer kelime, mükerrer ücret demektir.
    gorevleriAc(1);
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({ keyword: "triko tayt", items: [] });

    await siralariDogrula({ ...TEMEL, kelimeler: ["triko tayt", "triko tayt"] });

    const gonderilen = dfsIstek.mock.calls[0]?.[1] as unknown[];
    expect(gonderilen).toHaveLength(1);
  });

  it("açılan görev kimliklerini hemen kaydeder", async () => {
    /*
     * Para güvenliği: sonuç zamanında gelmezse görev kimliği tek
     * kayıttır. Yazılmazsa ödenen görev bir daha bulunamaz — oysa
     * sağlayıcı sonucu biz okuyana kadar saklıyor.
     */
    gorevleriAc(2);
    dfsTumSonuclar.mockResolvedValue([]); // hiçbiri zamanında hazır olmaz

    await siralariDogrula({ ...TEMEL, kelimeler: ["ajur triko", "kolej ceket"] });

    const satirlar = eklenenler[0] as { task_id: string; hedef: string; tur: string }[];
    expect(satirlar).toHaveLength(2);
    expect(satirlar.map((r) => r.hedef).sort()).toEqual(["ajur triko", "kolej ceket"]);
    expect(satirlar.every((r) => r.task_id)).toBe(true);
    // Görev tablosu artık paylaşımlı; tür ayrımı olmadan hız görevleriyle
    // karışır ve yanlış uç noktadan okunmaya çalışılır.
    expect(satirlar.every((r) => r.tur === "serp")).toBe(true);
  });

  it("ilk üç sayfayı kapsayacak derinlikte sorar", async () => {
    gorevleriAc(1);
    dfsTumSonuclar.mockResolvedValue([{ id: "gorev-0" }]);
    dfsTekSonuc.mockResolvedValueOnce({ keyword: "kolej ceket", items: [] });

    await siralariDogrula({ ...TEMEL, kelimeler: ["kolej ceket"] });

    const gonderilen = dfsIstek.mock.calls[0]?.[1] as { depth: number }[];
    // Derinlik doğrudan fiyata yansır; sessizce büyümesi maliyeti artırır.
    expect(gonderilen[0].depth).toBe(30);
  });
});
