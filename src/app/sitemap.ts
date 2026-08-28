import type { MetadataRoute } from "next";

import { PAZARLAMA_SAYFALARI } from "@/config/pazarlama-icerikleri";
import { SITE } from "@/config/site";

/**
 * Site haritası.
 * Yalnızca herkese açık sayfalar listelenir; panel sayfaları dahil edilmez.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const guncelleme = new Date();

  const anaSayfalar: { yol: string; oncelik: number; siklik: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { yol: "", oncelik: 1, siklik: "weekly" },
    { yol: "/fiyatlandirma", oncelik: 0.9, siklik: "monthly" },
    { yol: "/ucretsiz-seo-analizi", oncelik: 0.9, siklik: "monthly" },
    { yol: "/google-sira-bulucu", oncelik: 0.9, siklik: "monthly" },
    { yol: "/meta-title-olusturucu", oncelik: 0.7, siklik: "monthly" },
    { yol: "/meta-description-olusturucu", oncelik: 0.7, siklik: "monthly" },
    { yol: "/hakkimizda", oncelik: 0.5, siklik: "yearly" },
    { yol: "/iletisim", oncelik: 0.6, siklik: "yearly" },
    { yol: "/kvkk", oncelik: 0.3, siklik: "yearly" },
    { yol: "/gizlilik", oncelik: 0.3, siklik: "yearly" },
    { yol: "/kullanim-kosullari", oncelik: 0.3, siklik: "yearly" },
    { yol: "/cerez-politikasi", oncelik: 0.3, siklik: "yearly" },
  ];

  const pazarlama = PAZARLAMA_SAYFALARI.map((p) => ({
    yol: `/${p.slug}`,
    oncelik: 0.8,
    siklik: "monthly" as const,
  }));

  return [...anaSayfalar, ...pazarlama].map((s) => ({
    url: `${SITE.url}${s.yol}`,
    lastModified: guncelleme,
    changeFrequency: s.siklik,
    priority: s.oncelik,
  }));
}
