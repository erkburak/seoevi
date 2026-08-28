import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { SiraBulucuAraci } from "@/components/marketing/sira-bulucu";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/google-sira-bulucu");
  const temel: Metadata = {
  title: "Google Sıra Bulucu — Sitenizin sırasını ücretsiz öğrenin",
  description:
    "Alan adınızı ve anahtar kelimenizi girin, Google'da kaçıncı sırada olduğunuzu anında görün. İlk 10 rakip, SERP alanları ve öneriler dahil. Günde 3 sorgu ücretsiz.",
  alternates: { canonical: `${SITE.url}/google-sira-bulucu` },
  openGraph: {
    title: "Google Sıra Bulucu — Ücretsiz sıralama sorgulama",
    description:
      "Google'da kaçıncı sıradasınız? Alan adınızı ve kelimenizi girin, gerçek sonuçlarla öğrenin.",
    url: `${SITE.url}/google-sira-bulucu`,
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
    soru: "Sonuçlar gerçek Google sıralaması mı?",
    cevap:
      "Evet. Sorgunuz Türkiye konumu ve Türkçe dil ayarıyla, seçtiğiniz cihaz türünde canlı arama sonuçları üzerinden çalıştırılır. Tahmini veya örnek veri kullanılmaz.",
  },
  {
    soru: "Neden günde 3 sorgu?",
    cevap:
      "Her sorgu gerçek bir arama sonucu verisi çektiğimiz için bize maliyet oluşturuyor. Aracı herkese ücretsiz tutabilmek adına günlük hakkı sınırlı tutuyoruz. Hakkınız her gece 00.00'da yenilenir.",
  },
  {
    soru: "Sıralamam neden arkadaşımınkinden farklı?",
    cevap:
      "Google sonuçları konuma, cihaza, arama geçmişine ve kişiselleştirmeye göre değişir. Bu araç kişiselleştirmeden arındırılmış, Türkiye geneli sonuçları gösterir; bu yüzden kendi tarayıcınızdaki sonuçtan farklı olabilir.",
  },
  {
    soru: "İlk 100'de çıkmıyorum, ne anlama geliyor?",
    cevap:
      "Google bu kelime için sitenizi ilk 100 sonuç arasında göstermiyor. Genellikle o kelimeyi hedefleyen bir sayfanızın olmadığı ya da içeriğin yeterince odaklı olmadığı anlamına gelir.",
  },
  {
    soru: "Birden fazla kelimeyi birlikte takip edebilir miyim?",
    cevap:
      "Bu araç tek seferde tek kelime sorgular. Yüzlerce kelimeyi sürekli izlemek, düşüş olduğunda bildirim almak için ücretsiz hesap açabilirsiniz.",
  },
];

export default function GoogleSiraBulucuSayfasi() {
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Google Sıra Bulucu",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE.url}/google-sira-bulucu`,
        offers: { "@type": "Offer", price: "0", priceCurrency: "TRY" },
        inLanguage: "tr-TR",
        provider: { "@type": "Organization", name: SITE.name, url: SITE.url },
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
        baslik="Google'da kaçıncı sıradasınız?"
        aciklama="Alan adınızı ve anahtar kelimenizi girin; gerçek arama sonuçlarındaki sıranızı, ilk 10 rakibinizi ve ne yapmanız gerektiğini saniyeler içinde görün. Üyelik gerekmez."
      />

      <Icerik genislik="orta">
        <SiraBulucuAraci />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Sıralamanızı öğrendiniz, peki sonra?
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-[1.8] text-ink-600">
            <p>
              Tek bir kelimedeki sıranız bir fotoğraftır; SEO ise bir film. Asıl önemli olan
              sıralamanızın zaman içinde nereye gittiği, hangi kelimelerde yükselip hangilerinde
              düştüğünüz ve rakiplerinizin sizden hangi alanlarda önde olduğu.
            </p>
            <p>
              Özellikle 11-20 arasındaki kelimeler dikkat edilmeye değer: ilk sayfaya en yakın
              olanlar bunlardır ve çoğu zaman küçük bir içerik düzenlemesiyle kazanılabilirler.
              SEO Evi bu kelimeleri sizin için işaretler ve önem sırasına dizer.
            </p>
          </div>
        </section>

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
    </PazarlamaKabugu>
  );
}
