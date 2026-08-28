import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FirsatDurumSecici, IcerikAnaliziFormu } from "@/components/app/icerik-analizi-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { BosDurum } from "@/components/ui/feedback";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { goreliZaman, kirp, sayi } from "@/lib/utils";
import type { IcerikAnalizi, IcerikFirsati } from "@/types/database";

export const metadata: Metadata = {
  title: "İçerik Analizi",
  robots: { index: false, follow: false },
};

const AMAC_ETIKET: Record<string, string> = {
  bilgi: "Bilgi",
  ticari: "Ticari",
  islem: "İşlem",
  gezinme: "Gezinme",
};

const DURUM_TONU = {
  acik: "notr",
  planlandi: "bilgi",
  yazildi: "uyari",
  yayinlandi: "olumlu",
} as const;

const DURUM_ETIKET = {
  acik: "Açık",
  planlandi: "Planlandı",
  yazildi: "Yazıldı",
  yayinlandi: "Yayınlandı",
} as const;

export default async function IcerikAnaliziSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ data: analizVerisi }, { data: firsatVerisi }, { data: kelimeVerisi }] = await Promise.all([
    supabase
      .from("content_analysis")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("content_opportunities")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("keywords")
      .select("keyword, search_volume")
      .eq("project_id", proje.id)
      .eq("is_tracked", true)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(8),
  ]);

  const analizler = (analizVerisi ?? []) as IcerikAnalizi[];
  const firsatlar = (firsatVerisi ?? []) as IcerikFirsati[];
  const onerilenler = (kelimeVerisi ?? []).map((k) => k.keyword);

  return (
    <>
      <SayfaBasligi
        baslik="İçerik Analizi"
        aciklama="Bir anahtar kelime seçin; arama sonuçlarındaki güçlü sayfaları inceleyip hangi konuları ele almanız gerektiğini çıkaralım."
      />

      <div className="space-y-10">
        <section>
          <IcerikAnaliziFormu onerilenler={onerilenler} />
        </section>

        {analizler.length === 0 ? (
          <BosDurum
            ikon={FileText}
            baslik="Henüz içerik analizi yapılmadı."
            aciklama="Sıralanmak istediğiniz bir anahtar kelime girin. İlk sıradaki sayfaların hangi konuları işlediğini, hangi soruları cevapladığını ve sizde eksik olanları listeleyelim."
          />
        ) : (
          <>
            {/* --- İçerik fırsatları --- */}
            {firsatlar.length ? (
              <section>
                <BolumBasligi
                  baslik="İçerik fırsatları"
                  aciklama="Analizlerden çıkan uygulanabilir içerik planları."
                />
                <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                  {firsatlar.map((f) => (
                    <li key={f.id} className="flex flex-wrap items-start gap-4 px-4 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-medium text-ink-900">{f.keyword}</span>
                          <Rozet ton={DURUM_TONU[f.status]}>{DURUM_ETIKET[f.status]}</Rozet>
                        </div>
                        {f.title_suggestion ? (
                          <p className="mt-1 text-[13px] text-ink-500">
                            Önerilen başlık: {f.title_suggestion}
                          </p>
                        ) : null}
                        <p className="mt-1.5 text-[12.5px] text-ink-400">
                          {sayi(f.outline?.length ?? 0)} plan maddesi · {sayi(f.questions?.length ?? 0)}{" "}
                          soru
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <FirsatDurumSecici firsatId={f.id} mevcut={f.status} />
                        {f.analysis_id ? (
                          <Buton asChild gorunum="ikincil" boyut="sm">
                            <Link href={`/icerik-analizi/${f.analysis_id}`}>Planı Gör</Link>
                          </Buton>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* --- Analizler --- */}
            <section>
              <BolumBasligi
                baslik="Yapılan analizler"
                aciklama="Her analiz, o kelimede sıralanan sayfaların içerik yapısını gösterir."
              />
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {analizler.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/icerik-analizi/${a.id}`}
                      className="flex flex-wrap items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-muted/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[14px] font-medium text-ink-900">{a.keyword}</span>
                          {a.search_intent ? (
                            <Rozet>{AMAC_ETIKET[a.search_intent] ?? a.search_intent}</Rozet>
                          ) : null}
                        </div>
                        <p className="mt-1 text-[12.5px] text-ink-400">
                          {kirp(
                            (a.common_topics ?? [])
                              .slice(0, 6)
                              .map((k) => k.konu)
                              .join(" · "),
                            110,
                          ) || "Konu çıkarılamadı"}
                        </p>
                      </div>

                      <dl className="hidden gap-7 sm:flex">
                        <div>
                          <dt className="text-[11.5px] text-ink-400">Ortalama uzunluk</dt>
                          <dd className="tabular mt-0.5 text-[13.5px] font-medium text-ink-800">
                            {a.avg_word_count ? `${sayi(a.avg_word_count)} kelime` : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[11.5px] text-ink-400">Boşluk</dt>
                          <dd className="tabular mt-0.5 text-[13.5px] font-medium text-ink-800">
                            {sayi(a.gaps?.length ?? 0)}
                          </dd>
                        </div>
                      </dl>

                      <span className="shrink-0 text-[12px] text-ink-400">
                        {goreliZaman(a.created_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </>
  );
}
