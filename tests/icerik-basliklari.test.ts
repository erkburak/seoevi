import { describe, expect, it } from "vitest";

import { tekrariSadelestir } from "@/lib/analiz/icerik";

/**
 * Rakip başlıklarında site kabuğu ayıklanmalı.
 *
 * Bazı temalar aynı metni hem görünür hem erişilebilirlik etiketinde
 * verir; ayrıştırıcı bunları yan yana getirince "DESTEK DESTEK" gibi
 * başlıklar oluşur ve kullanıcıya başlık önerisi diye sunulur.
 */
describe("başlık sadeleştirme", () => {
  it("kendini tekrar eden metni tekile indirir", () => {
    expect(tekrariSadelestir("DESTEK DESTEK")).toBe("DESTEK");
    expect(tekrariSadelestir("ÖZEL SAYFALAR ÖZEL SAYFALAR")).toBe("ÖZEL SAYFALAR");
    expect(tekrariSadelestir("VESTEL.COM.TR VESTEL.COM.TR")).toBe("VESTEL.COM.TR");
  });

  it("büyük-küçük harf farkını yok sayar", () => {
    expect(tekrariSadelestir("Destek DESTEK")).toBe("Destek");
  });

  it("gerçek başlığı bozmaz", () => {
    expect(tekrariSadelestir("Vestel No Frost Buzdolabı Modelleri")).toBe(
      "Vestel No Frost Buzdolabı Modelleri",
    );
    expect(tekrariSadelestir("Enerji Sınıfı")).toBe("Enerji Sınıfı");
  });

  it("fazla boşlukları toplar", () => {
    expect(tekrariSadelestir("  Net   Hacim  ")).toBe("Net Hacim");
  });
});
