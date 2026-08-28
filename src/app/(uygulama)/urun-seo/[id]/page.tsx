import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiOneriPaneli } from "@/components/app/ai-oneri";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { OzetDegeri } from "@/components/ui/metric";
import { SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, para, sayi, tarih, urlYolu } from "@/lib/utils";
import type { Onem, Urun } from "@/types/database";

export const metadata: Metadata = {
  title: "Ürün SEO Detayı",
  robots: { index: false, follow: false },
};

type Kontrol = { kod: string; ad: string; gecti: boolean; onem: Onem; aciklama: string; oneri: string };

export default async function UrunDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { proje } = await projeBaglami();
  const { id } = await params;
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();
  const urun = data as Urun;

  const [{ data: sayfa }, { data: merchant }, { data: siralamalar }] = await Promise.all([
    urun.page_id
      ? supabase.from("pages").select("*").eq("id", urun.page_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("merchant_audits")
      .select("*")
      .eq("product_id", urun.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("keyword_rankings")
      .select("position, keywords(id, keyword, search_volume)")
      .eq("project_id", proje.id)
      .eq("url", urun.url)
      .eq("is_competitor", false)
      .order("position", { ascending: true })
      .limit(15),
  ]);

  const kontroller = ((urun.checks as { kontroller?: Kontrol[] })?.kontroller ?? []) as Kontrol[];
  const gecen = kontroller.filter((k) => k.gecti).length;

  type SiraSatiri = {
    position: number | null;
    keywords: { id: string; keyword: string; search_volume: number | null } | { id: string; keyword: string; search_volume: number | null }[] | null;
  };

  const kelimeler = ((siralamalar ?? []) as unknown as SiraSatiri[])
    .map((s) => {
      const k = Array.isArray(s.keywords) ? s.keywords[0] : s.keywords;
      return k ? { ...k, pozisyon: s.position } : null;
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  return (
    <>
      <Link
        href="/urun-seo"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Ürün SEO
      </Link>

      <SayfaBasligi
        baslik={kirp(urun.name, 70) || urlYolu(urun.url)}
        aciklama={urun.url}
        aksiyon={
          <Buton asChild gorunum="ikincil">
            <a href={urun.url} target="_blank" rel="noopener noreferrer">
              Ürünü Aç
              <ExternalLink aria-hidden />
            </a>
          </Buton>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-9">
          <section className="rounded-[14px] border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-6">
              <SkorHalkasi skor={urun.seo_score} boyut={96} etiket="Ürün skoru" />
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <OzetDegeri etiket="Karşılanan kontrol" deger={`${gecen}/${kontroller.length}`} />
                <OzetDegeri etiket="Marka" deger={urun.brand ?? "—"} />
                <OzetDegeri etiket="Fiyat" deger={urun.price ? para(urun.price, urun.currency ?? "TRY") : "—"} />
                <OzetDegeri etiket="Görsel" deger={sayi(urun.images_count)} />
                <OzetDegeri etiket="Yorum" deger={sayi(urun.reviews_count)} />
                <OzetDegeri etiket="Son analiz" deger={tarih(urun.last_analyzed_at)} />
              </div>
            </div>
          </section>

          <section>
            <BolumBasligi
              baslik="Ürün SEO kontrol listesi"
              aciklama="Bu maddeler ürün sayfalarının arama ve Alışveriş görünürlüğünü belirler."
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {kontroller.map((k) => (
                <li key={k.kod} className="flex gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                      k.gecti ? "bg-positive-soft text-positive" : "bg-critical-soft text-critical"
                    }`}
                    aria-hidden
                  >
                    {k.gecti ? "✓" : "!"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[13.5px] ${k.gecti ? "text-ink-500" : "font-medium text-ink-900"}`}>
                        {k.ad}
                      </span>
                      {!k.gecti && k.onem === "kritik" ? <Rozet ton="kritik">Kritik</Rozet> : null}
                    </div>
                    {!k.gecti ? (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{k.oneri}</p>
                    ) : null}
                  </div>
                </li>
              ))}
              {kontroller.length === 0 ? (
                <li className="px-4 py-8 text-center text-[13px] text-ink-400">
                  Kontrol listesi verisi bulunamadı. Site analizini yenileyin.
                </li>
              ) : null}
            </ul>
          </section>

          <section>
            <BolumBasligi
              baslik="Yapay zekâ önerisi"
              aciklama="Bu ürün sayfasını nasıl güçlendirebileceğinizi verilerle çıkarır."
            />
            <div className="mt-4">
              <AiOneriPaneli gorev={{ gorev: "urun", urunId: urun.id }} butonMetni="Bu Ürünü Analiz Et" />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <BolumBasligi baslik="Merchant durumu" />
            <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
              {merchant ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-[13px] text-ink-500">Sağlık skoru</span>
                    <span className="tabular text-[15px] font-semibold text-ink-900">
                      {merchant.health_score ?? "—"}
                    </span>
                  </div>
                  <div className="space-y-2 text-[13px]">
                    <Satir
                      etiket="Alışveriş görünürlüğü"
                      deger={merchant.shopping_visible ? "Görünüyor" : "Görünmüyor"}
                    />
                    <Satir etiket="Satıcı sayısı" deger={sayi(merchant.seller_count)} />
                    <Satir
                      etiket="Fiyat konumu"
                      deger={
                        merchant.price_position === "en_ucuz"
                          ? "En uygun fiyatlardan"
                          : merchant.price_position === "pahali"
                            ? "Pahalı tarafta"
                            : merchant.price_position === "ortalama"
                              ? "Ortalama"
                              : "—"
                      }
                    />
                  </div>
                  {(merchant.missing_fields as string[])?.length ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-1.5 text-[12px] text-ink-400">Eksik alanlar</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(merchant.missing_fields as string[]).map((a) => (
                          <Rozet key={a} ton="uyari">
                            {a}
                          </Rozet>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="py-4 text-center text-[13px] text-ink-400">
                  Bu ürün için Merchant analizi henüz yapılmadı.
                </p>
              )}
            </div>
          </section>

          <section>
            <BolumBasligi baslik="Yapısal veri alanları" />
            <dl className="mt-4 space-y-2.5 rounded-[14px] border border-line bg-white p-4 text-[13px]">
              <Satir etiket="GTIN" deger={urun.gtin ?? "Eksik"} eksik={!urun.gtin} />
              <Satir etiket="MPN" deger={urun.mpn ?? "Eksik"} eksik={!urun.mpn} />
              <Satir etiket="SKU" deger={urun.sku ?? "Eksik"} eksik={!urun.sku} />
              <Satir etiket="Stok durumu" deger={urun.availability ?? "Eksik"} eksik={!urun.availability} />
              <Satir
                etiket="Product schema"
                deger={urun.has_product_schema ? "Var" : "Yok"}
                eksik={!urun.has_product_schema}
              />
              <Satir
                etiket="Breadcrumb"
                deger={urun.has_breadcrumb ? "Var" : "Yok"}
                eksik={!urun.has_breadcrumb}
              />
            </dl>
          </section>

          {kelimeler.length ? (
            <section>
              <BolumBasligi baslik="Sıralanan kelimeler" />
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {kelimeler.map((k) => (
                  <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <Link
                      href={`/anahtar-kelimeler/${k.id}`}
                      className="min-w-0 truncate text-[13px] text-ink-800 hover:underline"
                    >
                      {k.keyword}
                    </Link>
                    <span className="tabular shrink-0 text-[13px] font-medium text-ink-900">
                      {k.pozisyon ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sayfa ? (
            <section>
              <BolumBasligi baslik="Sayfa verileri" />
              <dl className="mt-4 space-y-2.5 rounded-[14px] border border-line bg-white p-4 text-[13px]">
                <Satir etiket="Başlık uzunluğu" deger={`${sayfa.title_length ?? 0} karakter`} />
                <Satir etiket="Açıklama uzunluğu" deger={`${sayfa.meta_description_length ?? 0} karakter`} />
                <Satir etiket="Metin uzunluğu" deger={`${sayi(sayfa.word_count)} kelime`} />
                <Satir etiket="İç bağlantı" deger={sayi(sayfa.internal_links_count)} />
                <div className="pt-1">
                  <Link
                    href={`/sayfa-analizi/${sayfa.id}`}
                    className="text-[12.5px] font-medium text-ink-600 hover:text-ink-900"
                  >
                    Sayfa analizini aç
                  </Link>
                </div>
              </dl>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function Satir({
  etiket,
  deger,
  eksik = false,
}: {
  etiket: string;
  deger: React.ReactNode;
  eksik?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{etiket}</dt>
      <dd className={`tabular font-medium ${eksik ? "text-critical" : "text-ink-800"}`}>{deger}</dd>
    </div>
  );
}
