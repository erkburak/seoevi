import { Split } from "lucide-react";
import type { Metadata } from "next";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { BosDurum, Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { Ipucu } from "@/components/ui/tooltip";
import { KELIME_SEKMELERI } from "@/config/navigation";
import { yamyamlikAnalizi } from "@/lib/analiz/yamyamlik";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi, urlYolu } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Sayfa Çakışması",
  robots: { index: false, follow: false },
};

export default async function YamyamlikSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [ozet, { data: calisanIs }] = await Promise.all([
    yamyamlikAnalizi(proje.id, proje.domain),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const baslik = (
    <SayfaBasligi
      baslik="Sayfa Çakışması"
      aciklama="Aynı kelimede sitenizin birden fazla sayfası yarışıyorsa Google hangisini öne çıkaracağını bilemez; sinyaller bölünür ve ikisi de aşağıda kalır."
      aksiyon={
        <ModulAnaliziButonu
          projeId={proje.id}
          tur="serp"
          etiket="SERP Verisini Yenile"
          gorunum="ikincil"
          calisanIsId={calisanIs?.id ?? null}
        />
      }
    />
  );

  if (!ozet.satirlar.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/yamyamlik" className="mb-6" />
        <BosDurum
          ikon={Split}
          baslik={
            ozet.incelenenKelime === 0
              ? "Henüz SERP verisi yok."
              : "Sayfa çakışması bulunamadı."
          }
          aciklama={
            ozet.incelenenKelime === 0
              ? "Çakışma tespiti arama sonuçlarındaki kendi sayfalarınızdan hesaplanır. Önce SERP analizini çalıştırın."
              : `${sayi(ozet.incelenenKelime)} kelime incelendi; hiçbirinde birden fazla sayfanız yarışmıyor. Bu iyi bir işaret.`
          }
        />
      </>
    );
  }

  return (
    <>
      {baslik}
      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/yamyamlik" className="mb-6" />

      <div className="space-y-9">
        <Uyari ton="uyari" baslik={`${sayi(ozet.cakisanKelime)} kelimede sayfalarınız birbiriyle yarışıyor`}>
          Toplam {sayi(ozet.etkilenenSayfa)} sayfa etkileniyor ve bu kelimelerin aylık arama
          hacmi {kisaSayi(ozet.toplamHacim)}. Her kelime için tek bir sayfa belirleyip diğerini
          ona yönlendirmek ya da farklı bir kelimeye odaklamak gerekiyor.
        </Uyari>

        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="İncelenen kelime" deger={sayi(ozet.incelenenKelime)} />
          <OzetDegeri etiket="Çakışan kelime" deger={sayi(ozet.cakisanKelime)} />
          <OzetDegeri etiket="Etkilenen sayfa" deger={sayi(ozet.etkilenenSayfa)} />
          <OzetDegeri etiket="Aylık arama" deger={kisaSayi(ozet.toplamHacim)} />
        </section>

        <section>
          <BolumBasligi
            baslik="Çakışan kelimeler"
            aciklama="Önem sırasına göre: yüksek hacimli ve ilk sayfaya yakın çakışmalar önce düzeltilmeli."
            sag={<Ipucu metin="Önem; arama hacmi, en iyi sıranız ve çakışan sayfa sayısından hesaplanır." />}
          />

          <ul className="mt-4 space-y-2">
            {ozet.satirlar.map((s) => (
              <li key={s.keyword} className="rounded-[14px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-ink-900">{s.keyword}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-400">
                      {s.aramaHacmi ? `${kisaSayi(s.aramaHacmi)} aylık arama · ` : ""}
                      {sayi(s.cakismaSayisi)} sayfa yarışıyor · en iyi sıra {s.enIyiPozisyon}
                    </p>
                  </div>
                  <span className="tabular shrink-0 rounded-[7px] bg-caution-soft px-2 py-0.5 text-[13px] font-semibold text-caution">
                    {s.onem}
                  </span>
                </div>

                <ol className="mt-3 space-y-1.5 border-t border-line pt-3">
                  {s.sayfalar.map((p, i) => (
                    <li key={p.url} className="flex items-center gap-3">
                      <span className="tabular inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-ink-50 text-[11.5px] font-semibold text-ink-600">
                        {p.pozisyon}
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 flex-1 truncate text-[13px] text-ink-600 transition-colors hover:text-ink-900"
                      >
                        {urlYolu(p.url)}
                      </a>
                      {i === 0 ? (
                        <span className="shrink-0 rounded-full bg-positive-soft px-2 py-0.5 text-[11px] text-positive">
                          asıl sayfa adayı
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">Çakışma nasıl çözülür?</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
            <li>
              <strong className="font-medium text-ink-900">Tek sayfa belirleyin.</strong> En iyi
              sırada olan genellikle Google&apos;ın tercih ettiğidir; onu asıl sayfa yapın.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Diğerini farklılaştırın.</strong> İkinci
              sayfayı silmek yerine farklı bir kelimeye odaklayın — varyant, alt kategori veya
              daha uzun kuyruk bir ifade.
            </li>
            <li>
              <strong className="font-medium text-ink-900">İç bağlantıyı toplayın.</strong> Site
              içindeki bağlantılar asıl sayfayı işaret etmeli; ikinci sayfadan asıl sayfaya
              bağlantı verin.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Gerçekten yinelenmişse yönlendirin.</strong>{" "}
              İki sayfa aynı içeriği anlatıyorsa 301 yönlendirmesi sinyalleri birleştirir.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
