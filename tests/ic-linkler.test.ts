import { describe, expect, it } from "vitest";

import { IC_LINKLER, sayfaIcinLinkler } from "@/config/ic-linkler";

/**
 * Sitenin kendi iç bağlantı planı.
 *
 * İki kural koda gömülüdür ve bozulursa SEO açısından zarar verir:
 * bir sayfa kendine bağlanmamalı, ve uzun ifadeler kısa olanlardan önce
 * denenmeli — aksi hâlde "e-ticaret SEO aracı" ifadesi "e-ticaret SEO"
 * tarafından yenir ve yanlış sayfaya bağlanır.
 */

describe("iç bağlantı planı", () => {
  it("sayfa kendine bağlanmaz", () => {
    for (const hedef of new Set(IC_LINKLER.map((l) => l.href))) {
      const linkler = sayfaIcinLinkler(hedef);
      expect(linkler.some((l) => l.href === hedef), `${hedef} kendine bağlanıyor`).toBe(false);
    }
  });

  it("diğer bağlantılar korunur", () => {
    const anaSayfada = sayfaIcinLinkler("/");
    expect(anaSayfada.length).toBe(IC_LINKLER.filter((l) => l.href !== "/").length);
  });

  it("uzun ifadeler kısa olanlardan önce gelir", () => {
    /*
     * Bir ifade, kendisini içeren daha uzun bir ifadeden SONRA gelmeli.
     * Aksi hâlde kısa ifade önce eşleşir ve uzun olanın hedefi kaçırılır.
     */
    for (let i = 0; i < IC_LINKLER.length; i += 1) {
      for (let j = i + 1; j < IC_LINKLER.length; j += 1) {
        const once = IC_LINKLER[i].ifade.toLocaleLowerCase("tr");
        const sonra = IC_LINKLER[j].ifade.toLocaleLowerCase("tr");
        expect(
          sonra.includes(once),
          `"${once}" ifadesi "${sonra}" ifadesinden önce geliyor; sıralama ters olmalı`,
        ).toBe(false);
      }
    }
  });

  it("ana hedef kelime ana sayfaya gider", () => {
    const ana = IC_LINKLER.find((l) => l.ifade === "e-ticaret SEO");
    expect(ana?.href).toBe("/");
  });

  it("aynı ifade iki kez tanımlanmaz", () => {
    const ifadeler = IC_LINKLER.map((l) => l.ifade.toLocaleLowerCase("tr"));
    expect(new Set(ifadeler).size).toBe(ifadeler.length);
  });

  it("tüm hedefler kök göreli adrestir", () => {
    for (const l of IC_LINKLER) {
      expect(l.href.startsWith("/"), `${l.href} kök göreli değil`).toBe(true);
    }
  });
});
