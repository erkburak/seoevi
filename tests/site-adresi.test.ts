import { describe, expect, it } from "vitest";

import { siteAdresi } from "@/config/site";

/**
 * Site adresi sessizce bozulabilecek bir yerdir.
 *
 * Yaşanan arıza: ortam değişkenine `http://seoevi.com.tr` yazılmıştı.
 * Bu adres kanonik etiketlerde, site haritasında, OG etiketlerinde ve
 * OAuth yönlendirmelerinde kullanıldığı için üç şey aynı anda bozuldu:
 * Google https bir sitede http kanonik gördü, Search Console bağlantısı
 * `redirect_uri_mismatch` ile reddedildi, paylaşım önizlemeleri karıştı.
 * Hiçbiri hata vermediği için fark edilmesi zordu.
 */
describe("siteAdresi", () => {
  it("üretimde http'yi https'e çevirir", () => {
    expect(siteAdresi("http://seoevi.com.tr")).toBe("https://seoevi.com.tr");
  });

  it("yerel geliştirmede http'ye dokunmaz", () => {
    // localhost'ta sertifika yok; https'e zorlamak geliştirmeyi kırar.
    expect(siteAdresi("http://localhost:3000")).toBe("http://localhost:3000");
    expect(siteAdresi("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });

  it("sondaki eğik çizgiyi atar", () => {
    // Aksi hâlde `${SITE.url}/fiyatlandirma` çift çizgi üretir.
    expect(siteAdresi("https://seoevi.com.tr/")).toBe("https://seoevi.com.tr");
    expect(siteAdresi("https://seoevi.com.tr///")).toBe("https://seoevi.com.tr");
  });

  it("tanımsızsa üretim adresine düşer", () => {
    expect(siteAdresi(undefined)).toBe("https://seoevi.com.tr");
  });

  it("boşlukları temizler", () => {
    expect(siteAdresi("  https://seoevi.com.tr  ")).toBe("https://seoevi.com.tr");
  });
});
