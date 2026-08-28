import { describe, expect, it } from "vitest";

import {
  agirliklariHesapla,
  anaSozcuk,
  baslikCekirdegi,
  kapsamaOrani,
  konuYakinligi,
  anchorOner,
  govde,
  hedefIhtiyaci,
  kaynakGucu,
  kucult,
  oneriPuani,
  sozcukler,
} from "@/lib/analiz/ic-baglanti-cekirdek";
import { urlNormalle } from "@/lib/analiz/ic-baglanti";

describe("Türkçe metin işleme", () => {
  it("büyük İ harfini doğru küçültür", () => {
    // Varsayılan toLowerCase burada birleşik karakter üretir ve eşleşmeyi bozar.
    expect(kucult("İSTANBUL")).toBe("istanbul");
    expect(kucult("IŞIK")).toBe("ışık");
  });

  it("dolgu kelimeleri ve noktalamayı ayıklar", () => {
    expect(sozcukler("Vestel ve Arçelik için buzdolabı!")).toEqual([
      "vestel",
      "arçelik",
      "buzdolabı",
    ]);
  });

  it("rakamları korur", () => {
    expect(sozcukler("65 inç 4K televizyon")).toContain("65");
    expect(sozcukler("65 inç 4K televizyon")).toContain("4k");
  });

  it("boş girdide boş dizi döner", () => {
    expect(sozcukler(null)).toEqual([]);
    expect(sozcukler("")).toEqual([]);
  });

  it("Türkçe ekleri gövdede eşitler", () => {
    // "buzdolabı", "buzdolabında", "buzdolapları" aynı kökü göstermeli.
    expect(govde("buzdolabı")).toBe(govde("buzdolabında"));
    expect(govde("televizyon")).toBe(govde("televizyonlar"));
  });

  it("kısa kelimeyi bozmaz", () => {
    expect(govde("mont")).toBe("mont");
  });
});

describe("ayırt edicilik ağırlığı", () => {
  it("her belgede geçen kelimeye ağırlık vermez", () => {
    const belgeler = [
      ["fiyat", "buzdolabı"],
      ["fiyat", "televizyon"],
      ["fiyat", "çamaşır"],
    ];
    const a = agirliklariHesapla(belgeler);

    // "fiyat" üç belgenin üçünde de var → ayırt edici değil.
    expect(a.get(govde("fiyat"))).toBe(0);
    // "buzdolabı" tek belgede → ayırt edici.
    expect(a.get(govde("buzdolabı"))!).toBeGreaterThan(0);
  });
});

describe("alaka oranı", () => {
  const belgeler = [
    sozcukler("Vestel buzdolabı modelleri"),
    sozcukler("Arçelik çamaşır makinesi fiyatları"),
    sozcukler("Beko bulaşık makinesi"),
    sozcukler("Vestel no frost buzdolabı"),
  ];
  const agirlik = agirliklariHesapla(belgeler);

  it("aynı konudaki sayfada yüksek çıkar", () => {
    const oran = kapsamaOrani(
      sozcukler("vestel buzdolabı"),
      sozcukler("Vestel buzdolabı modelleri ve fiyatları"),
      agirlik,
    );
    expect(oran).toBeGreaterThan(0.9);
  });

  it("alakasız sayfada düşük çıkar", () => {
    const oran = kapsamaOrani(
      sozcukler("vestel buzdolabı"),
      sozcukler("Beko bulaşık makinesi"),
      agirlik,
    );
    expect(oran).toBeLessThan(0.2);
  });

  it("ek almış hâlini de eşleştirir", () => {
    const oran = kapsamaOrani(
      sozcukler("buzdolabı"),
      sozcukler("Buzdolabında saklama önerileri"),
      agirlik,
    );
    expect(oran).toBeGreaterThan(0.9);
  });

  it("boş hedefte sıfır döner", () => {
    expect(kapsamaOrani([], sozcukler("herhangi bir sayfa"), agirlik)).toBe(0);
  });
});

