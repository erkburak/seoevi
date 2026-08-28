import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RaporYazdirDugmesi } from "@/components/app/rapor-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { ETKI_ETIKET, OncelikRozeti, Rozet } from "@/components/ui/badge";
import { OzetDegeri } from "@/components/ui/metric";
import { PozisyonDegisimi, SkorCubugu, SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import type { RaporAnlikGorunumu } from "@/lib/analiz/rapor";
import { BOLUM_ADI, type RaporBolumu } from "@/lib/analiz/rapor-bolumleri";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, tarih, tarihSaat } from "@/lib/utils";
import type { Etki, Oncelik, Rapor } from "@/types/database";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase.from("reports").select("title").eq("id", id).maybeSingle();

  return {
    title: data?.title ?? "Rapor",
    robots: { index: false, follow: false },
  };
}

const SKOR_ADI: Record<string, string> = {
  seo: "Genel SEO",
  teknik: "Teknik SEO",
  icerik: "İçerik",
  keyword: "Anahtar kelime",
  otorite: "Otorite",
  eticaret: "E-ticaret",
  merchant: "Merchant",
  ai: "AI görünürlüğü",
};

export default async function RaporDetayi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();

  const rapor = data as Rapor;
  const g = rapor.snapshot as unknown as RaporAnlikGorunumu;
  const bolumler = (rapor.sections ?? []) as RaporBolumu[];

  return (
    <>
      <div className="mb-4 print:hidden">
        <Link
          href="/raporlar"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Raporlara dön
        </Link>
      </div>

      <SayfaBasligi
        baslik={rapor.title}
        aciklama={`${g.proje?.alan_adi ?? proje.domain} · ${tarihSaat(rapor.created_at)} tarihinde oluşturuldu${
          rapor.period_start ? ` · Dönem: ${tarih(rapor.period_start)} – ${tarih(rapor.period_end)}` : ""
        }`}
        aksiyon={<RaporYazdirDugmesi />}
      />

      <div className="space-y-11">
        {/* --- Genel --- */}
        {bolumler.includes("genel") && g.genel ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.genel} />
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="flex items-center justify-center rounded-[14px] border border-line bg-white p-5">
                <SkorHalkasi skor={g.genel.skorlar.seo ?? null} boyut={116} etiket="SEO skoru" />
              </div>
              <div className="rounded-[14px] border border-line bg-white p-5">
                <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {Object.entries(g.genel.skorlar)
                    .filter(([k]) => k !== "seo")
                    .map(([k, v]) => (
                      <SkorCubugu key={k} etiket={SKOR_ADI[k] ?? k} skor={v ?? null} />
                    ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
              <OzetDegeri
                etiket="Sıralanan kelime"
                deger={sayi(g.genel.istatistikler.siralanan_kelime ?? 0)}
              />
              <OzetDegeri
                etiket="Tahmini trafik"
                deger={sayi(g.genel.istatistikler.tahmini_trafik ?? 0)}
              />
              <OzetDegeri
                etiket="Taranan sayfa"
                deger={sayi(g.genel.istatistikler.taranan_sayfa ?? 0)}
              />
              <OzetDegeri
                etiket="Kritik sorun"
                deger={sayi(g.genel.istatistikler.kritik_sorun ?? 0)}
              />
            </div>
          </section>
        ) : null}

        {/* --- Teknik SEO --- */}
        {bolumler.includes("teknik") && g.teknik ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.teknik} />
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
              <OzetDegeri etiket="Teknik skor" deger={g.teknik.skor ?? "—"} />
              <OzetDegeri etiket="Taranan sayfa" deger={sayi(g.teknik.taranan_sayfa)} />
              <OzetDegeri etiket="Açık sorun" deger={sayi(g.teknik.acik_sorun)} />
              <OzetDegeri etiket="Kritik sorun" deger={sayi(g.teknik.kritik_sorun)} />
            </div>

            {g.teknik.sorunlar.length ? (
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {g.teknik.sorunlar.map((s) => (
                  <li key={`${s.onem}-${s.baslik}`} className="flex items-center gap-3 px-4 py-3">
                    <Rozet ton={s.onem === "kritik" ? "kritik" : s.onem === "uyari" ? "uyari" : "bilgi"} nokta>
                      {s.onem === "kritik" ? "Kritik" : s.onem === "uyari" ? "Uyarı" : "Bilgi"}
                    </Rozet>
                    <span className="min-w-0 flex-1 text-[13.5px] text-ink-700">{s.baslik}</span>
                    <span className="tabular shrink-0 text-[13px] font-medium text-ink-900">
                      {sayi(s.adet)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* --- Anahtar kelimeler --- */}
        {bolumler.includes("kelime") && g.kelime ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.kelime} />
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-6">
              <OzetDegeri etiket="Sıralanan" deger={sayi(g.kelime.toplam)} />
              <OzetDegeri etiket="İlk 3" deger={sayi(g.kelime.ilk_uc)} />
              <OzetDegeri etiket="İlk 10" deger={sayi(g.kelime.ilk_on)} />
              <OzetDegeri etiket="Yükselen" deger={sayi(g.kelime.yukselen)} />
              <OzetDegeri etiket="Düşen" deger={sayi(g.kelime.dusen)} />
              <OzetDegeri etiket="Tahmini trafik" deger={sayi(g.kelime.tahmini_trafik)} />
            </div>

            {g.kelime.en_iyi.length ? (
              <div className="table-scroll mt-4 rounded-[14px] border border-line bg-white">
                <table className="w-full border-collapse text-[13px]">
                  <thead className="bg-surface-muted">
                    <tr>
                      <th scope="col" className="border-b border-line px-3.5 py-2.5 text-left text-[12px] font-medium text-ink-500">
                        Anahtar kelime
                      </th>
                      <th scope="col" className="border-b border-line px-3.5 py-2.5 text-right text-[12px] font-medium text-ink-500">
                        Hacim
                      </th>
                      <th scope="col" className="border-b border-line px-3.5 py-2.5 text-right text-[12px] font-medium text-ink-500">
                        Pozisyon
                      </th>
                      <th scope="col" className="border-b border-line px-3.5 py-2.5 text-right text-[12px] font-medium text-ink-500">
                        Değişim
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.kelime.en_iyi.map((k) => (
                      <tr key={k.keyword} className="border-b border-line last:border-0">
                        <td className="px-3.5 py-2.5 text-ink-800">{k.keyword}</td>
                        <td className="tabular px-3.5 py-2.5 text-right text-ink-600">{sayi(k.hacim)}</td>
                        <td className="tabular px-3.5 py-2.5 text-right font-medium text-ink-900">
                          {k.pozisyon ?? "—"}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <PozisyonDegisimi
                            simdiki={k.pozisyon}
                            onceki={
                              k.pozisyon !== null && k.degisim !== null ? k.pozisyon + k.degisim : null
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* --- Rakipler --- */}
        {bolumler.includes("rakip") && g.rakip ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.rakip} aciklama={`${sayi(g.rakip.adet)} rakip takip ediliyor.`} />
            {g.rakip.liste.length ? (
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {g.rakip.liste.map((r) => (
                  <li key={r.alan_adi} className="flex items-center gap-4 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-900">
                      {r.alan_adi}
                    </span>
                    <span className="tabular shrink-0 text-[12.5px] text-ink-500">
                      {sayi(r.organik_kelime)} kelime
                    </span>
                    <span className="tabular shrink-0 text-[12.5px] text-ink-500">
                      {sayi(r.ortak_kelime)} ortak
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-ink-400">Rapor döneminde takip edilen rakip yok.</p>
            )}
          </section>
        ) : null}

        {/* --- E-ticaret --- */}
        {bolumler.includes("eticaret") && g.eticaret ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.eticaret} />
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-5">
              <OzetDegeri etiket="Ürün" deger={sayi(g.eticaret.urun_sayisi)} />
              <OzetDegeri etiket="Kategori" deger={sayi(g.eticaret.kategori_sayisi)} />
              <OzetDegeri etiket="Ort. ürün skoru" deger={g.eticaret.ortalama_urun_skoru ?? "—"} />
              <OzetDegeri etiket="Ort. kategori skoru" deger={g.eticaret.ortalama_kategori_skoru ?? "—"} />
              <OzetDegeri etiket="Merchant skoru" deger={g.eticaret.merchant_skoru ?? "—"} />
            </div>
          </section>
        ) : null}

        {/* --- Geri bağlantılar --- */}
        {bolumler.includes("backlink") && g.backlink ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.backlink} />
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
              <OzetDegeri etiket="Geri bağlantı" deger={sayi(g.backlink.toplam)} />
              <OzetDegeri etiket="Referans alan adı" deger={sayi(g.backlink.referans_alan_adi)} />
              <OzetDegeri etiket="Yeni" deger={sayi(g.backlink.yeni)} />
              <OzetDegeri etiket="Kaybedilen" deger={sayi(g.backlink.kaybedilen)} />
            </div>
          </section>
        ) : null}

        {/* --- İçerik --- */}
        {bolumler.includes("icerik") && g.icerik ? (
          <section>
            <BolumBasligi
              baslik={BOLUM_ADI.icerik}
              aciklama={`${sayi(g.icerik.analiz_sayisi)} içerik analizi, ${sayi(g.icerik.acik_firsat)} açık fırsat.`}
            />
            {g.icerik.firsatlar.length ? (
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {g.icerik.firsatlar.map((f) => (
                  <li key={f.keyword} className="px-4 py-3">
                    <p className="text-[13.5px] font-medium text-ink-900">{f.keyword}</p>
                    {f.baslik ? <p className="mt-0.5 text-[12.5px] text-ink-500">{f.baslik}</p> : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {/* --- AI görünürlüğü --- */}
        {bolumler.includes("ai") && g.ai ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.ai} />
            <div className="mt-4 grid gap-4 lg:grid-cols-[240px_1fr]">
              <div className="flex items-center justify-center rounded-[14px] border border-line bg-white p-5">
                <SkorHalkasi skor={g.ai.skor} boyut={104} etiket="AI skoru" />
              </div>
              <div className="rounded-[14px] border border-line bg-white p-5">
                <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  <SkorCubugu etiket="Marka görünürlüğü" skor={g.ai.marka_gorunurlugu} />
                  <SkorCubugu etiket="İçerik güvenilirliği" skor={g.ai.icerik_guvenilirligi} />
                  <SkorCubugu etiket="Konu otoritesi" skor={g.ai.konu_otoritesi} />
                  <SkorCubugu etiket="Ürün görünürlüğü" skor={g.ai.urun_gorunurlugu} />
                  <SkorCubugu etiket="Soru kapsama oranı" skor={g.ai.soru_kapsamasi} />
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* --- Aksiyonlar --- */}
        {bolumler.includes("aksiyon") && g.aksiyon ? (
          <section>
            <BolumBasligi baslik={BOLUM_ADI.aksiyon} />
            <div className="mt-4 grid grid-cols-3 gap-6 rounded-[14px] border border-line bg-white p-5">
              <OzetDegeri etiket="Bekliyor" deger={sayi(g.aksiyon.bekleyen)} />
              <OzetDegeri etiket="Devam ediyor" deger={sayi(g.aksiyon.devam_eden)} />
              <OzetDegeri etiket="Tamamlandı" deger={sayi(g.aksiyon.tamamlanan)} />
            </div>

            {g.aksiyon.oncelikli.length ? (
              <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
                {g.aksiyon.oncelikli.map((a) => (
                  <li key={a.baslik} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <OncelikRozeti oncelik={a.oncelik as Oncelik} />
                    <span className="min-w-0 flex-1 text-[13.5px] text-ink-800">{a.baslik}</span>
                    <span className="shrink-0 text-[12px] text-ink-400">
                      Etki: {ETKI_ETIKET[a.etki as Etki] ?? a.etki}
                    </span>
                    <span className="tabular shrink-0 text-[12.5px] font-medium text-ink-900">
                      {sayi(a.etkilenen)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>

      <p className="mt-12 border-t border-line pt-5 text-[12px] text-ink-400">
        Bu rapor {tarihSaat(rapor.created_at)} tarihindeki verilerle oluşturulmuştur. SEO Evi
        tarafından üretilmiştir.
      </p>
    </>
  );
}
