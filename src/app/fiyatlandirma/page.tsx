import { IlgiliSayfalar } from "@/components/marketing/ilgili-sayfalar";
import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { SssBolumu } from "@/components/marketing/bolumler";
import { PaketKartlari } from "@/components/marketing/paketler";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { SayfaOlayi, WhatsappButonu } from "@/components/marketing/whatsapp";
import { SITE, WHATSAPP_MESSAGES } from "@/config/site";
import { LIMIT_ADLARI, limitMetni, planlariGetir } from "@/lib/plans";
import type { PlanLimitleri } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/fiyatlandirma");
  const temel: Metadata = {
  title: "Fiyatlandırma — E-ticaret SEO paketleri",
  description:
    "SEO Evi paketleri ve limitleri. Mağazanızın büyüklüğüne göre seçin, 7 gün ücretsiz deneyin. Kredi kartı gerekmez.",
  alternates: { canonical: `${SITE.url}/fiyatlandirma` },
  openGraph: {
    title: "SEO Evi Fiyatlandırma",
    description: "Mağazanızın büyüklüğüne göre SEO paketleri. 7 gün ücretsiz deneme.",
    url: `${SITE.url}/fiyatlandirma`,
  },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FiyatlandirmaSayfasi() {
  const planlar = await planlariGetir();
  const karsilastirilanlar = planlar.filter((p) => !p.is_custom);

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: SITE.name,
    description: SITE.description,
    brand: { "@type": "Brand", name: SITE.name },
    offers: karsilastirilanlar
      .filter((p) => p.price_monthly !== null)
      .map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: String(p.price_monthly),
        priceCurrency: p.currency,
        url: `${SITE.url}/fiyatlandirma`,
        availability: "https://schema.org/InStock",
      })),
  };

  return (
    <PazarlamaKabugu>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(yapisalVeri) }}
      />
      <SayfaOlayi olay="pricing_viewed" kaynak="fiyatlandirma" />

      <SayfaGirisi
        ustBaslik="Fiyatlandırma"
        baslik="Mağazanızın büyüklüğüne göre"
        aciklama="Tüm paketlerde 7 gün ücretsiz deneme. Kredi kartı gerekmez, istediğiniz zaman vazgeçebilirsiniz."
      />

      <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <PaketKartlari planlar={planlar} kaynak="fiyatlandirma" baslikGoster={false} />
      </div>

      {/* --- Limit karşılaştırması --- */}
      {karsilastirilanlar.length ? (
        <section className="border-t border-line bg-surface-muted/60">
          <Icerik genislik="genis">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[28px]">
                Paketleri karşılaştırın
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
                Limitler mağazanızın büyüklüğüne göre belirlenir. İhtiyacınız değiştiğinde paketinizi
                dilediğiniz zaman yükseltebilirsiniz.
              </p>
            </div>

            <div className="table-scroll mt-10 rounded-[14px] border border-line bg-white">
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky left-0 z-10 border-b border-line bg-white px-4 py-3.5 text-left text-[12.5px] font-medium text-ink-500"
                    >
                      Limit
                    </th>
                    {karsilastirilanlar.map((p) => (
                      <th
                        key={p.id}
                        scope="col"
                        className="whitespace-nowrap border-b border-line px-4 py-3.5 text-right text-[13px] font-semibold text-ink-900"
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(LIMIT_ADLARI) as (keyof PlanLimitleri)[]).map((k) => (
                    <tr key={k} className="border-b border-line last:border-0">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-white px-4 py-3 text-left font-normal text-ink-500"
                      >
                        {LIMIT_ADLARI[k]}
                      </th>
                      {karsilastirilanlar.map((p) => (
                        <td
                          key={p.id}
                          className="tabular whitespace-nowrap px-4 py-3 text-right font-medium text-ink-800"
                        >
                          {limitMetni(p.limits[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Icerik>
        </section>
      ) : null}

      <SssBolumu />

      {/* --- Son çağrı --- */}
      <section className="border-t border-line bg-white">
        <Icerik genislik="dar" className="text-center">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900 sm:text-[28px]">
            Hangi paketin size uygun olduğundan emin değil misiniz?
          </h2>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-500">
            Mağazanızın büyüklüğünü ve hedeflerinizi anlatın; size uygun paketi birlikte belirleyelim.
          </p>
          <div className="mt-7 flex justify-center">
            <WhatsappButonu
              mesaj={WHATSAPP_MESSAGES.genel}
              kaynak="fiyatlandirma_alt"
              boyut="lg"
              cocuk="WhatsApp'tan Konuşalım"
            />
          </div>
        </Icerik>
      </section>
      <IlgiliSayfalar
        ogeler={[
            { etiket: "E-ticaret SEO", href: "/", aciklama: "Paketlerin arkasındaki platformun ne yaptığı." },
            { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo", aciklama: "Ürün ve kategori sayfalarının nasıl puanlandığı." },
            { etiket: "Ücretsiz SEO analizi", href: "/ucretsiz-seo-analizi", aciklama: "Kayıt olmadan sitenizin durumunu bir dakikada görün." },
        ]}
      />
    </PazarlamaKabugu>
  );
}
