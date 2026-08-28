import { Store } from "lucide-react";
import type { Metadata } from "next";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { Ipucu } from "@/components/ui/tooltip";
import { ETICARET_SEKMELERI } from "@/config/navigation";
import { TUR_ADI } from "@/config/pazaryerleri";
import { radarOzeti, radarSatirlari } from "@/lib/analiz/pazaryeri";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pazaryeri Radarı",
  robots: { index: false, follow: false },
};

const TUR_TONU = {
  pazaryeri: "kritik",
  fiyat_karsilastirma: "uyari",
  perakende: "bilgi",
  icerik: "notr",
} as const;

export default async function PazaryeriRadariSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [ozet, satirlar, { data: calisanIs }] = await Promise.all([
    radarOzeti(proje.id),
    radarSatirlari(proje.id, 60),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "keyword")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const baslik = (
    <SayfaBasligi
      baslik="Pazaryeri Radarı"
      aciklama="Kendi ürünlerinizde Trendyol, Hepsiburada ve fiyat karşılaştırma siteleri sizi nerede geçiyor? Satış oluyor ama komisyonlu kanaldan."
      aksiyon={
        <ModulAnaliziButonu
          projeId={proje.id}
          tur="keyword"
          etiket="Radarı Yenile"
          gorunum="ikincil"
          calisanIsId={calisanIs?.id ?? null}
        />
      }
    />
  );

  if (!satirlar.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/pazaryeri-radari" className="mb-6" />
        <BosDurum
          ikon={Store}
          baslik="Radar henüz veri toplamadı."
          aciklama="Pazaryeri baskısı, takip ettiğiniz kelimelerin arama sonuçlarından hesaplanır. Önce anahtar kelime ve SERP analizini çalıştırın; radar ek maliyet olmadan bu veriden üretilir."
          aksiyon={
            <ModulAnaliziButonu
              projeId={proje.id}
              tur="keyword"
              etiket="Anahtar Kelime Analizini Çalıştır"
              calisanIsId={calisanIs?.id ?? null}
            />
          }
        />
      </>
    );
  }

  return (
    <>
      {baslik}
      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/pazaryeri-radari" className="mb-6" />

      <div className="space-y-9">
        {/* --- Özet --- */}
        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="İncelenen kelime" deger={sayi(ozet.incelenenKelime)} />
          <OzetDegeri
            etiket="Baskı altındaki kelime"
            deger={sayi(ozet.baskiAltindaKelime)}
            ipucu="En az bir pazaryeri, fiyat karşılaştırma sitesi veya büyük perakendecinin sizden üstte olduğu kelimeler."
          />
          <OzetDegeri
            etiket="Aylık kayıp ziyaret"
            deger={kisaSayi(ozet.toplamKayip)}
            ipucu="Üstünüzdeki oyuncular olmasaydı bulunacağınız tahmini konuma göre hesaplanır."
          />
          <OzetDegeri etiket="Rakip oyuncu" deger={sayi(ozet.oyuncuOzeti.length)} />
        </section>

        {/* --- Oyuncular --- */}
        {ozet.oyuncuOzeti.length ? (
          <section>
            <BolumBasligi
              baslik="Sizi en çok geçen oyuncular"
              aciklama="Kaç kelimede üstünüzdeler ve bu size ayda kaç ziyarete mal oluyor."
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {ozet.oyuncuOzeti.slice(0, 12).map((o) => (
                <li key={o.alan_adi} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[14px] font-medium text-ink-900">{o.ad}</span>
                      <Rozet ton={TUR_TONU[o.tur]}>{TUR_ADI[o.tur]}</Rozet>
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-400">{o.alan_adi}</p>
                  </div>

                  <div className="text-right">
                    <p className="tabular text-[14px] font-semibold text-ink-900">
                      {sayi(o.ustteKelime)}
                    </p>
                    <p className="text-[11.5px] text-ink-400">kelimede üstünüzde</p>
                  </div>

                  <div className="w-28 text-right">
                    <p className="tabular text-[14px] font-semibold text-critical">
                      −{kisaSayi(o.kayip)}
                    </p>
                    <p className="text-[11.5px] text-ink-400">aylık ziyaret</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* --- Kelime bazında --- */}
        <section>
          <BolumBasligi
            baslik="Kelime bazında baskı"
            aciklama="En çok kayıp yaşadığınız kelimeler önce gelir."
            sag={
              <Ipucu metin="Baskı skoru; üstünüzdeki oyuncuların türü ve sayısı, ilk 10'daki yoğunlukları ve sizin konumunuzdan hesaplanır." />
            }
          />

          <div className="table-scroll mt-4 rounded-[14px] border border-line bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                    Anahtar kelime
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Hacim
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Sizin sıranız
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                    Üstünüzdekiler
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Baskı
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Kayıp
                  </th>
                </tr>
              </thead>
              <tbody>
                {satirlar.map((r) => (
                  <tr key={r.keyword} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{r.keyword}</td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-600">
                      {kisaSayi(r.aramaHacmi)}
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right">
                      {r.bizimPozisyon === null ? (
                        <span className="text-ink-300">ilk 100&apos;de yok</span>
                      ) : (
                        <span className="font-medium text-ink-900">{r.bizimPozisyon}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.oyuncular
                          .filter((o) => o.ustumuzde)
                          .slice(0, 4)
                          .map((o) => (
                            <span
                              key={o.alan_adi}
                              className="tabular inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[11.5px] text-ink-600"
                            >
                              {o.ad}
                              <span className="text-ink-300">{o.pozisyon}.</span>
                            </span>
                          ))}
                        {r.oyuncular.filter((o) => o.ustumuzde).length > 4 ? (
                          <span className="text-[11.5px] text-ink-400">
                            +{r.oyuncular.filter((o) => o.ustumuzde).length - 4}
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          r.baskiSkoru >= 70
                            ? "tabular inline-flex min-w-9 justify-center rounded-[7px] bg-critical-soft px-1.5 py-0.5 font-semibold text-critical"
                            : r.baskiSkoru >= 40
                              ? "tabular inline-flex min-w-9 justify-center rounded-[7px] bg-caution-soft px-1.5 py-0.5 font-semibold text-caution"
                              : "tabular inline-flex min-w-9 justify-center rounded-[7px] bg-ink-50 px-1.5 py-0.5 font-semibold text-ink-500"
                        }
                      >
                        {r.baskiSkoru}
                      </span>
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-700">
                      {r.kayipTahmini > 0 ? `−${kisaSayi(r.kayipTahmini)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* --- Ne yapmalı --- */}
        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">
            Pazaryerini geçmek için ne yapılır?
          </h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
            <li>
              <strong className="font-medium text-ink-900">Derinlik:</strong> Pazaryeri ürün
              sayfaları şablondur. Sizin sayfanızda gerçek teknik özellik tablosu, kullanım
              rehberi ve karşılaştırma bulunması fark yaratır.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Yorum:</strong> Gerçek kullanıcı
              yorumu ve puan, hem yapısal veride hem tıklama oranında avantaj sağlar.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Marka + model aramaları:</strong> Bu
              aramalarda üretici veya satıcı olarak sizin öne çıkmanız beklenir. Yapısal veriniz
              eksiksizse pazaryerinden öne geçme şansınız en yüksek burasıdır.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Fiyat karşılaştırma siteleri:</strong>{" "}
              Cimri ve Akakçe tıklamayı toplayıp size ücretli yönlendirir. Bu kelimelerde kendi
              sayfanızın üstte olması doğrudan maliyet tasarrufudur.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
