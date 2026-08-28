import { Bot } from "lucide-react";
import type { Metadata } from "next";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { CizgiGrafik } from "@/components/charts";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { SkorCubugu, SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { Ipucu } from "@/components/ui/tooltip";
import { projeBaglami } from "@/lib/projects";
import { ozellikVarMi } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, tarih } from "@/lib/utils";
import type { AiBahsi, AiGorunurlugu } from "@/types/database";

export const metadata: Metadata = {
  title: "AI Görünürlüğü",
  robots: { index: false, follow: false },
};

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const KIRILIM_ACIKLAMASI: Record<string, string> = {
  brand_visibility:
    "Markanızın web genelinde ne sıklıkta ve kaç farklı kaynakta anıldığı. Yapay zekâ cevapları bu kaynaklardan beslenir.",
  content_trust:
    "Yapısal veri kullanımı ve öne çıkan snippet kazanımlarınız. İçeriğinizin makine tarafından güvenle okunabilirliğini gösterir.",
  topic_authority: "Konunuzdaki sıralama gücünüz ve dış bağlantı otoriteniz.",
  product_visibility: "Ürünlerinizin alışveriş sonuçlarında görünme oranı.",
  question_coverage: "Kullanıcıların sorduğu soruların kaçına sizin sayfalarınızın cevap verdiği.",
};

export default async function AiGorunurluguSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const izinli = await ozellikVarMi(kullanici.id, "ai_gorunurlugu");
  const supabase = await sunucuIstemcisi();

  const [{ data: gecmisVerisi }, { data: bahisVerisi }, { data: calisanIs }] = await Promise.all([
    supabase
      .from("ai_visibility")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("ai_mentions")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "ai")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const gecmis = (gecmisVerisi ?? []) as AiGorunurlugu[];
  const bahisler = (bahisVerisi ?? []) as AiBahsi[];
  const guncel = gecmis[0] ?? null;

  const baslik = (
    <SayfaBasligi
      baslik="AI Görünürlüğü"
      aciklama="Markanızın ve ürünlerinizin yapay zekâ destekli arama cevaplarındaki görünürlüğü."
      aksiyon={
        izinli ? (
          <ModulAnaliziButonu
            projeId={proje.id}
            tur="ai"
            etiket="AI Analizini Çalıştır"
            calisanIsId={calisanIs?.id ?? null}
          />
        ) : null
      }
    />
  );

  if (!izinli) {
    return (
      <>
        {baslik}
        <PaketUyarisi
          ozellik="AI görünürlüğü"
          aciklama="Marka bahsedilmeleri, soru kapsaması ve konu otoritesi ölçümü Profesyonel paketten itibaren kullanılabilir."
        />
      </>
    );
  }

  if (!guncel) {
    return (
      <>
        {baslik}
        <BosDurum
          ikon={Bot}
          baslik="Henüz AI görünürlüğü ölçülmedi."
          aciklama="Analizi çalıştırın; markanızın web genelindeki bahsedilmelerini, yapısal veri kapsamınızı ve soru kapsamanızı ölçelim."
          aksiyon={
            <ModulAnaliziButonu
              projeId={proje.id}
              tur="ai"
              etiket="AI Analizini Çalıştır"
              calisanIsId={calisanIs?.id ?? null}
            />
          }
        />
      </>
    );
  }

  const kirilim = (guncel.breakdown ?? {}) as {
    marka_bahsi?: number;
    bahseden_alan_adi?: number;
    snippet_sayisi?: number;
    cevaplanan_soru?: number;
    toplam_soru?: number;
    schema_kapsamasi?: number;
  };

  const grafik = [...gecmis]
    .reverse()
    .map((g) => {
      const d = new Date(g.created_at);
      return { etiket: `${d.getDate()} ${AY_KISA[d.getMonth()]}`, deger: g.score ?? 0 };
    });

  return (
    <>
      {baslik}

      <div className="space-y-9">
        <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <div className="glass rounded-[16px] p-5">
            <div className="flex items-center gap-5">
              <SkorHalkasi skor={guncel.score} boyut={104} etiket="AI skoru" />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink-900">AI görünürlüğü</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                  Beş sinyalin ağırlıklı ortalaması. Son ölçüm {tarih(guncel.created_at)}.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
              {(
                [
                  ["Marka görünürlüğü", guncel.brand_visibility, "brand_visibility"],
                  ["İçerik güvenilirliği", guncel.content_trust, "content_trust"],
                  ["Konu otoritesi", guncel.topic_authority, "topic_authority"],
                  ["Ürün görünürlüğü", guncel.product_visibility, "product_visibility"],
                  ["Soru kapsama oranı", guncel.question_coverage, "question_coverage"],
                ] as [string, number | null, keyof typeof KIRILIM_ACIKLAMASI][]
              ).map(([etiket, deger, anahtar]) =>
                deger === null ? (
                  /* Ölçülemeyen sinyal sıfır gibi gösterilmez; aradaki fark
                     kullanıcı için anlamlıdır. */
                  <div key={etiket} className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5 text-[13px] text-ink-500">
                      {etiket}
                      <Ipucu metin={KIRILIM_ACIKLAMASI[anahtar]} />
                    </span>
                    <span className="text-[12.5px] text-ink-300">ölçülemedi</span>
                  </div>
                ) : (
                  <SkorCubugu
                    key={etiket}
                    etiket={etiket}
                    skor={deger}
                    ipucu={<Ipucu metin={KIRILIM_ACIKLAMASI[anahtar]} />}
                  />
                ),
              )}
            </div>
          </div>
        </section>

        <section>
          <BolumBasligi baslik="Ölçülen sinyaller" />
          <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-3 lg:grid-cols-5">
            <OzetDegeri
              etiket="Marka bahsi"
              deger={sayi(kirilim.marka_bahsi ?? 0)}
              ipucu="Marka adınızın web genelinde geçtiği içerik sayısı."
            />
            <OzetDegeri etiket="Bahseden kaynak" deger={sayi(kirilim.bahseden_alan_adi ?? 0)} />
            <OzetDegeri
              etiket="Öne çıkan snippet"
              deger={sayi(kirilim.snippet_sayisi ?? 0)}
              ipucu="Kazandığınız öne çıkan snippet ve cevap kutusu sayısı."
            />
            <OzetDegeri
              etiket="Cevaplanan soru"
              deger={`${sayi(kirilim.cevaplanan_soru ?? 0)} / ${sayi(kirilim.toplam_soru ?? 0)}`}
            />
            <OzetDegeri
              etiket="Yapısal veri kapsaması"
              deger={`%${kirilim.schema_kapsamasi ?? 0}`}
              ipucu="Schema işaretlemesi bulunan sayfa oranı."
            />
          </div>
        </section>

        {grafik.length >= 2 ? (
          <section>
            <BolumBasligi baslik="Skor değişimi" />
            <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
              <CizgiGrafik veri={grafik} yukseklik={200} birim="puan" />
            </div>
          </section>
        ) : null}

        {bahisler.length ? (
          <section>
            <BolumBasligi
              baslik="Marka bahsedilmeleri"
              aciklama="Markanızın geçtiği içerikler; yapay zekâ cevaplarının beslendiği kaynaklar."
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {bahisler.map((b) => (
                <li key={b.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-ink-900">{b.source ?? "—"}</span>
                    <Rozet>{b.mention_type === "marka" ? "Marka" : b.mention_type === "urun" ? "Ürün" : "İçerik"}</Rozet>
                  </div>
                  {b.context ? (
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{kirp(b.context, 180)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
