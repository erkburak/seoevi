import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { MarkaSaglayici } from "@/components/brand/marka-saglayici";
import { SITE } from "@/config/site";
import { markaAyarlari } from "@/lib/marka";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  // Favicon yetkili alanından değiştirilebilir; yoksa koddaki varsayılan.
  const marka = await markaAyarlari();

  return {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — E-ticaret SEO Platformu`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  keywords: [
    "e-ticaret SEO",
    "SEO aracı",
    "anahtar kelime araştırması",
    "rakip analizi",
    "teknik SEO",
    "Google Alışveriş SEO",
    "ürün SEO",
    "kategori SEO",
  ],
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — E-ticaret SEO Platformu`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — E-ticaret SEO Platformu`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: { canonical: SITE.url },
  icons: marka.faviconUrl
    ? { icon: [{ url: marka.faviconUrl }], apple: marka.faviconUrl }
    : { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], apple: "/favicon.svg" },
  };
}

export const viewport: Viewport = {
  themeColor: "#0C111D",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const marka = await markaAyarlari();

  return (
    <html lang="tr" className={inter.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-[10px] focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          İçeriğe geç
        </a>
        <MarkaSaglayici deger={{ logoUrl: marka.logoUrl, logoYukseklik: marka.logoYukseklik }}>
          {children}
        </MarkaSaglayici>
      </body>
    </html>
  );
}
