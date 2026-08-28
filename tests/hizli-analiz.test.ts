import { afterEach, describe, expect, it, vi } from "vitest";

import { hizliAnalizYap } from "@/lib/araclar/hizli-analiz";

/**
 * Ücretsiz SEO analizi herkese açık bir uç noktadır ve
 * gerçek veriyle çalıştığını iddia eder. Ayrıştırma hataları
 * kullanıcıya yanlış bilgi gösterilmesine yol açar.
 */

function sayfaCevabi(html: string, durum = 200): Response {
  return new Response(html, {
    status: durum,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const TAM_SAYFA = `<!doctype html>
<html lang="tr">
<head>
  <title>Vestel No Frost Buzdolabı Modelleri ve Fiyatları</title>
  <meta name="description" content="Vestel no frost buzdolabı modellerini karşılaştırın, size en uygun olanı bulun. Ücretsiz kargo ve kolay iade avantajıyla hemen sipariş verin bugün.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="https://magazam.com/urun/vestel">
  <meta property="og:title" content="Vestel Buzdolabı">
  <script type="application/ld+json">{"@type":"Product","name":"Vestel"}</script>
</head>
<body>
  <h1>Vestel No Frost Buzdolabı</h1>
  <h2>Teknik Özellikler</h2>
  <h2>Kullanıcı Yorumları</h2>
  <img src="a.jpg" alt="Vestel buzdolabı önden görünüm">
  <img src="b.jpg">
  <a href="/kategori/beyaz-esya">Beyaz Eşya</a>
  <a href="https://baskasite.com">Dış bağlantı</a>
  <p>${"Buzdolabı hakkında ayrıntılı bilgi. ".repeat(60)}</p>
</body>
</html>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hizliAnalizYap", () => {
  it("geçersiz adresi analiz etmeden reddeder", async () => {
    const sonuc = await hizliAnalizYap("iki kelime");
    expect("hata" in sonuc).toBe(true);
  });

  it("temel SEO alanlarını doğru çıkarır", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sayfaCevabi(TAM_SAYFA)));

    const sonuc = await hizliAnalizYap("magazam.com");
    expect("hata" in sonuc).toBe(false);
    if ("hata" in sonuc) return;

    expect(sonuc.title).toBe("Vestel No Frost Buzdolabı Modelleri ve Fiyatları");
    expect(sonuc.h1).toEqual(["Vestel No Frost Buzdolabı"]);
    expect(sonuc.h2Sayisi).toBe(2);
    expect(sonuc.gorselSayisi).toBe(2);
    expect(sonuc.altMetinsizGorsel).toBe(1);
    expect(sonuc.canonical).toBe("https://magazam.com/urun/vestel");
    expect(sonuc.viewport).toBe(true);
    expect(sonuc.ogEtiketleri).toBe(true);
    expect(sonuc.dilEtiketi).toBe("tr");
    expect(sonuc.schemaTurleri).toContain("Product");
    expect(sonuc.robotsNoindex).toBe(false);
  });

  it("iyi durumdaki sayfaya yüksek skor verir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sayfaCevabi(TAM_SAYFA)));

    const sonuc = await hizliAnalizYap("magazam.com");
    if ("hata" in sonuc) throw new Error("Analiz beklenmedik şekilde başarısız oldu.");

    expect(sonuc.skor).toBeGreaterThan(70);
  });

  it("eksik sayfada kritik bulguları raporlar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sayfaCevabi("<html><body><p>merhaba</p></body></html>")),
    );

    const sonuc = await hizliAnalizYap("magazam.com");
    if ("hata" in sonuc) throw new Error("Analiz beklenmedik şekilde başarısız oldu.");

    const kodlar = sonuc.bulgular.map((b) => b.kod);
    expect(kodlar).toContain("title_yok");
    expect(kodlar).toContain("aciklama_yok");
    expect(kodlar).toContain("h1_yok");
    expect(sonuc.skor).toBeLessThan(50);
  });

  it("noindex etiketini kritik olarak işaretler", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        sayfaCevabi('<html><head><meta name="robots" content="noindex,follow"></head><body></body></html>'),
      ),
    );

    const sonuc = await hizliAnalizYap("magazam.com");
    if ("hata" in sonuc) throw new Error("Analiz beklenmedik şekilde başarısız oldu.");

    expect(sonuc.robotsNoindex).toBe(true);
    expect(sonuc.bulgular.find((b) => b.kod === "noindex")?.onem).toBe("kritik");
  });

  it("birden fazla H1 kullanımını uyarır", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => sayfaCevabi("<html><body><h1>Bir</h1><h1>İki</h1></body></html>")),
    );

    const sonuc = await hizliAnalizYap("magazam.com");
    if ("hata" in sonuc) throw new Error("Analiz beklenmedik şekilde başarısız oldu.");

    expect(sonuc.h1).toHaveLength(2);
    expect(sonuc.bulgular.map((b) => b.kod)).toContain("h1_fazla");
  });

  it("HTML olmayan yanıtı reddeder", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{}", { status: 200, headers: { "content-type": "application/json" } }),
      ),
    );

    const sonuc = await hizliAnalizYap("magazam.com");
    expect("hata" in sonuc).toBe(true);
  });

  it("hata durum kodunu kullanıcıya anlaşılır biçimde bildirir", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sayfaCevabi("<html></html>", 500)));

    const sonuc = await hizliAnalizYap("magazam.com");
    expect("hata" in sonuc).toBe(true);
    if ("hata" in sonuc) {
      // Teknik ayrıntı değil, yapılabilecek bir eylem anlatılmalı.
      expect(sonuc.hata).toContain("500");
      expect(sonuc.hata).toContain("herkese açık");
    }
  });

  it("ağ hatasında teknik ayrıntı sızdırmaz", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED 10.0.0.1:443");
      }),
    );

    const sonuc = await hizliAnalizYap("magazam.com");
    expect("hata" in sonuc).toBe(true);
    if ("hata" in sonuc) {
      expect(sonuc.hata).not.toContain("ECONNREFUSED");
      expect(sonuc.hata).toContain("ulaşılamadı");
    }
  });
});
