import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RakipEklemeFormu, RakipSilDugmesi, RakipYenileDugmesi } from "@/components/app/rakip-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi, tarih } from "@/lib/utils";
import type { Rakip } from "@/types/database";

export const metadata: Metadata = {
  title: "Rakipler",
  robots: { index: false, follow: false },
};

type RakipMetrikleri = {
  organik_kelime?: number;
  tahmini_trafik?: number;
  ilk_uc?: number;
  ilk_on?: number;
  ortak_kelime?: number;
  acik_firsat?: number;
  kirilim?: { dusuk_rekabet?: number; ticari?: number; bilgi?: number; sadece_rakipte?: number };
};

export default async function RakiplerSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("competitors")
    .select("*")
    .eq("project_id", proje.id)
    .order("created_at", { ascending: true });

  const rakipler = (data ?? []) as Rakip[];
  const bizimKelime = proje.stats?.siralanan_kelime ?? 0;
  const bizimTrafik = proje.stats?.tahmini_trafik ?? 0;

  const toplamFirsat = rakipler.reduce(
    (t, r) => t + ((r.metrics as RakipMetrikleri).acik_firsat ?? 0),
    0,
  );

  return (
    <>
      <SayfaBasligi
        baslik="Rakipler"
        aciklama="Rakiplerinizle görünürlük karşılaştırması ve sizin önünüzde oldukları alanlar."
        aksiyon={rakipler.length ? <RakipYenileDugmesi /> : null}
      />

      <div className="mb-8 rounded-[14px] border border-line bg-white p-5">
        <BolumBasligi
          baslik="Rakip ekleyin"
          aciklama="Aynı kelimelerde yarıştığınız mağazaların alan adını girin."
        />
        <div className="mt-4">
          <RakipEklemeFormu />
        </div>
      </div>

      {rakipler.length === 0 ? (
        <BosDurum
          ikon={Users}
          baslik="Henüz rakip eklenmemiş."
          aciklama="İlk rakibinizi ekleyin; hangi kelimelerde sizden önde olduklarını ve kaçırdığınız fırsatları çıkaralım."
        />
      ) : (
        <>
          <div className="mb-7 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <OzetDegeri etiket="Takip edilen rakip" deger={sayi(rakipler.length)} />
            <OzetDegeri etiket="Sizin kelimeniz" deger={sayi(bizimKelime)} />
            <OzetDegeri etiket="Sizin trafiğiniz" deger={kisaSayi(bizimTrafik)} />
            <OzetDegeri
              etiket="Toplam fırsat"
              deger={sayi(toplamFirsat)}
              ipucu="Rakiplerinizin sizden önde olduğu kelime sayısı."
            />
          </div>

          <div className="space-y-3">
            {rakipler.map((r) => {
              const m = r.metrics as RakipMetrikleri;
              const kelimeFarki = (m.organik_kelime ?? 0) - bizimKelime;
              const trafikFarki = (m.tahmini_trafik ?? 0) - bizimTrafik;

              return (
                <article key={r.id} className="rounded-[14px] border border-line bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[16px] font-semibold text-ink-900">{r.domain}</h2>
                        {r.source === "otomatik" ? <Rozet>Otomatik bulundu</Rozet> : null}
                      </div>
                      <p className="mt-1 text-[12.5px] text-ink-400">
                        {r.last_synced_at
                          ? `Son güncelleme ${tarih(r.last_synced_at)}`
                          : "Analiz bekleniyor"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Buton asChild gorunum="ikincil" boyut="sm">
                        <Link href={`/rakip-analizi/${r.id}`}>Rakibi İncele</Link>
                      </Buton>
                      <RakipSilDugmesi rakipId={r.id} domain={r.domain} />
                    </div>
                  </div>

                  {m.organik_kelime !== undefined ? (
                    <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-4 lg:grid-cols-5">
                      <OzetDegeri etiket="Organik kelime" deger={sayi(m.organik_kelime)} />
                      <OzetDegeri etiket="Tahmini trafik" deger={kisaSayi(m.tahmini_trafik ?? 0)} />
                      <OzetDegeri etiket="İlk 3'te" deger={sayi(m.ilk_uc ?? 0)} />
                      <OzetDegeri etiket="Ortak kelime" deger={sayi(m.ortak_kelime ?? 0)} />
                      <div>
                        <p className="text-[12px] text-ink-400">Sizden farkı</p>
                        <p className="tabular mt-1 text-[15px] font-semibold">
                          <span className={kelimeFarki > 0 ? "text-critical" : "text-positive"}>
                            {kelimeFarki > 0 ? "+" : ""}
                            {sayi(kelimeFarki)} kelime
                          </span>
                        </p>
                        <p className={`tabular text-[12px] ${trafikFarki > 0 ? "text-critical" : "text-positive"}`}>
                          {trafikFarki > 0 ? "+" : ""}
                          {kisaSayi(trafikFarki)} trafik
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-400">
                      Bu rakip için veriler henüz toplanmadı. Analiz tamamlandığında karşılaştırma burada
                      görünecek.
                    </p>
                  )}

                  {m.acik_firsat ? (
                    <div className="mt-4 rounded-[12px] bg-surface-muted p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13.5px] font-medium text-ink-900">
                          Rakibin Açığı: {sayi(m.acik_firsat)} fırsat bulundu
                        </p>
                        <Buton asChild gorunum="sessiz" boyut="sm">
                          <Link href={`/rakip-analizi/${r.id}`}>Fırsatı İncele</Link>
                        </Buton>
                      </div>
                      {m.kirilim ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {m.kirilim.dusuk_rekabet ? (
                            <Rozet ton="olumlu">{sayi(m.kirilim.dusuk_rekabet)} düşük rekabetli kelime</Rozet>
                          ) : null}
                          {m.kirilim.ticari ? (
                            <Rozet ton="uyari">{sayi(m.kirilim.ticari)} ticari kelime</Rozet>
                          ) : null}
                          {m.kirilim.bilgi ? (
                            <Rozet>{sayi(m.kirilim.bilgi)} içerik fırsatı</Rozet>
                          ) : null}
                          {m.kirilim.sadece_rakipte ? (
                            <Rozet ton="kritik">
                              {sayi(m.kirilim.sadece_rakipte)} kelimede hiç sıralanmıyorsunuz
                            </Rozet>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
