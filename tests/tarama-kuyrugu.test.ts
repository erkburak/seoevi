import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Kuyrukta bekleyen tarama görevi hata sayılmamalı.
 *
 * Yaşanan arıza: sağlayıcı, görev henüz sıradayken 40602 ("Task In Queue")
 * döndürüyor. İstemci `status_code >= 40000` olan her yanıtı hata saydığı
 * için tarama daha başlamadan iş "başarısız" işaretleniyor, üç kez hızlıca
 * yeniden deneniyor ve kullanıcı hiçbir sonuç alamadan aylık tarama
 * hakkını kaybediyordu.
 */

const dfsTekSonuc = vi.fn();

vi.mock("@/lib/dataforseo/client", async () => {
  const gercek = await vi.importActual<typeof import("@/lib/dataforseo/client")>(
    "@/lib/dataforseo/client",
  );
  return {
    ...gercek,
    dfsTekSonuc: (...args: unknown[]) => dfsTekSonuc(...args),
    dfsIstek: vi.fn(),
    yenidenDene: (is: () => unknown) => is(),
  };
});

const { DataForSeoHatasi, gorevHazirDegilMi } = await import("@/lib/dataforseo/client");
const { taramaOzeti } = await import("@/lib/dataforseo/onpage");

beforeEach(() => {
  dfsTekSonuc.mockReset();
});

describe("görev hazır değil kodları", () => {
  it("406xx aralığını hazır değil sayar", () => {
    expect(gorevHazirDegilMi(40601)).toBe(true); // Task Handed
    expect(gorevHazirDegilMi(40602)).toBe(true); // Task In Queue
    expect(gorevHazirDegilMi(40603)).toBe(true); // Task In Progress
  });

  it("gerçek hataları hazır değil saymaz", () => {
    expect(gorevHazirDegilMi(40501)).toBe(false);
    expect(gorevHazirDegilMi(40100)).toBe(false);
    expect(gorevHazirDegilMi(20000)).toBe(false);
  });

  it("hata nesnesi bayrağı taşır", () => {
    expect(new DataForSeoHatasi(40602, "Task In Queue").hazirDegil).toBe(true);
    expect(new DataForSeoHatasi(40501, "Invalid Field").hazirDegil).toBe(false);
  });
});

describe("taramaOzeti", () => {
  it("görev kuyruktayken hata fırlatmaz, beklemeye devam eder", async () => {
    dfsTekSonuc.mockRejectedValueOnce(new DataForSeoHatasi(40602, "Task In Queue"));

    const ozet = await taramaOzeti("gorev-1");

    expect(ozet.tamamlandi).toBe(false);
    expect(ozet.taranan_sayfa).toBe(0);
    expect(ozet.sinira_takildi).toBe(false);
  });

  it("gerçek hatayı yukarı taşır", async () => {
    dfsTekSonuc.mockRejectedValueOnce(new DataForSeoHatasi(40501, "Invalid Field"));

    await expect(taramaOzeti("gorev-2")).rejects.toThrow(DataForSeoHatasi);
  });

  it("tamamlanmış taramayı normal okur", async () => {
    dfsTekSonuc.mockResolvedValueOnce({
      crawl_progress: "finished",
      crawl_stop_reason: "limit_exceeded",
      crawl_status: { pages_crawled: 150, pages_in_queue: 0, max_crawl_pages: 150 },
      page_metrics: { onpage_score: 91.2 },
    });

    const ozet = await taramaOzeti("gorev-3");

    expect(ozet.tamamlandi).toBe(true);
    expect(ozet.taranan_sayfa).toBe(150);
    expect(ozet.sinira_takildi).toBe(true);
  });
});
