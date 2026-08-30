import type { Metadata } from "next";

import { BaglantiliMetin } from "@/components/marketing/baglantili-metin";
import { IlgiliSayfalar } from "@/components/marketing/ilgili-sayfalar";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { SiteHiziAraci } from "@/components/marketing/site-hizi";
import { SITE } from "@/config/site";
import { sayfaUstVerisi } from "@/lib/marka";

const YOL = "/site-hizi-testi";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi(YOL);
  const temel: Metadata = {
    title: "Site Hızı Testi — E-ticaret sayfanızı ücretsiz ölçün",
    description:
      "Ürün ve kategori sayfalarınız mobilde kaç saniyede açılıyor? Google'ın kendi ölçüm motoruyla Çekirdek Web Verilerini görün, sayfayı yavaşlatan nedenleri Türkçe okuyun. Günde 2 ölçüm ücretsiz.",
    alternates: { canonical: `${SITE.url}${YOL}` },
    openGraph: {
      title: "Site Hızı Testi — Ücretsiz sayfa hızı ölçümü",
      description:
        "E-ticaret sayfanız mobilde ne kadar hızlı? Çekirdek Web Verilerini ölçün, yavaşlatan nedenleri öğrenin.",
      url: `${SITE.url}${YOL}`,
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
    soru: "Ölçüm gerçek mi, tahmin mi?",
    cevap:
      "Gerçek. Sayfanız Google'ın açık kaynaklı Lighthouse motoruyla, mobil cihaz ve yavaş bağlantı koşulları taklit edilerek baştan yüklenir. Tahmini veya örnek veri kullanılmaz.",
  },
  {
    soru: "Neden mobil ölçüm varsayılan?",
    cevap:
      "Türkiye'de e-ticaret trafiğinin büyük çoğunluğu telefondan geliyor ve Google sıralamada mobil sürümü esas alıyor. Masaüstü skorları neredeyse her zaman daha iyi çıkar; sadece ona bakmak sitenin hızlı olduğu yanılgısı yaratır.",
  },
  {
    soru: "Ana sayfamı mı ölçmeliyim?",
    cevap:
      "Bir ürün veya kategori sayfası ölçmeniz daha doğru. Ana sayfa genellikle özenle hafifletilir; asıl para kazandıran ürün sayfaları ise görsel, varyant seçici ve öneri modülleriyle çok daha ağırdır. Sorun genellikle oradadır.",
  },
  {
    soru: "Skorum düşük, satışım da mı düşecek?",
    cevap:
      "Hız tek başına satışı belirlemez ama doğrudan etkiler. Özellikle yerleşim kayması e-ticarette pahalıdır: kullanıcı Sepete Ekle'ye basarken buton kayar ve yanlış yere tıklar. Yavaş açılan ürün sayfası da terk edilir.",
  },
  {
    soru: "Neden günde 2 ölçüm?",
    cevap:
      "Her ölçümde sayfanız gerçekten baştan yükleniyor ve bu bize çağrı başına maliyet oluşturuyor. Aracı herkese ücretsiz tutabilmek için günlük hakkı sınırlı tutuyoruz. Hakkınız her gece 00.00'da yenilenir.",
  },
  {
    soru: "Tüm sayfalarımı birden ölçebilir miyim?",
    cevap:
      "Bu araç tek seferde tek sayfa ölçer. Mağazanızın tamamını tarayıp hangi şablonun yavaş olduğunu, teknik SEO hatalarını ve sıralama kayıplarını birlikte görmek için ücretsiz hesap açabilirsiniz.",
  },
];

export default function SiteHiziTestiSayfasi() {
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Site Hızı Testi",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: `${SITE.url}${YOL}`,
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

  // Aynı hedefe iki kez bağlanmamak için bağlantı kümesi paylaşılır.
  const kullanilan = new Set<string>();

  return (
    <PazarlamaKabugu>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />

      <SayfaGirisi
        ustBaslik="Ücretsiz Araç"
        baslik="Ürün sayfanız mobilde kaç saniyede açılıyor?"
        aciklama="Google'ın kendi ölçüm motoruyla Çekirdek Web Verilerinizi görün, sayfayı yavaşlatan nedenleri sade Türkçe okuyun. Üyelik gerekmez."
      />

      <Icerik genislik="orta">
        <SiteHiziAraci />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Hız neden e-ticarette daha çok önemli?
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-[1.8] text-ink-600">
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="Bir blog yazısı yavaş açıldığında ziyaretçi bekler. Bir ürün sayfası yavaş açıldığında geri döner ve rakibinizden alır. Sayfa hızı bu yüzden hem bir kullanıcı deneyimi konusu hem de doğrudan gelir konusudur; Google da Çekirdek Web Verilerini sıralama sinyali olarak kullandığı için teknik SEO çalışmasının ayrılmaz parçasıdır."
            />
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="E-ticaret sitelerinde yavaşlığın kaynağı genellikle aynıdır: sıkıştırılmamış ürün görselleri, temayla gelen kullanılmayan JavaScript ve zamanla biriken pazarlama etiketleri. Bunların hangisinin ne kadar yük getirdiğini ölçmeden kaldırmak, çalışan bir şeyi bozma riski taşır."
            />
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="Tek bir sayfayı ölçmek başlangıç için yeterlidir; ancak mağazanızda yüzlerce ürün sayfası aynı şablonu kullanır. Bir şablondaki sorun, o şablonu kullanan her sayfayı etkiler. Bu yüzden ölçümü tüm siteye yaymak ve zaman içinde izlemek gerekir."
            />
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

      <IlgiliSayfalar
        ogeler={[
          {
            etiket: "Teknik SEO analizi",
            href: "/teknik-seo-analizi",
            aciklama: "Hız yalnızca bir başlık; tüm teknik hataları tek taramada görün.",
          },
          {
            etiket: "Ürün sayfası SEO testi",
            href: "/urun-sayfasi-seo-testi",
            aciklama: "Ürün sayfanız Google'a fiyat ve stok bilgisini doğru veriyor mu?",
          },
          {
            etiket: "Ücretsiz SEO analizi",
            href: "/ucretsiz-seo-analizi",
            aciklama: "Sayfanızın başlık, açıklama ve içerik yapısını kayıt olmadan kontrol edin.",
          },
        ]}
      />
    </PazarlamaKabugu>
  );
}
