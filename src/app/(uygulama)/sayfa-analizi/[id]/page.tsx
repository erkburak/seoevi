import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AiOneriPaneli } from "@/components/app/ai-oneri";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { OnemRozeti, Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { OzetDegeri } from "@/components/ui/metric";
import { PozisyonDegisimi, SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, tarih, urlYolu } from "@/lib/utils";
import type { Sayfa, SayfaTuru, TeknikSorun } from "@/types/database";

export const metadata: Metadata = {
  title: "Sayfa SEO Sağlığı",
  robots: { index: false, follow: false },
};

const TUR_ETIKET: Record<SayfaTuru, string> = {
  anasayfa: "Ana sayfa",
  urun: "Ürün",
  kategori: "Kategori",
  icerik: "İçerik",
  diger: "Diğer",
};

export default async function SayfaDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { proje } = await projeBaglami();
  const { id } = await params;
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();
  const sayfa = data as Sayfa;

  const [{ data: sorunVerisi }, { data: siralamalar }] = await Promise.all([
    supabase
      .from("technical_issues")
      .select("*")
      .eq("page_id", id)
      .eq("status", "acik")
      .order("severity", { ascending: true })
      .limit(50),
    supabase
      .from("keyword_rankings")
      .select("position, previous_position, keyword_id, keywords(id, keyword, search_volume)")
      .eq("project_id", proje.id)
      .eq("url", sayfa.url)
      .eq("is_competitor", false)
      .order("position", { ascending: true })
      .limit(25),
  ]);

  const sorunlar = (sorunVerisi ?? []) as TeknikSorun[];

  type SiraSatiri = {
    position: number | null;
    previous_position: number | null;
    keyword_id: string;
    keywords: { id: string; keyword: string; search_volume: number | null } | { id: string; keyword: string; search_volume: number | null }[] | null;
  };

  const kelimeler = ((siralamalar ?? []) as unknown as SiraSatiri[])
    .map((s) => {
      const k = Array.isArray(s.keywords) ? s.keywords[0] : s.keywords;
      return k
        ? { id: k.id, keyword: k.keyword, hacim: k.search_volume, pozisyon: s.position, onceki: s.previous_position }
        : null;
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  // Sayfa skoru: açık sorunların ağırlıklı cezası
  const ceza = sorunlar.reduce(
    (t, s) => t + (s.severity === "kritik" ? 14 : s.severity === "uyari" ? 7 : 3),
    0,
  );
  const skor = sayfa.seo_score ?? Math.max(0, 100 - ceza);

  return (
    <>
      <Link
        href="/sayfa-analizi"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Sayfa Analizi
      </Link>

      <SayfaBasligi
        baslik={kirp(sayfa.title, 70) || urlYolu(sayfa.url)}
        aciklama={sayfa.url}
        aksiyon={
          <Buton asChild gorunum="ikincil">
            <a href={sayfa.url} target="_blank" rel="noopener noreferrer">
              Sayfayı Aç
              <ExternalLink aria-hidden />
            </a>
          </Buton>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-9">
          <section className="rounded-[14px] border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-6">
              <SkorHalkasi skor={skor} boyut={96} etiket="Sayfa skoru" />
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <OzetDegeri etiket="Sayfa türü" deger={<Rozet>{TUR_ETIKET[sayfa.page_type]}</Rozet>} />
                <OzetDegeri
                  etiket="Durum kodu"
                  deger={
                    <span className={(sayfa.status_code ?? 200) >= 400 ? "text-critical" : ""}>
                      {sayfa.status_code ?? "—"}
                    </span>
                  }
                />
                <OzetDegeri etiket="Kelime sayısı" deger={sayi(sayfa.word_count)} />
                <OzetDegeri etiket="İç bağlantı" deger={sayi(sayfa.internal_links_count)} />
                <OzetDegeri etiket="Tıklama derinliği" deger={sayfa.click_depth ?? "—"} ipucu="Ana sayfadan bu sayfaya ulaşmak için gereken tıklama sayısı." />
                <OzetDegeri
                  etiket="İndekslenebilir"
                  deger={sayfa.is_indexable === false ? "Hayır" : "Evet"}
                />
              </div>
            </div>
          </section>

          <section>
            <BolumBasligi baslik="Meta veriler" />
            <dl className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              <MetaSatiri
                etiket="Başlık etiketi"
                deger={sayfa.title}
                uzunluk={sayfa.title_length}
                alt={25}
                ust={65}
              />
              <MetaSatiri
                etiket="Meta açıklama"
                deger={sayfa.meta_description}
                uzunluk={sayfa.meta_description_length}
                alt={70}
                ust={165}
              />
              <MetaSatiri etiket="H1 başlığı" deger={sayfa.h1} />
              <MetaSatiri etiket="Canonical" deger={sayfa.canonical_url} />
              <MetaSatiri
                etiket="Yapısal veri"
                deger={sayfa.has_schema ? (sayfa.schema_types.join(", ") || "Var") : null}
              />
            </dl>
          </section>

          <section>
            <BolumBasligi
              baslik="Açık sorunlar"
              aciklama={sorunlar.length ? `${sayi(sorunlar.length)} sorun bulundu.` : undefined}
            />
            <div className="mt-4">
              {sorunlar.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-8 text-center text-[13px] text-ink-400">
                  Bu sayfada açık teknik sorun bulunmuyor.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
                  {sorunlar.map((s) => (
                    <li key={s.id} className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <OnemRozeti onem={s.severity} />
                        <span className="text-[14px] font-medium text-ink-900">{s.title}</span>
                      </div>
                      {s.description ? (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{s.description}</p>
                      ) : null}
                      {s.recommendation ? (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
                          <span className="font-medium">Öneri:</span> {s.recommendation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <BolumBasligi
              baslik="Yapay zekâ değerlendirmesi"
              aciklama="Bu sayfanın performansı neden düşük ve ne yapmalısınız?"
            />
            <div className="mt-4">
              <AiOneriPaneli
                gorev={{ gorev: "sayfa", sayfaId: sayfa.id }}
                butonMetni="Bu Sayfayı Analiz Et"
              />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <BolumBasligi baslik="Sıralanan kelimeler" />
            <div className="mt-4">
              {kelimeler.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-400">
                  Bu sayfa henüz hiçbir kelimede sıralanmıyor.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
                  {kelimeler.map((k) => (
                    <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <Link
                          href={`/anahtar-kelimeler/${k.id}`}
                          className="block truncate text-[13px] font-medium text-ink-900 hover:underline"
                        >
                          {k.keyword}
                        </Link>
                        <p className="tabular mt-0.5 text-[11.5px] text-ink-400">{sayi(k.hacim)} arama</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="tabular text-[13px] font-medium text-ink-900">{k.pozisyon ?? "—"}</span>
                        <PozisyonDegisimi simdiki={k.pozisyon} onceki={k.onceki} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <BolumBasligi baslik="Sayfa bilgileri" />
            <dl className="mt-4 space-y-2.5 rounded-[14px] border border-line bg-white p-4 text-[13px]">
              <Bilgi etiket="Görsel sayısı" deger={sayi(sayfa.images_count)} />
              <Bilgi
                etiket="Alt metni eksik görsel"
                deger={sayfa.images_without_alt ? sayi(sayfa.images_without_alt) : "Yok"}
              />
              <Bilgi etiket="Dış bağlantı" deger={sayi(sayfa.external_links_count)} />
              <Bilgi etiket="H2 sayısı" deger={sayi(sayfa.h2_count)} />
              <Bilgi etiket="Son tarama" deger={tarih(sayfa.last_crawled_at)} />
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function MetaSatiri({
  etiket,
  deger,
  uzunluk,
  alt,
  ust,
}: {
  etiket: string;
  deger: string | null;
  uzunluk?: number | null;
  alt?: number;
  ust?: number;
}) {
  const uygun =
    uzunluk !== undefined && uzunluk !== null && alt !== undefined && ust !== undefined
      ? uzunluk >= alt && uzunluk <= ust
      : null;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[12.5px] font-medium text-ink-500">{etiket}</dt>
        {uzunluk !== undefined && uzunluk !== null ? (
          <span
            className={`tabular text-[11.5px] ${uygun === false ? "text-caution" : "text-ink-400"}`}
          >
            {uzunluk} karakter
            {alt && ust ? ` · önerilen ${alt}-${ust}` : ""}
          </span>
        ) : null}
      </div>
      <dd className={`mt-1 text-[13.5px] leading-relaxed ${deger ? "text-ink-800" : "text-critical"}`}>
        {deger || "Tanımlı değil"}
      </dd>
    </div>
  );
}

function Bilgi({ etiket, deger }: { etiket: string; deger: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-400">{etiket}</dt>
      <dd className="tabular font-medium text-ink-800">{deger}</dd>
    </div>
  );
}
