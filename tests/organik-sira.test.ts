import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Organik sıra ile mutlak sıra karıştırılmamalı.
 *
 * Yaşanan arıza: sağlayıcının `rank_absolute` alanı kullanılıyordu. Bu
 * alan görsel paketi, video ve "insanlar bunu da soruyor" kutusu gibi
 * öğeleri de sayar. Kullanıcı "10. sıradasınız" ifadesini organik
 * sonuçlarda onuncu olmak diye okur; oysa araya giren görsel bloğu
 * yüzünden gerçek organik sıra 9'du. Tüm sıralamalar sistematik olarak
 * olduğundan kötü görünüyordu.
 */

const dfsTekSonuc = vi.fn();

vi.mock("@/lib/dataforseo/client", async () => {
  const gercek = await vi.importActual<typeof import("@/lib/dataforseo/client")>(
    "@/lib/dataforseo/client",
  );
  return {
    ...gercek,
    dfsTekSonuc: (...a: unknown[]) => dfsTekSonuc(...a),
    dfsIstek: vi.fn(),
    yenidenDene: (is: () => unknown) => is(),
  };
});

vi.mock("@/lib/dataforseo/cache", () => ({
  onbellekli: async (_s: unknown, uretici: () => Promise<unknown>) => ({
    veri: await uretici(),
    onbellekten: false,
  }),
}));

const { siralananKelimeler } = await import("@/lib/dataforseo/labs");

function oge(kelime: string, tur: string, grup: number, mutlak: number) {
  return {
    keyword_data: { keyword: kelime, keyword_info: { search_volume: 100 } },
    ranked_serp_element: {
      serp_item: {
        type: tur,
        rank_group: grup,
        rank_absolute: mutlak,
        rank_changes: { previous_rank_absolute: 28 },
      },
    },
  };
}

beforeEach(() => dfsTekSonuc.mockReset());

const istek = { domain: "chuba.com.tr", locationCode: 2792 };

describe("sıralanan kelimeler", () => {
  it("organik sırayı (rank_group) kullanır", async () => {
    // Gerçek veri: görsel bloğu araya girdiği için iki ölçek ayrışıyor.
    dfsTekSonuc.mockResolvedValueOnce({ items: [oge("triko tayt", "organic", 9, 10)] });

    const sonuc = await siralananKelimeler(istek);

    expect(sonuc[0].pozisyon).toBe(9);
    expect(sonuc[0].pozisyon).not.toBe(10);
  });

  it("organik olmayan SERP öğelerini sıralama saymaz", async () => {
    dfsTekSonuc.mockResolvedValueOnce({
      items: [
        oge("kolej ceketi", "organic", 20, 24),
        oge("yerel sonuç", "local_pack", 1, 3),
        oge("reklam", "paid", 1, 1),
      ],
    });

    const sonuc = await siralananKelimeler(istek);

    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].keyword).toBe("kolej ceketi");
  });

  it("sağlayıcının mutlak ölçekli önceki sırasını taşımaz", async () => {
    /*
     * Sağlayıcı önceki sırayı yalnızca mutlak ölçekte verir. Organik
     * sırayla karşılaştırılırsa "28. sıradan 12. sıraya" gibi gerçekte
     * olmayan bir sıçrama üretir; önceki sıra kendi ölçüm geçmişimizden
     * hesaplanmalıdır.
     */
    dfsTekSonuc.mockResolvedValueOnce({ items: [oge("kadın kolej ceket", "organic", 12, 14)] });

    const sonuc = await siralananKelimeler(istek);

    expect(sonuc[0].onceki_pozisyon).toBeNull();
  });

  it("tür bilgisi gelmezse öğeyi elemez", async () => {
    // Eski yanıtlarda `type` bulunmayabilir; veri kaybetmemek gerekir.
    dfsTekSonuc.mockResolvedValueOnce({
      items: [
        {
          keyword_data: { keyword: "ajur triko", keyword_info: { search_volume: 210 } },
          ranked_serp_element: { serp_item: { rank_group: 23, rank_absolute: 27 } },
        },
      ],
    });

    const sonuc = await siralananKelimeler(istek);

    expect(sonuc).toHaveLength(1);
    expect(sonuc[0].pozisyon).toBe(23);
  });
});
