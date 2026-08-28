import "server-only";

import { serpGetir } from "@/lib/dataforseo/serp";
import { ulkeKonumu } from "@/lib/dataforseo/locations";
import { alanAdiNormalize } from "@/lib/utils";
import type { Cihaz } from "@/types/database";

/**
 * Google Sıra Bulucu.
 *
 * Bir alan adının verilen anahtar kelimedeki gerçek sırasını bulur.
 * SERP yanıtı önbelleklendiğinden, aynı kelimeyi soran ikinci kullanıcı
 * için sağlayıcıya yeni bir çağrı yapılmaz.
 */

export type RakipSatiri = {
  pozisyon: number;
  alanAdi: string;
  baslik: string | null;
  url: string | null;
  bizMiyiz: boolean;
};

export type SiraSonucu = {
  keyword: string;
  alanAdi: string;
  cihaz: Cihaz;
  /** Bulunamadıysa null — ilk 100 içinde değil. */
  pozisyon: number | null;
  url: string | null;
  baslik: string | null;
  /** Sıralamaya göre tahmini aylık tıklama payı (%). */
  tiklamaPayi: number | null;
  ilkOnda: boolean;
  ilkSayfada: boolean;
  toplamSonuc: number | null;
  ilkOnRakip: RakipSatiri[];
  serpOzellikleri: { tur: string; ad: string; bizde: boolean }[];
  sorular: string[];
  alisverisVar: boolean;
  /** Kullanıcıya gösterilecek yorum. */
  yorum: string;
  oneriler: string[];
};

/** Pozisyona göre yaklaşık tıklama oranı (%). */
function tiklamaOrani(pozisyon: number): number {
  const tablo = [27.8, 15.2, 11.0, 7.7, 5.6, 4.2, 3.2, 2.6, 2.2, 1.9];
  if (pozisyon <= 10) return tablo[pozisyon - 1];
  if (pozisyon <= 20) return 1.2;
  if (pozisyon <= 30) return 0.6;
  return 0.2;
}

function yorumUret(pozisyon: number | null, alisverisVar: boolean): string {
  if (pozisyon === null) {
    return "Bu kelimede ilk 100 sonuç içinde görünmüyorsunuz. Sayfanın bu kelimeye odaklanması ve içerik derinliğinin artırılması gerekiyor.";
  }
  if (pozisyon === 1) {
    return "Bu kelimede ilk sıradasınız. Tıklamaların yaklaşık dörtte biri size geliyor; bu konumu korumak için içeriği güncel tutun.";
  }
  if (pozisyon <= 3) {
    return "İlk üçtesiniz. Buradan ilk sıraya çıkmak, tıklama payınızı kabaca iki katına çıkarabilir.";
  }
  if (pozisyon <= 10) {
    return "İlk sayfadasınız. Başlık ve açıklamanızı iyileştirerek, içeriğinizi derinleştirerek üst sıralara çıkabilirsiniz.";
  }
  if (pozisyon <= 20) {
    return alisverisVar
      ? "İkinci sayfadasınız ve bu kelimede alışveriş sonuçları var. İlk sayfaya çok yakınsınız; ürün verinizi eksiksiz tamamlamak hızlı kazanç sağlayabilir."
      : "İkinci sayfadasınız. İlk sayfaya en yakın konumdasınız; bu kelime öncelikli çalışılmaya değer.";
  }
  if (pozisyon <= 50) {
    return "İlk sayfanın uzağındasınız ancak Google sayfanızı bu kelimeyle ilişkilendirmiş. İçerik ve iç bağlantı çalışmasıyla yükselme alanınız var.";
  }
  return "Sıralamanız çok geride. Bu kelime için ayrı ve odaklı bir sayfa hazırlamak daha verimli olabilir.";
}

