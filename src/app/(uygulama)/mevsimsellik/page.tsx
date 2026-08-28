import { CalendarClock } from "lucide-react";
import type { Metadata } from "next";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BosDurum, Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { KELIME_SEKMELERI } from "@/config/navigation";
import { mevsimselAnaliz, TICARET_TAKVIMI } from "@/lib/analiz/mevsimsellik";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mevsimsellik",
  robots: { index: false, follow: false },
};

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default async function MevsimsellikSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [ozet, { data: calisanIs }] = await Promise.all([
    mevsimselAnaliz(proje.id),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "keyword")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const buAy = new Date().getMonth() + 1;

  const baslik = (
    <SayfaBasligi
      baslik="Mevsimsellik"
      aciklama="Hangi kelimede ne zaman çalışmaya başlamalısınız? SEO'nun sonuç vermesi haftalar alır; talep zirvesinde başlamak o sezonu kaybetmektir."
      aksiyon={
        <ModulAnaliziButonu
          projeId={proje.id}
          tur="keyword"
          etiket="Verileri Yenile"
          gorunum="ikincil"
          calisanIsId={calisanIs?.id ?? null}
        />
      }
    />
  );

  if (ozet.mevsimselKelime === 0) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/mevsimsellik" className="mb-6" />
        <BosDurum
          ikon={CalendarClock}
          baslik="Henüz mevsimsel kelime bulunamadı."
          aciklama={
            ozet.incelenenKelime === 0
              ? "Mevsimsellik, kelimelerin son 12 aylık arama hacminden hesaplanır. Önce anahtar kelime analizini çalıştırın."
              : `${sayi(ozet.incelenenKelime)} kelime incelendi ancak belirgin mevsimsel dalgalanma görülmedi. Kelimeleriniz yıl boyunca dengeli arama alıyor.`
          }
          aksiyon={
            ozet.incelenenKelime === 0 ? (
              <ModulAnaliziButonu
                projeId={proje.id}
                tur="keyword"
                etiket="Anahtar Kelime Analizini Çalıştır"
                calisanIsId={calisanIs?.id ?? null}
              />
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      {baslik}
      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/mevsimsellik" className="mb-6" />

      <div className="space-y-9">
        {/* --- Şimdi başla uyarısı --- */}
        {ozet.yaklasanlar.length ? (
          <Uyari ton="uyari" baslik={`${sayi(ozet.yaklasanlar.length)} kelimede şimdi başlamalısınız`}>
            Bu kelimelerin talep zirvesi 12 haftadan yakın. SEO çalışmasının sonuç vermesi
            tipik olarak 8 hafta sürdüğü için, şimdi başlamazsanız bu sezonu kaçırırsınız.
            Toplam zirve hacmi: <strong>{kisaSayi(ozet.yaklasanHacim)}</strong> aylık arama.
          </Uyari>
        ) : null}

        {/* --- Özet --- */}
        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="İncelenen kelime" deger={sayi(ozet.incelenenKelime)} />
          <OzetDegeri
            etiket="Mevsimsel kelime"
            deger={sayi(ozet.mevsimselKelime)}
            ipucu="Zirve hacmi yıllık ortalamanın en az 1,4 katı olan kelimeler."
          />
          <OzetDegeri etiket="Şimdi başlanmalı" deger={sayi(ozet.yaklasanlar.length)} />
          <OzetDegeri
            etiket="Sıradaki dönem"
            deger={ozet.siradakiDonem ? `${ozet.siradakiDonem.hafta} hafta` : "—"}
            ipucu={ozet.siradakiDonem?.ad}
          />
        </section>

        {/* --- Ticaret takvimi --- */}
        <section>
          <BolumBasligi
            baslik="Türkiye e-ticaret takvimi"
            aciklama="Yılın yoğun dönemleri. Hazırlığa zirveden en az 8 hafta önce başlayın."
          />
          <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {TICARET_TAKVIMI.map((t) => {
              const gecti = t.ay < buAy;
              const suAnda = t.ay === buAy;
              return (
                <li
                  key={t.ad}
                  className={
                    suAnda
                      ? "rounded-[12px] border border-ink-900 bg-ink-900 p-3.5 text-white"
                      : gecti
                        ? "rounded-[12px] border border-line bg-surface-muted/50 p-3.5 opacity-60"
                        : "rounded-[12px] border border-line bg-white p-3.5"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={suAnda ? "text-[13.5px] font-semibold" : "text-[13.5px] font-medium text-ink-900"}>
                      {t.ad}
                    </span>
                    <span className={suAnda ? "text-[11.5px] text-white/60" : "text-[11.5px] text-ink-400"}>
                      {AY_KISA[t.ay - 1]}
                    </span>
                  </div>
                  <p className={suAnda ? "mt-1 text-[12px] text-white/70" : "mt-1 text-[12px] text-ink-400"}>
                    {t.not}
                  </p>
                </li>
              );
            })}
          </ol>
        </section>

        {/* --- Kelimeler --- */}
        <section>
          <BolumBasligi
            baslik="Zirvesi yaklaşan kelimeler"
            aciklama="Hacim zirvesine göre sıralı. Yeşil olanlar için çalışmaya başlama zamanı geldi."
          />

          <div className="table-scroll mt-4 rounded-[14px] border border-line bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                    Anahtar kelime
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                    Zirve
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Zirve hacmi
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Dalgalanma
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Kalan süre
                  </th>
                </tr>
              </thead>
              <tbody>
                {ozet.yaklasanlar.map((k) => (
                  <tr key={k.keywordId} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-900">{k.keyword}</span>
                      {k.donem ? (
                        <span className="ml-2 text-[11.5px] text-ink-400">{k.donem}</span>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-ink-700">{k.zirveAdi}</td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-700">
                      {kisaSayi(k.zirveHacim)}
                      <span className="ml-1 text-[11.5px] text-ink-300">
                        (dip {kisaSayi(k.dipHacim)})
                      </span>
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right">
                      <span className="font-medium text-ink-900">{k.mevsimsellik}×</span>
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Rozet ton={k.zirveyeHafta <= 8 ? "kritik" : k.zirveyeHafta <= 12 ? "uyari" : "notr"}>
                        {k.zirveyeHafta} hafta
                      </Rozet>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
