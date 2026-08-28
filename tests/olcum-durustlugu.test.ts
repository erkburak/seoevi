import { describe, expect, it } from "vitest";

import { aiGorunurlukSkoru } from "@/lib/scoring";

/**
 * Ölçülemeyen sinyal, sıfır sayılmamalı.
 *
 * Yaşanan sorun: ürün verisi ya da arama sonucu verisi olmayan bir
 * projede AI görünürlüğü kırılımı "%0" gösteriyordu. Bu ölçüm değil
 * bilgisizlikti ve hem skoru hem kullanıcının kararını bozuyordu.
 */

const TABAN = {
  markaBahsi: 120,
  markaOlculdu: true,
  toplamSayfa: 100,
  bahsedenAlanAdi: 8,
  snippetSayisi: 2,
  cevaplananSoru: 3,
  toplamSoru: 10,
  ilkOnKelime: 20,
  toplamKelime: 100,
  alisverisGorunur: 5,
  toplamUrun: 20,
  schemaKapsamasi: 60,
  otorite: 40,
};

describe("AI görünürlüğü ölçümü", () => {
  it("veri olmayan sinyali null bırakır", () => {
    const { kirilim } = aiGorunurlukSkoru({ ...TABAN, toplamUrun: 0, toplamSoru: 0 });

    expect(kirilim.urun_gorunurlugu).toBeNull();
    expect(kirilim.soru_kapsamasi).toBeNull();
    expect(kirilim.marka_gorunurlugu).not.toBeNull();
  });

  it("ölçülemeyen sinyal skoru aşağı çekmez", () => {
    const tam = aiGorunurlukSkoru(TABAN);
    const eksik = aiGorunurlukSkoru({ ...TABAN, toplamUrun: 0, toplamSoru: 0 });

    // Ürün ve soru sinyalleri düşükken bunların dışlanması skoru düşürmemeli.
    expect(eksik.skor).toBeGreaterThanOrEqual(tam.skor);
    expect(eksik.olculenSinyal).toBe(3);
  });

  it("marka sorgusu yapılamadıysa marka sinyali ölçülmemiş sayılır", () => {
    const { kirilim } = aiGorunurlukSkoru({ ...TABAN, markaOlculdu: false });
    expect(kirilim.marka_gorunurlugu).toBeNull();
  });

  it("hiçbir sinyal ölçülemezse skor sıfırdır", () => {
    const { skor, olculenSinyal } = aiGorunurlukSkoru({
      ...TABAN,
      markaOlculdu: false,
      toplamSayfa: 0,
      toplamKelime: 0,
      toplamUrun: 0,
      toplamSoru: 0,
    });
    expect(olculenSinyal).toBe(0);
    expect(skor).toBe(0);
  });
});
