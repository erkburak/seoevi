import { Bot, ExternalLink } from "lucide-react";
import type { Metadata } from "next";

import { AiTakipListesi } from "@/components/app/ai-takip";
import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Ipucu } from "@/components/ui/tooltip";
import { AI_KAYNAGI, aiGorunurlukOzeti } from "@/lib/analiz/ai-gorunurluk";
import { projeBaglami } from "@/lib/projects";
import { ozellikVarMi } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, kisaSayi, sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "AI Görünürlüğü",
  robots: { index: false, follow: false },
};

export default async function AiGorunurluguSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [izinli, ozet, { data: calisanIs }] = await Promise.all([
    ozellikVarMi(kullanici.id, "ai_gorunurlugu"),
    aiGorunurlukOzeti(proje),
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
      baslik="AI Görünürlüğü"
      aciklama="Biri yapay zekâya sorduğunda cevapta siz mi görünüyorsunuz, rakibiniz mi? Ölçüm, yapay zekânın gerçekte verdiği cevaplardan yapılır."
      aksiyon={
        izinli ? (
          <ModulAnaliziButonu
            projeId={proje.id}
            tur="ai"
            etiket="Görünürlüğü Ölç"
            gorunum="ikincil"
            calisanIsId={calisanIs?.id ?? null}
          />
        ) : undefined
      }
    />
  );

  if (!izinli) {
    return (
      <>
        {baslik}
        <PaketUyarisi
          ozellik="AI görünürlüğü"
          aciklama="Yapay zekâ cevaplarında görünüp görünmediğinizi, hangi sorularda çıktığınızı ve yerinize hangi sitelerin gösterildiğini ölçer. Bu veri sağlayıcıdan cevap başına alındığı için üst paketlerde sunulur."
        />
      </>
    );
  }

  if (!ozet.olculdu) {
    return (
      <>
        {baslik}
        <BosDurum
          ikon={Bot}
          baslik="Henüz ölçüm yapılmadı."
          aciklama={`${AI_KAYNAGI} cevaplarında alan adınızın geçtiği yerleri tarıyoruz. "Görünürlüğü Ölç" ile başlatabilirsiniz.`}
        />
      </>
    );
  }

  const rakipler = ozet.kaynaklar.filter((k) => !k.bizMiyiz);
  const biz = ozet.kaynaklar.find((k) => k.bizMiyiz);

  return (
    <>
      {baslik}

      <div className="space-y-9">
        {/* --- Özet --- */}
        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri
            etiket="Göründüğünüz cevap"
            deger={sayi(ozet.bahis)}
            ipucu="Alan adınızın kaynak olarak gösterildiği yapay zekâ cevabı sayısı."
          />
          <OzetDegeri
            etiket="İncelenen cevap"
            deger={sayi(ozet.cevaplar.length)}
          />
          <OzetDegeri
            etiket="Aylık AI araması"
            deger={kisaSayi(ozet.aiAramaHacmi)}
            ipucu="Bu cevapların karşılık geldiği aylık arama hacmi."
          />
          <OzetDegeri
            etiket="Rakip site"
            deger={sayi(rakipler.length)}
            ipucu="Aynı cevaplarda gösterilen diğer siteler."
          />
        </section>

        {/* --- Takip edilen sorular --- */}
        <section>
          <BolumBasligi
            baslik="Takip ettiğiniz sorular"
            aciklama="Müşterilerinizin yapay zekâya soracağını düşündüğünüz soruları girin; her ölçümde o cevaplarda görünüp görünmediğinizi raporlarız."
          />
          <div className="mt-4">
            <AiTakipListesi
              projeId={proje.id}
              takipler={ozet.takipler}
              limit={ozet.takipLimiti}
            />
          </div>
        </section>

        {/* --- Yerinize kim gösteriliyor --- */}
        {rakipler.length ? (
          <section>
            <BolumBasligi
              baslik="Bu cevaplarda kim gösteriliyor?"
              aciklama="Yapay zekâ cevap verirken hangi siteleri kaynak gösteriyor. Üst sıradakiler, sizin yerinize okunan sitelerdir."
              sag={
                <Ipucu metin="Sıralama, incelenen cevaplarda kaç kez kaynak gösterildiklerine göredir." />
              }
            />

            <ul className="mt-4 space-y-2">
              {ozet.kaynaklar.map((k) => (
                <li
                  key={k.alanAdi}
                  className={
                    k.bizMiyiz
                      ? "flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-positive/25 bg-positive-soft/40 px-4 py-3"
                      : "flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-white px-4 py-3"
                  }
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="truncate text-[13.5px] font-medium text-ink-900">
                      {k.alanAdi}
                    </span>
                    {k.bizMiyiz ? <Rozet ton="olumlu">siz</Rozet> : null}
                  </div>
                  <span className="tabular shrink-0 text-[13px] text-ink-500">
                    {sayi(k.bahis)} cevapta
                  </span>
                </li>
              ))}
            </ul>

            {!biz ? (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-500">
                Bu cevapların hiçbirinde siteniz kaynak olarak gösterilmiyor. Yapay zekâ,
                cevaplarını yukarıdaki sitelerden kuruyor.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* --- Gerçek cevaplar --- */}
        <section>
          <BolumBasligi
            baslik="Yapay zekânın verdiği cevaplar"
            aciklama="Kullanıcıların sorduğu gerçek sorular ve alınan cevaplar."
          />

          <ul className="mt-4 space-y-2">
            {ozet.cevaplar.slice(0, 20).map((c) => (
              <li key={`${c.soru}-${c.modelAdi}`} className="rounded-[14px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.bizdeVarMi ? (
                    <Rozet ton="olumlu">Siz gösteriliyorsunuz</Rozet>
                  ) : (
                    <Rozet ton="notr">Siz yoksunuz</Rozet>
                  )}
                  {c.aiAramaHacmi > 0 ? (
                    <Rozet>{kisaSayi(c.aiAramaHacmi)} aylık arama</Rozet>
                  ) : null}
                  {c.webAramali === true ? <Rozet ton="bilgi">web aramalı</Rozet> : null}
                </div>

                <p className="mt-2 text-[14.5px] font-medium text-ink-900">{c.soru}</p>

                {c.cevap ? (
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                    {kirp(c.cevap.replace(/\[!?\[?[^\]]*\]\([^)]*\)/g, "").replace(/\s+/g, " "), 320)}
                  </p>
                ) : null}

                {c.kaynaklar.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-line pt-2.5">
                    {c.kaynaklar.slice(0, 8).map((k) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[12px] text-ink-600"
                      >
                        <ExternalLink className="size-2.5 opacity-50" aria-hidden />
                        {k}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        {/* --- Kapsam --- */}
        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">Bu ölçüm neyi kapsıyor?</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
            <li>
              <strong className="font-medium text-ink-900">Veri kaynağı {AI_KAYNAGI}.</strong>{" "}
              Türkiye&apos;de yapay zekâ cevaplarının büyük çoğunluğu buradan görülüyor. ChatGPT ve
              Perplexity ayrı ayrı ölçülmüyor; ölçtüğümüzü olduğu gibi söylüyoruz.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Gerçek cevaplar okunuyor.</strong> Bir
              modele soru sorup ne diyeceğine bakmıyoruz; kullanıcıların gerçekte aldığı cevaplar
              ve o cevaplarda gösterilen kaynaklar ölçülüyor.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Görünmek kaynak gösterilmektir.</strong>{" "}
              Yapay zekâ cevabını sitelerden kurar. Cevapta kaynak olarak siz varsanız trafik ve
              güven size gelir; yoksa rakibinize.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Ölçüm aylık yenilenir.</strong> Bu veri
              sağlayıcıdan cevap başına alındığı için her sayfa açılışında yeniden sorgulanmaz.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
