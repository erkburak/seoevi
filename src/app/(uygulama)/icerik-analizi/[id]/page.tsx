import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IcerikStratejisiPaneli } from "@/components/app/icerik-stratejisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Ipucu } from "@/components/ui/tooltip";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, tarihSaat, urlYolu } from "@/lib/utils";
import type { IcerikAnalizi, IcerikFirsati } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase.from("content_analysis").select("keyword").eq("id", id).maybeSingle();

  return {
    title: data?.keyword ? `${data.keyword} — İçerik Analizi` : "İçerik Analizi",
    robots: { index: false, follow: false },
  };
}

const AMAC_ETIKET: Record<string, string> = {
  bilgi: "Bilgi amaçlı",
  ticari: "Ticari",
  islem: "İşlem",
  gezinme: "Gezinme",
};

export default async function IcerikAnaliziDetayi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data: analizVerisi } = await supabase
    .from("content_analysis")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!analizVerisi) notFound();
  const analiz = analizVerisi as IcerikAnalizi;

  const { data: firsatVerisi } = await supabase
    .from("content_opportunities")
    .select("*")
    .eq("analysis_id", analiz.id)
    .maybeSingle();

  const firsat = (firsatVerisi ?? null) as IcerikFirsati | null;

  const rakipSayfalar = analiz.competitor_pages ?? [];
  const bosluklar = analiz.gaps ?? [];
  const konular = analiz.common_topics ?? [];

  return (
    <>
      <div className="mb-4">
        <Link
          href="/icerik-analizi"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          İçerik analizine dön
        </Link>
      </div>

      <SayfaBasligi
        baslik={analiz.keyword}
        aciklama={`Bu kelimede sıralanan sayfaların içerik yapısı. Analiz ${tarihSaat(analiz.created_at)} tarihinde yapıldı.`}
      />

      <div className="space-y-10">
        {/* --- Özet --- */}
        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri
            etiket="Arama amacı"
            deger={analiz.search_intent ? (AMAC_ETIKET[analiz.search_intent] ?? analiz.search_intent) : "—"}
            ipucu="Kullanıcının bu aramayı yaparken ne istediği. İçeriğin tonunu bu belirler."
          />
          <OzetDegeri
            etiket="Ortalama uzunluk"
            deger={analiz.avg_word_count ? `${sayi(analiz.avg_word_count)} kelime` : "—"}
            ipucu="İlk sıradaki sayfaların ortalama kelime sayısı. Hedefiniz bu civarı olmalı."
          />
          <OzetDegeri etiket="İncelenen sayfa" deger={sayi(rakipSayfalar.length)} />
          <OzetDegeri
            etiket="İçerik boşluğu"
            deger={sayi(bosluklar.length)}
            ipucu="Rakiplerin çoğunun ele aldığı ancak sizde bulunmayan konular."
          />
        </section>

        {/* --- İçerik boşlukları --- */}
        {bosluklar.length ? (
          <section>
            <BolumBasligi
              baslik="Kapatmanız gereken boşluklar"
              aciklama="Rakiplerin en az yarısının ele aldığı, sizin sayfanızda geçmeyen konular."
            />
            <ul className="mt-4 flex flex-wrap gap-2">
              {bosluklar.map((b) => (
                <li
                  key={b}
                  className="rounded-full border border-caution/20 bg-caution-soft px-3 py-1.5 text-[13px] font-medium text-caution"
                >
                  {b}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Ortak konular --- */}
        {konular.length ? (
          <section>
            <BolumBasligi
              baslik="Ortak konular"
              aciklama="Sıralanan sayfaların hangi konuyu ne oranda ele aldığı."
              sag={<Ipucu metin="Kapsam, o konuyu işleyen rakip sayfaların oranını gösterir." />}
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {konular.map((k) => (
                <li key={k.konu} className="flex items-center gap-4 px-4 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-700">{k.konu}</span>
                  <div className="h-1.5 w-28 shrink-0 overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-ink-700"
                      style={{ width: `${Math.min(100, k.kapsam)}%` }}
                    />
                  </div>
                  <span className="tabular w-10 shrink-0 text-right text-[12.5px] text-ink-500">
                    %{k.kapsam}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Başlıklar --- */}
        {analiz.headings?.length ? (
          <section>
            <BolumBasligi
              baslik="Rakiplerin kullandığı başlıklar"
              aciklama="Kendi içerik planınızı kurarken referans alabilirsiniz."
            />
            <ul className="mt-4 columns-1 gap-x-8 md:columns-2">
              {analiz.headings.map((h) => (
                <li
                  key={h}
                  className="mb-2 break-inside-avoid border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-600"
                >
                  {h}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Sorular --- */}
        {analiz.questions?.length ? (
          <section>
            <BolumBasligi
              baslik="Cevaplanması gereken sorular"
              aciklama="Arama sonuçlarında kullanıcıların bu kelimeyle birlikte sorduğu sorular."
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {analiz.questions.map((s) => (
                <li key={s} className="px-4 py-3 text-[13.5px] leading-relaxed text-ink-700">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Rakip sayfalar --- */}
        {rakipSayfalar.length ? (
          <section>
            <BolumBasligi baslik="İncelenen sayfalar" aciklama="Bu kelimede öne çıkan sayfalar." />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {rakipSayfalar.map((s) => (
                <li key={s.url} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  {s.pozisyon !== null ? (
                    <span className="tabular inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-ink-50 text-[12.5px] font-semibold text-ink-700">
                      {s.pozisyon}
                    </span>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink-900">{s.alan_adi}</p>
                    <p className="truncate text-[12px] text-ink-400">{urlYolu(s.url)}</p>
                  </div>
                  <span className="tabular shrink-0 text-[12.5px] text-ink-500">
                    {s.kelime_sayisi ? `${sayi(s.kelime_sayisi)} kelime` : "—"}
                  </span>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={`${s.alan_adi} sayfasını yeni sekmede aç`}
                    className="shrink-0 rounded-[8px] p-1.5 text-ink-300 transition-colors hover:bg-surface-muted hover:text-ink-700"
                  >
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Semantik terimler --- */}
        {analiz.semantic_terms?.length ? (
          <section>
            <BolumBasligi
              baslik="Sık geçen terimler"
              aciklama="İçeriğinizde doğal biçimde yer vermeniz beklenen kelimeler."
            />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {analiz.semantic_terms.map((t) => (
                <Rozet key={t.terim}>
                  {t.terim} <span className="tabular text-ink-300">{t.siklik}</span>
                </Rozet>
              ))}
            </div>
          </section>
        ) : null}

        {/* --- Kaydedilmiş plan --- */}
        {firsat?.outline?.length ? (
          <section>
            <BolumBasligi
              baslik="Önerilen içerik planı"
              aciklama={firsat.title_suggestion ?? undefined}
            />
            <ol className="mt-4 space-y-2 rounded-[14px] border border-line bg-white p-5">
              {firsat.outline.map((m, i) => (
                <li key={m} className="flex gap-3 text-[13.5px] leading-relaxed text-ink-700">
                  <span className="tabular shrink-0 text-ink-300">{i + 1}.</span>
                  {m}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {/* --- AI planı --- */}
        <section>
          <BolumBasligi
            baslik="Yapay zekâ ile içerik planı"
            aciklama="Yukarıdaki verilere dayanarak yazıya dökülebilir bir plan oluşturur. Hiçbir değişiklik otomatik uygulanmaz."
          />
          <div className="mt-4">
            <IcerikStratejisiPaneli keyword={analiz.keyword} />
          </div>
        </section>
      </div>
    </>
  );
}
