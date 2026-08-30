import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { IcerikStratejisiPaneli } from "@/components/app/icerik-stratejisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { SerpGorunumu, type SerpVerisi } from "@/components/app/serp-gorunumu";
import { SiraHucresi } from "@/components/app/sira-hucresi";
import { CizgiGrafik } from "@/components/charts";
import { AmacRozeti, Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { OzetDegeri } from "@/components/ui/metric";
import { FirsatSkoru, PozisyonDegisimi, SkorCubugu } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { para, sayi, tarihSaat, urlYolu } from "@/lib/utils";
import type { KelimeOzeti, SerpSonucu } from "@/types/database";

export const metadata: Metadata = {
  title: "Anahtar Kelime Detayı",
  robots: { index: false, follow: false },
};

const AY_ADI = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const SINYAL_ADI: Record<string, string> = {
  hacim: "Arama hacmi",
  rekabet: "Rekabet durumu",
  mevcut_siralama: "Mevcut sıralama",
  ticari_amac: "Ticari değer",
  serp_yapisi: "SERP yapısı",
  rakip_yogunlugu: "Rakip yoğunluğu",
};

export default async function KelimeDetaySayfasi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { proje } = await projeBaglami();
  const { id } = await params;
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("kelime_ozet")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();
  const kelime = data as KelimeOzeti;

  const [{ data: firsat }, { data: serpVerisi }, { data: gecmis }, { data: rakipSiralari }] =
    await Promise.all([
      supabase
        .from("keyword_opportunities")
        .select("*")
        .eq("keyword_id", id)
        .eq("status", "acik")
        .order("score", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("serp_results")
        .select("*")
        .eq("keyword_id", id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("keyword_rankings")
        .select("position, checked_at")
        .eq("keyword_id", id)
        .eq("is_competitor", false)
        .order("checked_at", { ascending: true })
        .limit(30),
      supabase
        .from("keyword_rankings")
        .select("domain, position, url")
        .eq("keyword_id", id)
        .eq("is_competitor", true)
        .order("position", { ascending: true })
        .limit(10),
    ]);

  const serp = serpVerisi as SerpSonucu | null;

  const ilkSerpVerisi: SerpVerisi | null = serp
    ? {
        keyword: serp.keyword,
        toplam_sonuc: serp.se_results_count,
        ogeler: serp.items,
        ozellikler: [],
        bizim_pozisyon: kelime.position,
        bizim_url: kelime.url,
        rakip_pozisyonlari: [],
        sorular: [],
        ilgili_aramalar: [],
        alisveris_var: serp.items.some((i) => i.tur === "shopping" || i.tur === "popular_products"),
      }
    : null;

  const siralamaGrafigi = (gecmis ?? [])
    .filter((g) => g.position !== null)
    .map((g) => {
      const d = new Date(g.checked_at);
      return { etiket: `${d.getDate()} ${AY_ADI[d.getMonth()]}`, deger: g.position! };
    });

  const trendGrafigi = (kelime.trend ?? []).map((t) => ({
    etiket: `${AY_ADI[t.ay - 1]} ${String(t.yil).slice(2)}`,
    deger: t.hacim,
  }));

  const sinyaller = (firsat?.signals ?? {}) as Record<string, number>;

  return (
    <>
      <Link
        href="/anahtar-kelimeler"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Anahtar Kelimeler
      </Link>

      <SayfaBasligi
        baslik={kelime.keyword}
        aciklama={`${proje.location_name ?? "Türkiye"} · Türkçe arama sonuçları`}
        aksiyon={
          kelime.url ? (
            <Buton asChild gorunum="ikincil">
              <a href={kelime.url} target="_blank" rel="noopener noreferrer">
                Sıralayan Sayfayı Aç
                <ExternalLink aria-hidden />
              </a>
            </Buton>
          ) : null
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-3 lg:grid-cols-6">
        <OzetDegeri etiket="Aylık arama" deger={sayi(kelime.search_volume)} />
        <OzetDegeri
          etiket="Sıralamanız"
          deger={
            kelime.position ? (
              <span className="inline-flex items-baseline gap-2">
                {kelime.position}
                <PozisyonDegisimi simdiki={kelime.position} onceki={kelime.previous_position} />
              </span>
            ) : (
              <SiraHucresi sira={null} olculduAt={kelime.checked_at} />
            )
          }
          ipucu={
            kelime.checked_at
              ? `Sıra ${tarihSaat(kelime.checked_at)} tarihinde canlı olarak ölçüldü.`
              : "Bu kelimenin sırası henüz ölçülmedi. Sıralar her analizde, paketinizin izin verdiği sayıda kelime için canlı ölçülür."
          }
        />
        <OzetDegeri
          etiket="Zorluk"
          deger={kelime.difficulty ?? "—"}
          ipucu="0-100 arası. Yüksek değer, ilk sayfaya çıkmanın daha zor olduğunu gösterir."
        />
        <OzetDegeri etiket="Tıklama başı maliyet" deger={para(kelime.cpc)} ipucu="Google Ads'te bu kelimenin tahmini tıklama maliyeti; ticari değerin göstergesidir." />
        <div className="min-w-0">
          <p className="text-[12px] text-ink-400">Arama amacı</p>
          <div className="mt-1.5">
            <AmacRozeti amac={kelime.intent} />
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-[12px] text-ink-400">Fırsat skoru</p>
          <div className="mt-1.5">
            {kelime.opportunity_score !== null ? (
              <FirsatSkoru skor={kelime.opportunity_score} />
            ) : (
              <span className="text-ink-300">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          <section>
            <BolumBasligi
              baslik="Arama sonuçları"
              aciklama="Bu kelimede kimin sıralandığını ve hangi alanların açık olduğunu görün."
            />
            <div className="mt-4">
              <SerpGorunumu
                keywordId={kelime.id}
                keyword={kelime.keyword}
                ilkVeri={ilkSerpVerisi}
                sonAlinma={serp ? tarihSaat(serp.fetched_at) : null}
              />
            </div>
          </section>

          {siralamaGrafigi.length >= 2 ? (
            <section>
              <BolumBasligi baslik="Sıralama geçmişi" aciklama="Düşük değer daha iyi sıralama demektir." />
              <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
                <CizgiGrafik veri={siralamaGrafigi} yukseklik={200} birim="sıra" />
              </div>
            </section>
          ) : null}

          {trendGrafigi.length >= 2 ? (
            <section>
              <BolumBasligi baslik="Arama hacmi trendi" aciklama="Son 12 aydaki aylık arama sayısı." />
              <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
                <CizgiGrafik veri={trendGrafigi} yukseklik={200} birim="arama" />
              </div>
            </section>
          ) : null}

          <section>
            <BolumBasligi
              baslik="İçerik stratejisi"
              aciklama="Bu kelime için hangi içeriği, nasıl kurgulamanız gerektiğini çıkarır."
            />
            <div className="mt-4">
              <IcerikStratejisiPaneli keyword={kelime.keyword} />
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          {firsat ? (
            <section>
              <BolumBasligi baslik="Fırsat kırılımı" />
              <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-[13px] text-ink-500">Fırsat skoru</span>
                  <FirsatSkoru skor={firsat.score} />
                </div>
                {firsat.reason ? (
                  <p className="mb-4 rounded-[10px] bg-surface-muted px-3 py-2.5 text-[13px] leading-relaxed text-ink-600">
                    {firsat.reason}
                  </p>
                ) : null}
                <div className="space-y-3">
                  {Object.entries(sinyaller).map(([anahtar, deger]) => (
                    <SkorCubugu key={anahtar} etiket={SINYAL_ADI[anahtar] ?? anahtar} skor={Math.round(deger)} />
                  ))}
                </div>
                {firsat.potential_traffic ? (
                  <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-500">
                    {firsat.target_position}. sıraya çıkıldığında ayda tahmini{" "}
                    <span className="font-semibold text-ink-900">
                      +{sayi(firsat.potential_traffic)} ziyaret
                    </span>
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {(rakipSiralari ?? []).length ? (
            <section>
              <BolumBasligi baslik="Rakip sıralamaları" />
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {(rakipSiralari ?? []).map((r, i) => (
                  <li key={`${r.domain}-${i}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink-900">{r.domain}</p>
                      {r.url ? (
                        <p className="truncate text-[11.5px] text-ink-400">{urlYolu(r.url)}</p>
                      ) : null}
                    </div>
                    <Rozet ton={r.position && kelime.position && r.position < kelime.position ? "uyari" : "notr"}>
                      {r.position}. sıra
                    </Rozet>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </>
  );
}
