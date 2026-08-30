import { describe, expect, it } from "vitest";

import {
  aylikMaliyet,
  beklenenMaliyet,
  tavanMaliyetOrani,
  BIRIM_MALIYET,
  HEDEF_MALIYET_ORANI,
  maliyetOrani,
  surdurulebilirMi,
  USD_TRY,
  type LimitGirdisi,
} from "@/lib/maliyet";

/**
 * Paket limitleri doğrudan kâr/zarar demek.
 * Bir limit yanlış hesaplanırsa her abone zarar ettirir.
 */

/** Canlıdaki paket limitleri (0009_paketler_yeni_fiyat.sql ile aynı). */
const PAKETLER: { ad: string; fiyat: number; limit: LimitGirdisi }[] = [
  {
    ad: "Başlangıç",
    fiyat: 499,
    limit: {
      gunluk_serp: 15, dogrulanan_kelime: 50, hiz_olcum_sayfa: 10, satici_karsilastirma: false, isletme_yorumlari: true, aylik_site_taramasi: 2, tarama_sayfa: 300,
      aylik_kelime_arastirmasi: 8, aylik_ai: 35, rakip: 2,
      geri_baglanti: false, merchant: false, ai_gorunurlugu: false,
    },
  },
  {
    ad: "Profesyonel",
    fiyat: 999,
    limit: {
      gunluk_serp: 30, dogrulanan_kelime: 150, hiz_olcum_sayfa: 20, satici_karsilastirma: true, isletme_yorumlari: true, aylik_site_taramasi: 4, tarama_sayfa: 600,
      aylik_kelime_arastirmasi: 12, aylik_ai: 45, rakip: 5,
      geri_baglanti: true, merchant: true, ai_gorunurlugu: true,
    },
  },
  {
    ad: "Kurumsal",
    fiyat: 1499,
    limit: {
      gunluk_serp: 45, dogrulanan_kelime: 300, hiz_olcum_sayfa: 25, satici_karsilastirma: true, isletme_yorumlari: true, aylik_site_taramasi: 6, tarama_sayfa: 1000,
      aylik_kelime_arastirmasi: 20, aylik_ai: 55, rakip: 10,
      geri_baglanti: true, merchant: true, ai_gorunurlugu: true,
    },
  },
];

const DENEME: LimitGirdisi = {
  gunluk_serp: 3, dogrulanan_kelime: 10, hiz_olcum_sayfa: 3, satici_karsilastirma: false, isletme_yorumlari: false, aylik_site_taramasi: 1, tarama_sayfa: 150,
  aylik_kelime_arastirmasi: 1, aylik_ai: 4, rakip: 1,
  geri_baglanti: false, merchant: false, ai_gorunurlugu: false,
};

describe("birim maliyetler", () => {
  it("sağlayıcı fiyat listesiyle uyumlu", () => {
    // Bu değerler sağlayıcıya gerçek istek atılarak ölçülmüştür
    // (30 Ağustos 2026). Değişirse paket limitleri gözden geçirilmelidir.
    expect(BIRIM_MALIYET.serp).toBe(0.006);
    expect(BIRIM_MALIYET.serpGorev).toBe(0.0018);
    expect(BIRIM_MALIYET.taramaSayfa).toBe(0.00015);
    expect(BIRIM_MALIYET.kelimeArastirmasi).toBe(0.09);
  });

  it("kelime araştırması en pahalı uç noktadır", () => {
    // Limitlerin en sıkı tutulması gereken kalem budur.
    expect(BIRIM_MALIYET.kelimeArastirmasi).toBeGreaterThan(BIRIM_MALIYET.serp * 6);
  });
});

describe("aylikMaliyet", () => {
  it("SERP maliyetini gün sayısıyla çarpar", () => {
    const m = aylikMaliyet({ ...DENEME, gunluk_serp: 100 }, 30);
    expect(m.serp).toBeCloseTo(100 * 30 * 0.006, 5);
  });

  it("tarama maliyetini sayfa başına hesaplar", () => {
    const m = aylikMaliyet({ ...DENEME, aylik_site_taramasi: 10, tarama_sayfa: 1000 });
    expect(m.tarama).toBeCloseTo(10 * 1000 * 0.00015, 5);
  });

  it("kapalı özellikler için maliyet üretmez", () => {
    const m = aylikMaliyet({ ...DENEME, geri_baglanti: false, merchant: false });
    expect(m.backlink).toBe(0);
    expect(m.merchant).toBe(0);
  });

  it("açık özellikler maliyet ekler", () => {
    const kapali = aylikMaliyet({ ...DENEME, geri_baglanti: false, merchant: false });
    const acik = aylikMaliyet({ ...DENEME, geri_baglanti: true, merchant: true });
    expect(acik.toplam).toBeGreaterThan(kapali.toplam);
  });

  it("toplam, kalemlerin toplamına eşittir", () => {
    const m = aylikMaliyet(PAKETLER[1].limit);
    const kalemler =
      m.serp +
      m.siraDogrulama +
      m.sayfaHizi +
      m.saticiVeYorum +
      m.tarama +
      m.kelimeArastirmasi +
      m.labs +
      m.backlink +
      m.merchant +
      m.icerik +
      m.ai;
    expect(m.toplam).toBeCloseTo(kalemler, 6);
  });
});

