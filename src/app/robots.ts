import type { MetadataRoute } from "next";

import { SITE } from "@/config/site";

/**
 * Arama motoru tarama kuralları.
 * Panel, kimlik doğrulama ve API yolları taramaya kapatılır.
 */
export default function robots(): MetadataRoute.Robots {
  const KAPALI = [
    "/api/",
    "/auth/",
    "/genel-bakis",
    "/aksiyon-merkezi",
    "/anahtar-kelimeler",
    "/anahtar-kelime-arastirmasi",
    "/kelime-firsatlari",
    "/serp-analizi",
    "/rakipler",
    "/rakip-analizi",
    "/teknik-seo",
    "/sayfa-analizi",
    "/icerik-analizi",
    "/ic-baglanti",
    "/geri-baglantilar",
    "/e-ticaret",
    "/urun-seo",
    "/kategori-seo",
    "/merchant-analizi",
    "/pazaryeri-radari",
    "/fiyat-konumu",
    "/mevsimsellik",
    "/yamyamlik",
    "/ai-gorunurlugu",
    "/projeler",
    "/raporlar",
    "/beraber-inceleyelim",
    "/hesabim",
    "/ayarlar",
    "/baslangic",
    "/giris",
    "/kayit",
    "/sifremi-unuttum",
    "/sifre-yenile",
    "/yetkili",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: KAPALI }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