describe("konu yakınlığı", () => {
  const belgeler = [
    sozcukler("Vestel buzdolabı modelleri"),
    sozcukler("Arçelik çamaşır makinesi fiyatları"),
    sozcukler("Beko bulaşık makinesi"),
    sozcukler("Vestel no frost buzdolabı"),
    sozcukler("Buzdolabı modelleri ve fiyatları"),
    sozcukler("Kadın mont modelleri"),
  ];
  const agirlik = agirliklariHesapla(belgeler);
  const hedef = sozcukler("vestel no frost buzdolabı");

  it("ana sözcüğü ticari ekten ayırır", () => {
    expect(anaSozcuk(sozcukler("buzdolabı modelleri"))).toBe("buzdolabı");
    expect(anaSozcuk(sozcukler("vestel no frost buzdolabı"))).toBe("buzdolabı");
  });

  it("üst kategoriden alt kategoriye bağlantıyı yakalar", () => {
    // Kullanıcının verdiği asıl örnek: /vestel-buzdolabi → /vestel-no-frost-buzdolabi
    const y = konuYakinligi(hedef, sozcukler("Vestel Buzdolabı Modelleri"), agirlik);
    expect(y).toBeGreaterThan(0.5);
  });

  it("genel kategoriyi de kaynak sayar", () => {
    const y = konuYakinligi(hedef, sozcukler("Buzdolabı Modelleri ve Fiyatları"), agirlik);
    expect(y).toBeGreaterThan(0.5);
  });

  it("ana sözcük tutmayan sayfayı eler", () => {
    // Ana sözcük tutmadığında puan hiçbir zaman 0,5'i geçemez.
    expect(konuYakinligi(hedef, sozcukler("Kadın Mont Modelleri"), agirlik)).toBeLessThan(0.5);
    expect(konuYakinligi(hedef, sozcukler("Beko bulaşık makinesi"), agirlik)).toBeLessThan(0.5);
  });

  it("tam örtüşmede en yüksek puanı verir", () => {
    const y = konuYakinligi(hedef, sozcukler("Vestel No Frost Buzdolabı Rehberi"), agirlik);
    expect(y).toBeCloseTo(1, 5);
  });

  it("boş hedefte sıfır döner", () => {
    expect(konuYakinligi([], sozcukler("bir sayfa"), agirlik)).toBe(0);
  });
});

describe("hedef ihtiyacı", () => {
  it("ikinci sayfayı en kıymetli sayar", () => {
    const ortak = { hacim: 1000, gelenLink: 2 };
    const ikinciSayfa = hedefIhtiyaci({ ...ortak, pozisyon: 14 });
    const ilkUc = hedefIhtiyaci({ ...ortak, pozisyon: 2 });
    const cokGeride = hedefIhtiyaci({ ...ortak, pozisyon: 80 });

    expect(ikinciSayfa).toBeGreaterThan(ilkUc);
    expect(ikinciSayfa).toBeGreaterThan(cokGeride);
  });

  it("bağlantı almayan sayfayı öne çıkarır", () => {
    const oksuz = hedefIhtiyaci({ hacim: 500, pozisyon: 15, gelenLink: 0 });
    const doymus = hedefIhtiyaci({ hacim: 500, pozisyon: 15, gelenLink: 20 });
    expect(oksuz).toBeGreaterThan(doymus);
  });

  it("açlığı sitenin kendi ortalamasına göre ölçer", () => {
    // Menüsü geniş bir sitede 5 bağlantı azdır.
    const genisMenu = hedefIhtiyaci({ hacim: 500, pozisyon: 15, gelenLink: 5, referansLink: 80 });
    // Menüsü dar bir sitede aynı sayfa gayet iyi durumdadır.
    const darMenu = hedefIhtiyaci({ hacim: 500, pozisyon: 15, gelenLink: 5, referansLink: 4 });
    expect(genisMenu).toBeGreaterThan(darMenu);
  });

  it("yüksek hacmi öne çıkarır", () => {
    const yuksek = hedefIhtiyaci({ hacim: 50_000, pozisyon: 15, gelenLink: 3 });
    const dusuk = hedefIhtiyaci({ hacim: 10, pozisyon: 15, gelenLink: 3 });
    expect(yuksek).toBeGreaterThan(dusuk);
  });
});