describe("kullanım payı", () => {
  /*
   * Limitlerin çoğu taahhüt değil tavandır. Ölçülen gerçek birim
   * fiyatlarla "her gün tavana vurulur" varsayımı paketleri %43–%53
   * maliyet oranında gösteriyordu; kimsenin yapmadığı bir kullanımın
   * parasını fiyata koymak anlamına gelirdi. Bu yüzden iki ayrı rakam
   * hesaplanır ve fiyatlandırma beklenen maliyete bakar.
   */
  it("beklenen maliyet tavanın altındadır", () => {
    const l = PAKETLER[2].limit;
    expect(beklenenMaliyet(l).toplam).toBeLessThan(aylikMaliyet(l).toplam);
  });

  it("pay verilmezse tavan hesaplanır", () => {
    const l = PAKETLER[1].limit;
    expect(aylikMaliyet(l, 30, {}).toplam).toBeCloseTo(aylikMaliyet(l).toplam, 6);
  });

  it("tavan oranı gizlenmez, ayrıca hesaplanabilir", () => {
    // Riskin büyüklüğü görünür kalmalı: bugün tavan oranları %25'in
    // üzerinde ve bu bilerek kabul edilmiş bir risktir.
    const { limit, fiyat } = PAKETLER[2];
    expect(tavanMaliyetOrani(limit, fiyat)).toBeGreaterThan(maliyetOrani(limit, fiyat));
  });
});

describe("paket sürdürülebilirliği", () => {
  it.each(PAKETLER)("$ad paketi hedef maliyet oranını aşmaz", ({ fiyat, limit }) => {
    expect(surdurulebilirMi(limit, fiyat)).toBe(true);
  });

  it.each(PAKETLER)("$ad paketinin maliyet oranı makul aralıkta", ({ fiyat, limit }) => {
    const oran = maliyetOrani(limit, fiyat);
    // Çok düşükse limitler gereksiz cimri, çok yüksekse zarar ediliyor.
    expect(oran).toBeGreaterThan(0.1);
    expect(oran).toBeLessThanOrEqual(HEDEF_MALIYET_ORANI);
  });

  it("limitler yükseltilirse paket sürdürülemez hâle gelir", () => {
    // Modelin gerçekten koruma sağladığını doğrular.
    const asiri = { ...PAKETLER[0].limit, gunluk_serp: 900 };
    expect(surdurulebilirMi(asiri, PAKETLER[0].fiyat)).toBe(false);
  });

  it("paketler büyüdükçe maliyet de büyür", () => {
    const maliyetler = PAKETLER.map((p) => aylikMaliyet(p.limit).toplam);
    expect(maliyetler[0]).toBeLessThan(maliyetler[1]);
    expect(maliyetler[1]).toBeLessThan(maliyetler[2]);
  });
});

describe("ücretsiz deneme maliyeti", () => {
  it("kayıt başına maliyet 0,75 doların altında kalır", () => {
    // Sahte hesapla kötüye kullanımın bize maliyetini sınırlar.
    // Giriş paketi 499 TL olduğu için deneme maliyeti de düşük tutulmalı.
    const m = aylikMaliyet(DENEME, 7);
    expect(m.toplam).toBeLessThan(0.75);
  });

  it("denemede ücretli özellikler kapalıdır", () => {
    expect(DENEME.geri_baglanti).toBe(false);
    expect(DENEME.merchant).toBe(false);
    expect(DENEME.ai_gorunurlugu).toBe(false);
  });

  it("deneme, en ucuz ücretli paketten belirgin biçimde dardır", () => {
    const deneme = aylikMaliyet(DENEME, 7).toplam;
    const baslangic = aylikMaliyet(PAKETLER[0].limit, 30).toplam;
    expect(deneme).toBeLessThan(baslangic / 3);
  });
});

describe("kur", () => {
  it("gelir hesabında kur kullanılır", () => {
    const oran = maliyetOrani(PAKETLER[0].limit, PAKETLER[0].fiyat);
    // Oran BEKLENEN maliyet üzerinden hesaplanır; tavan ayrıca raporlanır.
    const beklenen = beklenenMaliyet(PAKETLER[0].limit).toplam / (PAKETLER[0].fiyat / USD_TRY);
    expect(oran).toBeCloseTo(beklenen, 6);
  });

  it("lira değer kaybederse maliyet oranı yükselir", () => {
    // Kur riski gerçek: TL zayıfladıkça API maliyeti gelire göre artar.
    const dusukKur = aylikMaliyet(PAKETLER[0].limit).toplam / (PAKETLER[0].fiyat / 40);
    const yuksekKur = aylikMaliyet(PAKETLER[0].limit).toplam / (PAKETLER[0].fiyat / 60);
    expect(yuksekKur).toBeGreaterThan(dusukKur);
  });
});
