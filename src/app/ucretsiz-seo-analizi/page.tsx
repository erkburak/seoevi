import { IlgiliSayfalar } from "@/components/marketing/ilgili-sayfalar";
import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { UcretsizAnalizAraci } from "@/components/marketing/ucretsiz-analiz";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/ucretsiz-seo-analizi");
  const temel: Metadata = {
  title: "Ücretsiz SEO Analizi — Sitenizi anında test edin",
  description:
    "Web sitenizin adresini girin, temel SEO durumunu saniyeler içinde görün. Başlık, meta açıklama, H1, yapısal veri ve mobil uyumluluk kontrolü. Üyelik gerekmez.",
  alternates: { canonical: `${SITE.url}/ucretsiz-seo-analizi` },
  openGraph: {
    title: "Ücretsiz SEO Analizi",
    description: "Sitenizin temel SEO durumunu üyelik olmadan anında test edin.",
    url: `${SITE.url}/ucretsiz-seo-analizi`,
  },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const SSS = [
  {
    soru: "Gerçekten ücretsiz mi?",
    cevap:
      "Evet. Üyelik, kredi kartı veya e-posta adresi istemiyoruz. Adresi girin, sonucu hemen görün.",
  },
  {
    soru: "Analiz neyi kontrol ediyor?",
    cevap:
      "Sayfa başlığı, meta açıklama, H1 yapısı, görsel alt metinleri, yapısal veri, canonical etiketi, mobil görünüm etiketi, HTTPS kullanımı ve içerik uzunluğu kontrol edilir.",
  },
  {
    soru: "Sitemin tamamı taranıyor mu?",
    cevap:
      "Hayır, bu araç girdiğiniz tek sayfayı inceler. Sitenizin tüm sayfalarının taranması, anahtar kelime ve rakip analizi için ücretsiz hesap oluşturmanız gerekir.",
  },
  {
    soru: "Sonuçlar ne kadar güvenilir?",
    cevap:
      "Sayfanız doğrudan okunarak gerçek veriyle çalışılır; tahmin veya örnek veri kullanılmaz. Ancak sıralama ve rakip verisi bu ücretsiz araca dahil değildir.",
  },
];

export default function UcretsizSeoAnaliziSayfasi() {
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Ücretsiz SEO Analizi",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE.url}/ucretsiz-seo-analizi`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
        inLanguage: "tr-TR",
      },
      {
        "@type": "FAQPage",
        mainEntity: SSS.map((s) => ({
          "@type": "Question",
          name: s.soru,
          acceptedAnswer: { "@type": "Answer", text: s.cevap },
        })),
      },
    ],
  };

  return (
    <PazarlamaKabugu>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />

      <SayfaGirisi
        ustBaslik="Ücretsiz Araç"
        baslik="Ücretsiz SEO analizi"
        aciklama="Web sitenizin adresini girin; başlık, açıklama, başlık yapısı, yapısal veri ve mobil uyumluluk kontrolünü saniyeler içinde görün. Üyelik gerekmez."
      />

      <Icerik genislik="orta">
        <UcretsizAnalizAraci />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Sık sorulan sorular
          </h2>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            {SSS.map((s) => (
              <div key={s.soru} className="py-5">
                <dt className="text-[15px] font-medium text-ink-900">{s.soru}</dt>
                <dd className="mt-2 text-[14px] leading-relaxed text-ink-500">{s.cevap}</dd>
              </div>
            ))}
          </dl>
        </section>
      </Icerik>
      <IlgiliSayfalar
        ogeler={[
            { etiket: "E-ticaret SEO", href: "/", aciklama: "Tek sayfa değil, sitenizin tamamı için kurulmuş platform." },
            { etiket: "Teknik SEO analizi", href: "/teknik-seo-analizi", aciklama: "Sitenizin tamamındaki teknik sorunlar, önem sırasına dizili." },
            { etiket: "Google sıra bulucu", href: "/google-sira-bulucu", aciklama: "Tek bir kelimede kaçıncı sırada olduğunuzu ölçün." },
        ]}
      />
    </PazarlamaKabugu>
  );
}