describe("kaynak gücü", () => {
  it("bağlantı alan sayfa daha güçlüdür", () => {
    const guclu = kaynakGucu({ gelenLink: 20, gidenLink: 30, kelimeSayisi: 800 });
    const zayif = kaynakGucu({ gelenLink: 0, gidenLink: 30, kelimeSayisi: 800 });
    expect(guclu).toBeGreaterThan(zayif);
  });

  it("aşırı bağlantı veren sayfayı geri çeker", () => {
    const normal = kaynakGucu({ gelenLink: 10, gidenLink: 40, kelimeSayisi: 800 });
    const seyrelmis = kaynakGucu({ gelenLink: 10, gidenLink: 400, kelimeSayisi: 800 });
    expect(seyrelmis).toBeLessThan(normal);
  });

  it("gövde metni olmayan sayfayı geri çeker", () => {
    const dolu = kaynakGucu({ gelenLink: 10, gidenLink: 20, kelimeSayisi: 900 });
    const bos = kaynakGucu({ gelenLink: 10, gidenLink: 20, kelimeSayisi: 30 });
    expect(bos).toBeLessThan(dolu);
  });
});

describe("öneri puanı", () => {
  it("alaka ve güç arttıkça yükselir", () => {
    const dusuk = oneriPuani({ ihtiyac: 60, alaka: 0.4, guc: 0.4 });
    const yuksek = oneriPuani({ ihtiyac: 60, alaka: 1, guc: 1 });
    expect(yuksek).toBeGreaterThan(dusuk);
    expect(yuksek).toBeLessThanOrEqual(100);
  });
});

describe("bağlantı metni", () => {
  it("kategori için doğal Türkçe üretir", () => {
    expect(anchorOner({ keyword: "vestel no frost buzdolabı", sayfaTuru: "kategori", sira: 0 })).toBe(
      "Vestel no frost buzdolabı modelleri",
    );
  });

  it("her kaynak için farklı metin üretir", () => {
    const metinler = [0, 1, 2, 3].map((sira) =>
      anchorOner({ keyword: "kadın mont", sayfaTuru: "kategori", sira }),
    );
    // Aynı hedefe giden bağlantılar birbirinin kopyası olmamalı.
    expect(new Set(metinler).size).toBe(4);
  });

  it("kelime kalıbı zaten içeriyorsa tekrarlamaz", () => {
    const metin = anchorOner({
      keyword: "buzdolabı modelleri",
      sayfaTuru: "kategori",
      sira: 0,
    });
    expect(metin).toBe("Buzdolabı modelleri");
  });

  it("ürün sayfasında kelimenin kendisini kullanır", () => {
    expect(anchorOner({ keyword: "vestel nf480", sayfaTuru: "urun", sira: 0 })).toBe("Vestel nf480");
  });

  it("boş kelimede boş döner", () => {
    expect(anchorOner({ keyword: "  ", sayfaTuru: "kategori" })).toBe("");
  });

  it("ilk harfi Türkçe kurallarıyla büyütür", () => {
    expect(anchorOner({ keyword: "ısıtıcı", sayfaTuru: "urun", sira: 0 })).toBe("Isıtıcı");
  });
});

describe("başlık çekirdeği", () => {
  it("ayırıcıdan sonraki pazarlama ekini atar", () => {
    expect(baslikCekirdegi("Kitapyurdu e-kitap - ayda sadece 79,99tl")).toBe("Kitapyurdu e-kitap");
    expect(baslikCekirdegi("Vestel Buzdolabı | SEO Evi")).toBe("Vestel Buzdolabı");
  });

  it("fiyat kuyruğunu temizler", () => {
    expect(baslikCekirdegi("Vestel Buzdolabı 24.999 TL")).toBe("Vestel Buzdolabı");
  });

  it("çok uzun başlığı kısaltır", () => {
    const uzun = "bir iki üç dört beş altı yedi sekiz dokuz on";
    expect(baslikCekirdegi(uzun).split(" ")).toHaveLength(8);
  });

  it("boş başlıkta boş döner", () => {
    expect(baslikCekirdegi(null)).toBe("");
    expect(baslikCekirdegi("")).toBe("");
  });

  it("temiz başlığı bozmaz", () => {
    expect(baslikCekirdegi("Vestel No Frost Buzdolabı")).toBe("Vestel No Frost Buzdolabı");
  });
});

describe("adres normalleştirme", () => {
  it("sondaki eğik çizgiyi kaldırır", () => {
    expect(urlNormalle("https://a.com/kategori/")).toBe("https://a.com/kategori");
  });

  it("çapa parçasını atar", () => {
    expect(urlNormalle("https://a.com/sayfa#bolum")).toBe("https://a.com/sayfa");
  });

  it("kök adresi bozmaz", () => {
    expect(urlNormalle("https://a.com/")).toBe("https://a.com");
  });
});
