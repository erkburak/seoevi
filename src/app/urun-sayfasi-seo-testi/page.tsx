import type { Metadata } from "next";

import { BaglantiliMetin } from "@/components/marketing/baglantili-metin";
import { IlgiliSayfalar } from "@/components/marketing/ilgili-sayfalar";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { UrunSayfasiAraci } from "@/components/marketing/urun-sayfasi";
import { SITE } from "@/config/site";
import { sayfaUstVerisi } from "@/lib/marka";

const YOL = "/urun-sayfasi-seo-testi";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi(YOL);
  const temel: Metadata = {
    title: "Ürün Sayfası SEO Testi — Google fiyatınızı okuyabiliyor mu?",
    description:
      "Ürün sayfanızın adresini girin; Google'ın fiyat, stok, marka ve değerlendirme bilgisini okuyup okuyamadığını görün. Zengin sonuç eksiklerinizi Türkçe açıklamalarla listeler. Günde 3 kontrol ücretsiz.",
    alternates: { canonical: `${SITE.url}${YOL}` },
    openGraph: {
      title: "Ürün Sayfası SEO Testi — Ücretsiz zengin sonuç kontrolü",
      description:
        "Google ürün sayfanızdan fiyat ve stok bilgisini okuyabiliyor mu? Ücretsiz kontrol edin.",
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
    soru: "Zengin sonuç ne demek?",
    cevap:
      "Arama sonuçlarında bazı ürünlerin altında fiyat, yıldız ve stok bilgisi görürsünüz. Buna zengin sonuç denir. Google bu bilgileri sayfadaki görsel tasarımdan değil, yapısal veriden (Product şeması) okur. Şema yoksa ürününüz düz bir mavi bağlantı olarak kalır.",
  },
  {
    soru: "Sayfamda fiyat yazıyor ama araç 'okunamıyor' diyor. Neden?",
    cevap:
      "Çünkü fiyatı insan gözüyle siz görüyorsunuz, Google ise yapısal veriden okuyor. Sayfada 899 TL yazması yetmez; bu bilginin Product şemasındaki price alanında da bulunması gerekir. Bu araç tam olarak bu farkı gösterir.",
  },
  {
    soru: "Bu şemaları kim ekliyor?",
    cevap:
      "Çoğu e-ticaret altyapısı hazır olarak sunar ama tema değişiklikleri sırasında bozulabilir veya eksik kalabilir. Altyapınızın destek ekibine bu aracın çıktısını göstererek eksik alanları söyleyebilirsiniz.",
  },
  {
    soru: "Pazaryeri sayfalarını kontrol edebilir miyim?",
    cevap:
      "Büyük pazaryerlerinin çoğu otomatik erişimi engeller; o adresler için sonuç alınamayabilir. Araç kendi mağazanızın ürün sayfaları için tasarlandı.",
  },
  {
    soru: "Neden günde 3 kontrol?",
    cevap:
      "Bu araçta dış bir veri sağlayıcısı kullanılmadığı için maliyeti yok; sınır yalnızca kötüye kullanımı ve sunucu yükünü engellemek için var. Hakkınız her gece 00.00'da yenilenir.",
  },
  {
    soru: "Tüm ürünlerimi tek seferde kontrol edebilir miyim?",
    cevap:
      "Bu araç tek seferde tek ürün inceler. Mağazanızdaki bütün ürün sayfalarını tarayıp aynı eksiği taşıyanları toplu görmek için ücretsiz hesap açabilirsiniz.",
  },
];

export default function UrunSayfasiSeoTestiSayfasi() {
  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        name: "Ürün Sayfası SEO Testi",
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
        baslik="Google ürün sayfanızdan fiyatı okuyabiliyor mu?"
        aciklama="Ürün adresinizi girin; fiyat, stok, marka ve değerlendirme bilgisinin Google tarafından okunup okunamadığını görün. Üyelik gerekmez."
      />

      <Icerik genislik="orta">
        <UrunSayfasiAraci />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Neden ürün sayfaları ayrı bir kontrol ister?
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-[1.8] text-ink-600">
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="Genel SEO araçları bir ürün sayfasına blog yazısı gibi bakar: başlık var mı, açıklama kaç karakter, kaç kelime yazılmış. Oysa bir ürün sayfasının işi bilgi vermek değil satmak; Google'ın da o sayfadan beklediği şey farklıdır. Fiyat, stok durumu, para birimi ve değerlendirme puanı yapısal veri olarak okunabiliyorsa ürününüz arama sonucunda fiyatıyla ve yıldızıyla görünür."
            />
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="Aradaki fark tıklama oranında ortaya çıkar. Aynı kelimede iki sonuç yan yana durur: biri fiyatı, stok bilgisi ve dört buçuk yıldızıyla görünür, diğeri düz bir bağlantıdır. İkincisi birinciden daha üst sırada olsa bile daha az tıklanabilir. Bu yüzden ürün sayfası SEO çalışması yalnızca sıralama değil, sonuçta nasıl göründüğünüz meselesidir."
            />
            <BaglantiliMetin
              mevcutYol={YOL}
              kullanilan={kullanilan}
              metin="Eksik şema tek sorun değildir. E-ticarette aynı ürün renk, beden ve sıralama parametreleriyle onlarca farklı adreste açılabilir; canonical etiketi olmadan Google hangisinin asıl sayfa olduğunu bilemez ve gücünüz bölünür. Sayfa hızı da aynı şekilde ürün sayfalarında kategori sayfalarından daha kritiktir."
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
            etiket: "Site hızı testi",
            href: "/site-hizi-testi",
            aciklama: "Ürün sayfanız mobilde kaç saniyede açılıyor?",
          },
          {
            etiket: "Google Alışveriş SEO",
            href: "/google-shopping-seo",
            aciklama: "Ürünleriniz Alışveriş sonuçlarında nerede duruyor?",
          },
          {
            etiket: "Ürün sayfası SEO",
            href: "/e-ticaret-seo",
            aciklama: "Tüm ürün ve kategori sayfalarınızı tek ekranda izleyin.",
          },
        ]}
      />
    </PazarlamaKabugu>
  );
}
