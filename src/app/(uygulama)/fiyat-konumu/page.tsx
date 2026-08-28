import { Tag } from "lucide-react";
import type { Metadata } from "next";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BosDurum, Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { Ipucu } from "@/components/ui/tooltip";
import { ETICARET_SEKMELERI } from "@/config/navigation";
import { DURUM_ADI, fiyatKonumlari, type FiyatKonumu } from "@/lib/analiz/fiyat";
import { projeBaglami } from "@/lib/projects";
import { ozellikVarMi } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, para, sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fiyat Konumu",
  robots: { index: false, follow: false },
};

const DURUM_TONU: Record<FiyatKonumu["durum"], "olumlu" | "bilgi" | "uyari" | "kritik" | "notr"> = {
  en_ucuz: "olumlu",
  rekabetci: "bilgi",
  pahali: "uyari",
  cok_pahali: "kritik",
  bilinmiyor: "notr",
};

export default async function FiyatKonumuSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const izinli = await ozellikVarMi(kullanici.id, "merchant");
  const supabase = await sunucuIstemcisi();

  const baslik = (
    <SayfaBasligi
      baslik="Fiyat Konumu"
      aciklama="Google Alışveriş'te ilk sırada olsanız bile en pahalı satıcıysanız tıklama başkasına gider. Aynı ürünü satanlar arasında neredesiniz?"
      aksiyon={
        izinli ? (
          <ModulAnaliziButonu projeId={proje.id} tur="merchant" etiket="Merchant Analizini Çalıştır" gorunum="ikincil" />
        ) : null
      }
    />
  );

  if (!izinli) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/fiyat-konumu" className="mb-6" />
        <PaketUyarisi
          ozellik="Fiyat konumu"
          aciklama="Aynı ürünü satan diğer mağazalarla fiyat karşılaştırması Profesyonel paketten itibaren kullanılabilir."
        />
      </>
    );
  }

  const [ozet, { data: calisanIs }] = await Promise.all([
    fiyatKonumlari(proje.id, 80, proje.domain),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "merchant")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  if (!ozet.satirlar.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/fiyat-konumu" className="mb-6" />
        <BosDurum
          ikon={Tag}
          baslik="Henüz fiyat karşılaştırması yok."
          aciklama="Fiyat konumu, Merchant analizinde toplanan satıcı ve fiyat verisinden hesaplanır. Analizi çalıştırdığınızda burada görünecek."
          aksiyon={
            <ModulAnaliziButonu
              projeId={proje.id}
              tur="merchant"
              etiket="Merchant Analizini Çalıştır"
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
      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/fiyat-konumu" className="mb-6" />

      <div className="space-y-9">
        {ozet.pahaliUrun > 0 ? (
          <Uyari ton="uyari" baslik={`${sayi(ozet.pahaliUrun)} üründe fiyatınız rekabetin gerisinde`}>
            Bu ürünlerde SEO çalışması yapsanız da tıklama daha ucuz satıcıya gidecektir.
            {ozet.ortalamaFarkYuzde !== null ? (
              <> En ucuz satıcıya göre ortalama farkınız <strong>%{ozet.ortalamaFarkYuzde}</strong>.</>
            ) : null}
          </Uyari>
        ) : null}

        {ozet.fiyatiBilinmeyen > 0 ? (
          <Uyari
            ton="uyari"
            baslik={`${sayi(ozet.fiyatiBilinmeyen)} üründe kendi fiyatınız okunamadı`}
          >
            Fiyat karşılaştırması ancak sizin fiyatınız bilinirse yapılabilir. Ürün sayfalarınızda
            yapısal veri (schema.org <code>Product</code> / <code>Offer</code>) bulunmuyor ve bu
            ürünlerde Google Alışveriş sonuçlarında da görünmüyorsunuz. Bu ürünler için aşağıda
            yalnızca rakip fiyat aralığı gösterilir — pahalı ya da ucuz olduğunuz iddia edilmez.
            Ürün sayfalarınıza yapısal veri eklemek hem bu karşılaştırmayı hem de Google&apos;daki
            zengin sonuç görünümünüzü açar.
          </Uyari>
        ) : null}

        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="Karşılaştırılan ürün" deger={sayi(ozet.incelenenUrun)} />
          <OzetDegeri etiket="En ucuz olduğunuz" deger={sayi(ozet.enUcuzUrun)} />
          <OzetDegeri etiket="Pahalı kaldığınız" deger={sayi(ozet.pahaliUrun)} />
          <OzetDegeri
            etiket="Ortalama fark"
            deger={ozet.ortalamaFarkYuzde !== null ? `%${ozet.ortalamaFarkYuzde}` : "—"}
            ipucu="En ucuz satıcıya göre ortalama fiyat farkınız."
          />
        </section>

        <section>
          <BolumBasligi
            baslik="Ürün bazında fiyat konumu"
            aciklama={
              ozet.fiyatiBilinmeyen === ozet.incelenenUrun
                ? "Kendi fiyatınız okunamadığı için sıralama rakip satıcı sayısına göre yapılır; en çok satıcının yarıştığı ürünler önce gelir."
                : "Fiyatı bilinen ürünlerde en pahalı kaldıklarınız önce gelir; en çok satış kaybettirenler bunlar. Fiyatı okunamayanlar sona alınır."
            }
            sag={<Ipucu metin="Fiyatlar Google Alışveriş sonuçlarındaki satıcı verisinden alınır ve analiz anındaki değerleri yansıtır." />}
          />

          <div className="table-scroll mt-4 rounded-[14px] border border-line bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="border-b border-line px-4 py-3 text-left text-[12px] font-medium text-ink-500">
                    Ürün
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Sizin fiyatınız
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    En ucuz
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Fark
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Sıra
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-3 text-right text-[12px] font-medium text-ink-500">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {ozet.satirlar.map((s, i) => (
                  <tr key={s.urunId ?? i} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-medium text-ink-900">
                        {kirp(s.urunAdi ?? "Adsız ürün", 52)}
                      </span>
                      {!s.gorunur ? (
                        <span className="ml-2 text-[11.5px] text-ink-400">
                          alışverişte görünmüyor
                        </span>
                      ) : null}
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-900">
                      {para(s.bizimFiyat)}
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-600">
                      {para(s.enUcuz)}
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right">
                      {s.farkYuzde === null ? (
                        <span className="text-ink-300">—</span>
                      ) : s.farkYuzde <= 0 ? (
                        <span className="font-medium text-positive">en ucuz</span>
                      ) : (
                        <span className="font-medium text-critical">
                          +%{s.farkYuzde}
                          <span className="ml-1 text-[11.5px] font-normal text-ink-400">
                            ({para(s.fark)})
                          </span>
                        </span>
                      )}
                    </td>

                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-600">
                      {s.sira ? `${s.sira} / ${s.saticiSayisi}` : `— / ${s.saticiSayisi}`}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Rozet ton={DURUM_TONU[s.durum]}>{DURUM_ADI[s.durum]}</Rozet>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">Fiyatı düşüremiyorsanız</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
            <li>
              <strong className="font-medium text-ink-900">Kargoyu öne çıkarın.</strong> Ücretsiz
              veya hızlı kargo, birkaç liralık farkı kapatır ve yapısal veride belirtilebilir.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Garanti ve iade koşulu ekleyin.</strong>{" "}
              Uzun garanti süresi fiyat farkını haklı çıkarır; ürün sayfasında net yazın.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Yorum toplayın.</strong> Yüksek puanlı
              ürünler daha pahalı olsa da tıklama alır; puan alışveriş sonuçlarında görünür.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Set ve paket kurgulayın.</strong> Birebir
              fiyat karşılaştırmasından çıkmanın en temiz yolu, aynı ürünü tek başına değil paket
              olarak sunmaktır.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
