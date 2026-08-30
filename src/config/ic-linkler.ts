/**
 * Sitenin kendi iç bağlantı planı.
 *
 * Her giriş bir ifadeyi bir sayfaya bağlar. Metinlerde bu ifadeler
 * geçtiğinde ilk geçiş otomatik olarak bağlantıya çevrilir; böylece
 * bağlantı metni sayfanın gerçekten hedeflediği kelime olur ve elle
 * bağlantı serpiştirme derdi kalmaz.
 *
 * İki kural bilerek uygulanır:
 *
 *  1. Bir sayfa kendine bağlanmaz. Bağlantının işi otoriteyi BAŞKA bir
 *     sayfaya taşımaktır; kendine bağlanan sayfa hiçbir şey kazanmaz.
 *  2. Aynı ifade bir sayfada yalnızca bir kez bağlanır. Aynı metnin
 *     onlarca kez bağlanması doğal görünmez ve aşırı iyileştirme
 *     olarak okunur.
 *
 * Sıra önemlidir: uzun ifadeler önce denenir, böylece "e-ticaret SEO
 * analizi" ifadesi "e-ticaret SEO" tarafından yenmez.
 */

export type IcLink = {
  /** Metinde aranacak ifade — bağlantı metni olarak da bu kullanılır. */
  ifade: string;
  href: string;
};

export const IC_LINKLER: IcLink[] = [
  // Uzun ifadeler önce.
  { ifade: "anahtar kelime araştırma aracı", href: "/anahtar-kelime-arastirma-araci" },
  { ifade: "ücretsiz SEO analizi", href: "/ucretsiz-seo-analizi" },
  { ifade: "ürün sayfası SEO testi", href: "/urun-sayfasi-seo-testi" },
  { ifade: "site hızı testi", href: "/site-hizi-testi" },
  { ifade: "sayfa hızı", href: "/site-hizi-testi" },
  { ifade: "zengin sonuç", href: "/urun-sayfasi-seo-testi" },
  { ifade: "Google Alışveriş SEO", href: "/google-shopping-seo" },
  { ifade: "rakip SEO analizi", href: "/rakip-seo-analizi" },
  { ifade: "teknik SEO analizi", href: "/teknik-seo-analizi" },
  { ifade: "e-ticaret SEO aracı", href: "/seo-araci" },
  { ifade: "Google sıra bulucu", href: "/google-sira-bulucu" },
  { ifade: "ürün sayfası SEO", href: "/e-ticaret-seo" },
  { ifade: "anahtar kelime takibi", href: "/anahtar-kelime-arastirma-araci" },
  { ifade: "AI görünürlüğü", href: "/ai-seo" },
  { ifade: "teknik SEO", href: "/teknik-seo-analizi" },
  { ifade: "rakip analizi", href: "/rakip-seo-analizi" },
  { ifade: "SEO aracı", href: "/seo-araci" },

  /*
   * Ana hedef kelime en sona konur: daha özgül ifadeler kendi
   * sayfalarına gitsin, geriye kalan genel geçişler ana sayfayı
   * güçlendirsin.
   */
  { ifade: "e-ticaret SEO", href: "/" },
];

/** Belirli bir sayfada kullanılabilecek bağlantılar — kendine bağlanmaz. */
export function sayfaIcinLinkler(mevcutYol: string): IcLink[] {
  return IC_LINKLER.filter((l) => l.href !== mevcutYol);
}