function onerilerUret(sonuc: {
  pozisyon: number | null;
  alisverisVar: boolean;
  ozellikSayisi: number;
  soruVar: boolean;
}): string[] {
  const o: string[] = [];

  if (sonuc.pozisyon === null) {
    o.push("Bu kelimeyi hedefleyen özel bir sayfa oluşturun; başlıkta ve H1'de doğrudan kullanın.");
    o.push("Rakiplerin ilk sayfadaki içeriklerini inceleyip ele aldıkları konuları kapsayın.");
  } else if (sonuc.pozisyon > 10 && sonuc.pozisyon <= 20) {
    o.push("İkinci sayfadan ilk sayfaya çıkmak en hızlı kazançtır; bu sayfaya öncelik verin.");
    o.push("Başlık etiketini kelimeyle başlayacak biçimde yeniden yazın.");
  } else if (sonuc.pozisyon <= 10) {
    o.push("Meta açıklamanızı tıklama alacak biçimde güncelleyin; sıralama değişmeden trafik artabilir.");
  }

  if (sonuc.alisverisVar) {
    o.push("Bu kelimede Google Alışveriş alanı açık. Ürün verinizde GTIN, marka, fiyat ve stok bilgisi eksiksiz olmalı.");
  }
  if (sonuc.soruVar) {
    o.push("Arama sonuçlarında soru kutusu var. Bu soruları sayfanızda doğrudan cevaplayın.");
  }
  if (sonuc.ozellikSayisi >= 3) {
    o.push("Sonuç sayfası yoğun; organik alan dar. Yapısal veri ekleyerek zengin gösterim şansınızı artırın.");
  }

  return o.slice(0, 4);
}

export type SiraHatasi = { hata: string };

export async function siraBul({
  site,
  keyword,
  cihaz = "desktop",
}: {
  site: string;
  keyword: string;
  cihaz?: Cihaz;
}): Promise<SiraSonucu | SiraHatasi> {
  const adres = alanAdiNormalize(site);
  if (!adres.gecerli) return { hata: adres.hata };

  const temizKelime = keyword.trim();
  if (temizKelime.length < 2) return { hata: "En az iki karakterlik bir anahtar kelime girin." };
  if (temizKelime.length > 120) return { hata: "Anahtar kelime çok uzun." };

  const konum = await ulkeKonumu("TR");

  const serp = await serpGetir({
    keyword: temizKelime,
    locationCode: konum.location_code,
    languageCode: "tr",
    device: cihaz,
    bizimAlanAdi: adres.domain,
    derinlik: 100,
    // Ücretsiz araçta 24 saatlik önbellek kullanılır: aynı kelimeyi soran
    // ikinci kullanıcı için sağlayıcıya gidilmez.
    grup: "serp_arac",
  });

  const organikler = serp.ogeler
    .filter((o) => o.tur === "organic" && o.url)
    .sort((a, b) => (a.pozisyon ?? 999) - (b.pozisyon ?? 999));

  const bizimki = organikler.find((o) => o.bizim_mi) ?? null;
  const pozisyon = bizimki?.pozisyon ?? null;

  const ilkOnRakip: RakipSatiri[] = organikler.slice(0, 10).map((o) => ({
    pozisyon: o.pozisyon ?? 0,
    alanAdi: o.alan_adi ?? "",
    baslik: o.baslik,
    url: o.url,
    bizMiyiz: o.bizim_mi,
  }));

  const ozellikler = serp.ozellikler.map((o) => ({
    tur: o.tur,
    ad: o.ad,
    bizde: o.bizde_mi,
  }));

  return {
    keyword: temizKelime,
    alanAdi: adres.domain,
    cihaz,
    pozisyon,
    url: bizimki?.url ?? null,
    baslik: bizimki?.baslik ?? null,
    tiklamaPayi: pozisyon ? tiklamaOrani(pozisyon) : null,
    ilkOnda: pozisyon !== null && pozisyon <= 10,
    ilkSayfada: pozisyon !== null && pozisyon <= 10,
    toplamSonuc: serp.toplam_sonuc,
    ilkOnRakip,
    serpOzellikleri: ozellikler,
    sorular: serp.sorular.slice(0, 6),
    alisverisVar: serp.alisveris_var,
    yorum: yorumUret(pozisyon, serp.alisveris_var),
    oneriler: onerilerUret({
      pozisyon,
      alisverisVar: serp.alisveris_var,
      ozellikSayisi: ozellikler.length,
      soruVar: serp.sorular.length > 0,
    }),
  };
}
