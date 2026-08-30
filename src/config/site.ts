/**
 * Merkezi site yapılandırması.
 * WhatsApp numarası, alan adı ve iletişim bilgileri yalnızca burada tanımlanır.
 */

export const WHATSAPP_NUMBER = "905382020127";
export const WHATSAPP_DISPLAY = "+90 538 202 01 27";

/**
 * Site adresini güvenli hâle getirir.
 *
 * Bu adres kanonik etiketlerde, site haritasında, OG etiketlerinde ve
 * OAuth yönlendirmelerinde kullanılıyor. Ortam değişkenine `http://`
 * yazılması sessizce üç şeyi bozuyordu: Google https bir sitede http
 * kanonik görüyor, OAuth sağlayıcıları http yönlendirmeyi reddediyor
 * (`redirect_uri_mismatch`) ve paylaşım önizlemeleri karışıyor.
 *
 * Yerel geliştirme dışında şema https'e sabitlenir; sondaki eğik çizgi
 * atılır ki adres birleştirmede çift çizgi oluşmasın.
 */
export function siteAdresi(ham: string | undefined): string {
  const taban = (ham ?? "https://seoevi.com.tr").trim().replace(/\/+$/, "");
  if (/^https:\/\//.test(taban)) return taban;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(taban)) return taban;
  return taban.replace(/^http:\/\//, "https://");
}

export const SITE = {
  name: "SEO Evi",
  tagline: "E-ticaret SEO'nun yeni nesli",
  description:
    "E-ticaret SEO platformu: teknik SEO taraması, anahtar kelime takibi, rakip analizi, ürün ve kategori sayfası skorları tek ekranda. Türkçe, e-ticaret için kurgulandı.",
  url: siteAdresi(process.env.NEXT_PUBLIC_SITE_URL),
  locale: "tr_TR",
  email: "destek@seoevi.com.tr",
} as const;

/** WhatsApp bağlantısı üretir. Metin otomatik doldurulur. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_MESSAGES = {
  genel: "Merhaba, SEO Evi hakkında bilgi almak istiyorum.",
  paket: (paket: string) =>
    `Merhaba, SEO Evi ${paket} paketi hakkında bilgi almak istiyorum.`,
  ozel: "Merhaba, işletmemize özel bir SEO çözümü için görüşmek istiyorum.",
  destek: "Merhaba, SEO Evi kullanımıyla ilgili desteğe ihtiyacım var.",
} as const;

/**
 * Yasal metinlerde geçen şirket bilgileri.
 *
 * ÖNEMLİ: Aşağıdaki değerler yer tutucudur. Yayına almadan önce
 * gerçek ticaret unvanı, adres, vergi dairesi ve MERSİS bilgileriyle
 * doldurulmalı; KVKK/gizlilik metinleri hukuk danışmanına onaylatılmalıdır.
 */
export const SIRKET = {
  unvan: "SEO Evi",
  adres: "İstanbul, Türkiye",
  vergiDairesi: "—",
  vergiNo: "—",
  mersis: "—",
  kepAdresi: "—",
  veriSorumlusu: "SEO Evi",
} as const;

/** Yasal metinlerin son güncellenme tarihi. */
export const YASAL_GUNCELLEME = "27 Ağustos 2026";
