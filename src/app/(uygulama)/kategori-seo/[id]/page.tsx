import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HedefKelimeFormu } from "@/components/app/kategori-hedef";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { IcerikStratejisiPaneli } from "@/components/app/icerik-stratejisi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { OzetDegeri } from "@/components/ui/metric";
import { SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, tarih, urlYolu } from "@/lib/utils";
import type { Kategori, Onem } from "@/types/database";

export const metadata: Metadata = {
  title: "Kategori SEO Detayı",
  robots: { index: false, follow: false },
};

type Kontrol = { kod: string; ad: string; gecti: boolean; onem: Onem; aciklama: string; oneri: string };

export default async function KategoriDetaySayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { proje } = await projeBaglami();
  const { id } = await params;
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();
  const kategori = data as Kategori;

  const [{ data: sayfa }, { data: siralamalar }] = await Promise.all([
    kategori.page_id
      ? supabase.from("pages").select("*").eq("id", kategori.page_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("keyword_rankings")
      .select("position, keywords(id, keyword, search_volume)")
      .eq("project_id", proje.id)
      .eq("url", kategori.url)
      .eq("is_competitor", false)
      .order("position", { ascending: true })
      .limit(20),
  ]);

  const kontroller = ((kategori.checks as { kontroller?: Kontrol[] })?.kontroller ?? []) as Kontrol[];

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
        href="/kategori-seo"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Kategori SEO
      </Link>

      <SayfaBasligi
        baslik={kirp(kategori.name, 70) || urlYolu(kategori.url)}
        aciklama={kategori.url}
        aksiyon={
          <Buton asChild gorunum="ikincil">
            <a href={kategori.url} target="_blank" rel="noopener noreferrer">
              Kategoriyi Aç
              <ExternalLink aria-hidden />
            </a>
          </Buton>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-9">
          <section className="rounded-[14px] border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-6">
              <SkorHalkasi skor={kategori.seo_score} boyut={96} etiket="Kategori" />
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                <OzetDegeri etiket="Metin uzunluğu" deger={`${sayi(kategori.description_length)} karakter`} />
                <OzetDegeri etiket="İç bağlantı" deger={sayi(kategori.internal_links_count)} />
                <OzetDegeri etiket="Son analiz" deger={tarih(kategori.last_analyzed_at)} />
              </div>
            </div>
          </section>

          <section>
            <BolumBasligi
              baslik="Kategori kontrol listesi"
              aciklama="Kategori sayfalarının arama performansını belirleyen maddeler."
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

          {kategori.target_keyword ? (
            <section>
              <BolumBasligi
                baslik="İçerik planı"
                aciklama={`"${kategori.target_keyword}" için kategori metni önerisi.`}
              />
              <div className="mt-4">
                <IcerikStratejisiPaneli keyword={kategori.target_keyword} />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-8">
          <section>
            <BolumBasligi
              baslik="Hedef anahtar kelime"
              aciklama="Bu kategoriye tek bir ana kelime atayın."
            />
            <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
              <HedefKelimeFormu kategoriId={kategori.id} mevcut={kategori.target_keyword} />
            </div>
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
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-400">Başlık uzunluğu</dt>
                  <dd className="tabular font-medium text-ink-800">{sayfa.title_length ?? 0} karakter</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-ink-400">Açıklama uzunluğu</dt>
                  <dd className="tabular font-medium text-ink-800">
                    {sayfa.meta_description_length ?? 0} karakter
                  </dd>
                </div>
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
