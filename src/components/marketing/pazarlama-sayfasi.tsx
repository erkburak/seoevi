import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BaglantiliMetin } from "@/components/marketing/baglantili-metin";

import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { Buton } from "@/components/ui/button";
import { SITE, WHATSAPP_MESSAGES } from "@/config/site";
import { ustVeriBirlestir } from "@/lib/marka";

/**
 * Arama motorlarına yönelik açılış sayfalarının ortak yapısı.
 * İçerik veriden gelir; her sayfa yalnızca kendi metnini tanımlar.
 */
export type PazarlamaSayfasiIcerigi = {
  slug: string;
  ustBaslik: string;
  baslik: string;
  aciklama: string;
  metaBaslik: string;
  metaAciklama: string;
  /** Sayfanın cevapladığı asıl soru — giriş paragrafı. */
  giris: string[];
  ozellikler: { baslik: string; metin: string }[];
  adimlar: { baslik: string; metin: string }[];
  sss: { soru: string; cevap: string }[];
  ilgiliSayfalar: { etiket: string; href: string }[];
};

/**
 * Sayfa üst verisi.
 * Yetkili alanından özelleştirilmişse o değer kullanılır; yoksa
 * içerik dosyasındaki varsayılana düşülür.
 */
export async function pazarlamaMetadata(
  icerik: PazarlamaSayfasiIcerigi,
): Promise<Metadata> {
  const yol = `/${icerik.slug}`;
  const url = `${SITE.url}${yol}`;

  const { title, description, noindex } = await ustVeriBirlestir(yol, {
    title: icerik.metaBaslik,
    description: icerik.metaAciklama,
  });

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website" },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export function PazarlamaSayfasi({ icerik }: { icerik: PazarlamaSayfasiIcerigi }) {
  /*
   * İç bağlantılar sayfa boyunca tek sayaçla uygulanır: aynı hedefe
   * ikinci kez bağlanılmaz, sayfa kendine hiç bağlanmaz.
   */
  const mevcutYol = `/${icerik.slug}`;
  const kullanilanLinkler = new Set<string>();

  const yapisalVeri = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: icerik.metaBaslik,
        description: icerik.metaAciklama,
        url: `${SITE.url}/${icerik.slug}`,
        inLanguage: "tr-TR",
        isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
      },
      {
        "@type": "FAQPage",
        mainEntity: icerik.sss.map((s) => ({
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

      <SayfaGirisi ustBaslik={icerik.ustBaslik} baslik={icerik.baslik} aciklama={icerik.aciklama}>
        <Buton asChild boyut="lg">
          <Link href="/kayit">Ücretsiz Analize Başla</Link>
        </Buton>
        <Buton asChild gorunum="ikincil" boyut="lg">
          <Link href="/fiyatlandirma">Paketleri İncele</Link>
        </Buton>
      </SayfaGirisi>

      <Icerik genislik="orta">
        {/* --- Giriş --- */}
        <div className="space-y-5 text-[15px] leading-[1.8] text-ink-600">
          {icerik.giris.map((p) => (
            <BaglantiliMetin
              key={p.slice(0, 40)}
              metin={p}
              mevcutYol={mevcutYol}
              kullanilan={kullanilanLinkler}
            />
          ))}
        </div>

        {/* --- Özellikler --- */}
        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Neleri görüyorsunuz?
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
            {icerik.ozellikler.map((o) => (
              <li key={o.baslik}>
                <div className="flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-positive" aria-hidden />
                  <h3 className="text-[15px] font-semibold text-ink-900">{o.baslik}</h3>
                </div>
                <p className="mt-1.5 pl-6 text-[13.5px] leading-relaxed text-ink-500">{o.metin}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Nasıl çalışır --- */}
        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Nasıl çalışıyor?
          </h2>
          <ol className="mt-8 space-y-7">
            {icerik.adimlar.map((a, sira) => (
              <li key={a.baslik} className="flex gap-5">
                <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[12.5px] font-semibold text-white">
                  {sira + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-ink-900">{a.baslik}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{a.metin}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* --- SSS --- */}
        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            Sık sorulan sorular
          </h2>
          <dl className="mt-8 divide-y divide-line border-y border-line">
            {icerik.sss.map((s) => (
              <div key={s.soru} className="py-5">
                <dt className="text-[15px] font-medium text-ink-900">{s.soru}</dt>
                <BaglantiliMetin
                  etiket="dd"
                  metin={s.cevap}
                  mevcutYol={mevcutYol}
                  kullanilan={kullanilanLinkler}
                  className="mt-2 text-[14px] leading-relaxed text-ink-500"
                />
              </div>
            ))}
          </dl>
        </section>

        {/* --- Son çağrı --- */}
        <section className="mt-16 rounded-[16px] border border-line bg-surface-muted/60 p-7 text-center">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink-900">
            Mağazanızın durumunu bugün görün
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-[14px] leading-relaxed text-ink-500">
            Alan adınızı girin, ilk analiz birkaç dakika içinde hazır olsun. 7 gün ücretsiz, kredi
            kartı gerekmez.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Buton asChild>
              <Link href="/kayit">Ücretsiz Analize Başla</Link>
            </Buton>
            <WhatsappButonu
              mesaj={WHATSAPP_MESSAGES.genel}
              kaynak={icerik.slug}
              gorunum="ikincil"
              cocuk="WhatsApp'tan Konuşalım"
            />
          </div>
        </section>

        {/* --- İlgili sayfalar --- */}
        {icerik.ilgiliSayfalar.length ? (
          <section className="mt-14">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-400">
              İlgili sayfalar
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {icerik.ilgiliSayfalar.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className="inline-flex rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] text-ink-600 transition-colors hover:border-ink-200 hover:text-ink-900"
                  >
                    {i.etiket}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Icerik>
    </PazarlamaKabugu>
  );
}
