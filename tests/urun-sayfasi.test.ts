import { afterEach, describe, expect, it, vi } from "vitest";

import { urunSayfasiDenetle } from "@/lib/araclar/urun-sayfasi";

/**
 * Ürün sayfası SEO testi.
 *
 * Aracın can alıcı iddiası şu: "sayfanızda fiyatı siz görüyorsunuz ama
 * Google göremiyor olabilir." Bu iddia ancak yapısal veriyi doğru
 * okuyorsak dürüsttür. Yanlış okuyup "fiyat yok" demek, kullanıcıyı var
 * olmayan bir sorunu düzeltmeye uğraştırır.
 */

function sayfa(icerik: string, { durum = 200 }: { durum?: number } = {}) {
  return {
    ok: durum >= 200 && durum < 300,
    status: durum,
    headers: new Headers({ "content-type": "text/html; charset=utf-8" }),
    text: async () => icerik,
  } as unknown as Response;
}

function jsonLd(nesne: unknown): string {
  return `<html><head><title>Ürün</title><script type="application/ld+json">${JSON.stringify(
    nesne,
  )}</script></head><body><h1>Ürün</h1></body></html>`;
}

afterEach(() => vi.unstubAllGlobals());

describe("urunSayfasiDenetle", () => {
  it("düz Product şemasından tüm alanları okur", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sayfa(
          jsonLd({
            "@context": "https://schema.org",
            "@type": "Product",
            name: "Triko Kazak",
            brand: "Chuba",
            sku: "23S2030BL",
            offers: {
              "@type": "Offer",
              price: "869.99",
              priceCurrency: "try",
              availability: "https://schema.org/InStock",
            },
            aggregateRating: { "@type": "AggregateRating", ratingValue: "4.5", reviewCount: "82" },
          }),
        ),
      ),
    );

    const s = await urunSayfasiDenetle("magazam.com/urun/triko-kazak");
    if ("hata" in s) throw new Error(s.hata);

    expect(s.urunSemasiVar).toBe(true);
    expect(s.ad).toBe("Triko Kazak");
    expect(s.fiyat).toBe("869.99");
    // Siteler para birimini küçük harfle yazıyor; ISO kodu büyük harftir.
    expect(s.paraBirimi).toBe("TRY");
    expect(s.stokTurkce).toBe("Stokta var");
    expect(s.puan).toBe("4.5");
    expect(s.yorumSayisi).toBe("82");
    expect(s.marka).toBe("Chuba");
    expect(s.gtin).toBe("23S2030BL");
  });

  it("@graph içine gömülü şemayı bulur", async () => {
    // Yaygın kurulum: tüm şemalar tek bir @graph dizisinde toplanır.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sayfa(
          jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "WebSite", name: "Mağaza" },
              { "@type": "BreadcrumbList", itemListElement: [] },
              {
                "@type": "Product",
                name: "Bomber Ceket",
                offers: { "@type": "Offer", price: "1299", priceCurrency: "TRY" },
              },
            ],
          }),
        ),
      ),
    );

    const s = await urunSayfasiDenetle("magazam.com/urun/bomber");
    if ("hata" in s) throw new Error(s.hata);

    expect(s.urunSemasiVar).toBe(true);
    expect(s.ad).toBe("Bomber Ceket");
    expect(s.kirintiVar).toBe(true);
  });

  it("şema yoksa bunu kritik bulgu sayar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sayfa("<html><head><title>Ürün</title></head><body><h1>Ürün</h1></body></html>")),
    );

    const s = await urunSayfasiDenetle("magazam.com/urun/x");
    if ("hata" in s) throw new Error(s.hata);

    expect(s.urunSemasiVar).toBe(false);
    expect(s.bulgular.find((b) => b.kod === "urun_semasi_yok")?.onem).toBe("kritik");
  });

  it("bozuk JSON-LD bloğu diğerlerini engellemez", async () => {
    // Bozuk şema sahada çok yaygın; tek blok yüzünden analiz düşmemeli.
    const html = `<html><head>
      <script type="application/ld+json">{ bu gecerli json degil }</script>
      <script type="application/ld+json">${JSON.stringify({
        "@type": "Product",
        name: "Kolej Ceket",
      })}</script>
    </head><body></body></html>`;

    vi.stubGlobal("fetch", vi.fn(async () => sayfa(html)));

    const s = await urunSayfasiDenetle("magazam.com/urun/kolej");
    if ("hata" in s) throw new Error(s.hata);

    expect(s.ad).toBe("Kolej Ceket");
  });

  it("bot koruması olan siteyi ayrı mesajla bildirir", async () => {
    /*
     * Büyük pazaryerleri otomatik erişimi 403 ile engelliyor. Bunu
     * "adres yanlış" diye göstermek kullanıcıyı boşuna uğraştırır.
     */
    vi.stubGlobal("fetch", vi.fn(async () => sayfa("", { durum: 403 })));

    const s = await urunSayfasiDenetle("pazaryeri.com/urun/x");

    expect("hata" in s).toBe(true);
    if ("hata" in s) expect(s.hata).toContain("otomatik erişimi engelliyor");
  });

  it("eksik alan arttıkça skor düşer", async () => {
    const tamHtml = jsonLd({
      "@type": "Product",
      name: "Tam Ürün",
      brand: "Marka",
      sku: "ABC",
      offers: { "@type": "Offer", price: "100", priceCurrency: "TRY", availability: "InStock" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "5", reviewCount: "10" },
    });

    vi.stubGlobal("fetch", vi.fn(async () => sayfa(tamHtml)));
    const tam = await urunSayfasiDenetle("magazam.com/a");

    vi.stubGlobal("fetch", vi.fn(async () => sayfa("<html><body></body></html>")));
    const bos = await urunSayfasiDenetle("magazam.com/b");

    if ("hata" in tam || "hata" in bos) throw new Error("beklenmedik hata");
    expect(tam.skor).toBeGreaterThan(bos.skor);
  });
});
