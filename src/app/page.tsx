import type { Metadata } from "next";

import {
  AiBolumu,
  AksiyonBolumu,
  EticaretBolumu,
  GuvenSeridi,
  KelimeFirsatlariBolumu,
  NasilCalisir,
  OzelliklerBolumu,
  RakipBolumu,
  SkorBolumu,
  SonCagri,
  SssBolumu,
  SSS_LISTESI,
} from "@/components/marketing/bolumler";
import { sayfaUstVerisi } from "@/lib/marka";
import { PazarlamaAltbilgisi } from "@/components/marketing/footer";
import { PazarlamaBasligi } from "@/components/marketing/header";
import { Hero } from "@/components/marketing/hero";
import { PaketKartlari } from "@/components/marketing/paketler";
import { SITE } from "@/config/site";
import { planlariGetir } from "@/lib/plans";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/");
  const temel: Metadata = {
  title: "E-ticaret SEO Platformu — Google ve AI aramalarında büyüyün",
  description: SITE.description,
  alternates: { canonical: SITE.url },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function AnaSayfa() {
  const [planlar, supabase] = await Promise.all([planlariGetir(), sunucuIstemcisi()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: SITE.name,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE.url,
        description: SITE.description,
        inLanguage: "tr-TR",
        offers: planlar
          .filter((p) => p.price_monthly !== null)
          .map((p) => ({
            "@type": "Offer",
            name: p.name,
            price: String(p.price_monthly),
            priceCurrency: p.currency,
          })),
      },
      {
        "@type": "FAQPage",
        mainEntity: SSS_LISTESI.map((s) => ({
          "@type": "Question",
          name: s.soru,
          acceptedAnswer: { "@type": "Answer", text: s.cevap },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />
      <PazarlamaBasligi girisYapildi={Boolean(user)} />
      <main id="icerik">
        <Hero />
        <GuvenSeridi />
        <NasilCalisir />
        <SkorBolumu />
        <KelimeFirsatlariBolumu />
        <RakipBolumu />
        <EticaretBolumu />
        <AiBolumu />
        <AksiyonBolumu />
        <OzelliklerBolumu />

        <section id="fiyatlandirma" className="bg-surface-muted">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <PaketKartlari planlar={planlar} kaynak="anasayfa" />
          </div>
        </section>

        <SssBolumu />
        <SonCagri />
      </main>
      <PazarlamaAltbilgisi />
    </>
  );
}
