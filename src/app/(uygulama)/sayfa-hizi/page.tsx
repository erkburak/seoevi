import { Gauge } from "lucide-react";
import type { Metadata } from "next";

import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { SITE_SEKMELERI } from "@/config/navigation";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, tarihSaat, urlYolu } from "@/lib/utils";
import type { SayfaTuru } from "@/types/database";

export const metadata: Metadata = {
  title: "Sayfa Hızı",
  robots: { index: false, follow: false },
};

const TUR_ADI: Record<string, string> = {
  anasayfa: "Ana sayfa",
  urun: "Ürün",
  kategori: "Kategori",
  icerik: "İçerik",
  diger: "Diğer",
};

type HizSatiri = {
  id: string;
  url: string;
  performans: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  ttfb_ms: number | null;
  olculdu_at: string;
  pages: { page_type: string } | { page_type: string }[] | null;
};

/** Google'ın eşikleri: 90+ iyi, 50-89 orta, 50 altı kötü. */
function skorTonu(skor: number | null): "olumlu" | "uyari" | "kritik" | "notr" {
  if (skor === null) return "notr";
  if (skor >= 90) return "olumlu";
  if (skor >= 50) return "uyari";
  return "kritik";
}

function saniye(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${sayi(ms)} ms`;
  return `${(ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn`;
}

export default async function SayfaHiziSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ limitler }, { data }] = await Promise.all([
    abonelikDurumu(kullanici.id),
    supabase
      .from("sayfa_hizi")
      .select("id, url, performans, lcp_ms, cls, tbt_ms, ttfb_ms, olculdu_at, pages(page_type)")
      .eq("project_id", proje.id)
      .order("performans", { ascending: true, nullsFirst: false })
      .limit(200),
  ]);

  const baslik = (
    <SayfaBasligi
      baslik="Sayfa Hızı"
      aciklama="Sayfalarınız mobilde ne kadar hızlı açılıyor? Ölçüm Google'ın kendi Lighthouse motoruyla, site analizi sırasında yapılır."
    />
  );

  if (limitler?.sayfa_hizi !== true) {
    return (
      <>
        {baslik}
        <PaketUyarisi
          ozellik="Sayfa hızı ölçümü"
          aciklama="Ürün ve kategori şablonlarınızın Çekirdek Web Verilerini ölçer, hangi şablonun yavaş olduğunu ve nedenini gösterir. Ölçüm sayfa başına ücretlendirildiği için paketlere göre sınırlıdır."
        />
      </>
    );
  }

  const satirlarHam = (data ?? []) as unknown as HizSatiri[];

  if (!satirlarHam.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={SITE_SEKMELERI} aktif="/teknik-seo" className="mb-6" />
        <BosDurum
          ikon={Gauge}
          baslik="Henüz hız ölçümü yapılmadı."
          aciklama="Sayfa hızı, site analizi sırasında ölçülür. Bir analiz başlattığınızda şablonlarınızı temsil eden sayfalar ölçülür ve sonuçlar burada görünür."
        />
      </>
    );
  }

  const skorlar = satirlarHam
    .map((s) => s.performans)
    .filter((s): s is number => typeof s === "number");

  const ortalama = skorlar.length
    ? Math.round(skorlar.reduce((t, s) => t + s, 0) / skorlar.length)
    : null;

  /* ---------------- Şablon ortalamaları ---------------- */

  const turKovalari = new Map<string, number[]>();
  for (const s of satirlarHam) {
    if (typeof s.performans !== "number") continue;
    const iliski = Array.isArray(s.pages) ? s.pages[0] : s.pages;
    const tur = iliski?.page_type ?? "diger";
    if (!turKovalari.has(tur)) turKovalari.set(tur, []);
    turKovalari.get(tur)!.push(s.performans);
  }

  const turOrtalamalari = [...turKovalari.entries()]
    .map(([tur, liste]) => ({
      tur,
      ortalama: Math.round(liste.reduce((t, s) => t + s, 0) / liste.length),
      adet: liste.length,
    }))
    .sort((a, b) => a.ortalama - b.ortalama);

  const kolonlar: TabloKolonu[] = [
    { baslik: "Sayfa", sabit: true, genislik: "34%" },
    { baslik: "Tür" },
    { baslik: "Performans", hizala: "sag", ipucu: "0-100 arası Lighthouse skoru; 90 ve üzeri iyi sayılır." },
    {
      baslik: "LCP",
      hizala: "sag",
      ipucu: "En büyük içeriğin görünmesi. Google'ın iyi sınırı 2,5 saniye.",
    },
    { baslik: "CLS", hizala: "sag", ipucu: "Yerleşim kayması. İyi sınır 0,1." },
    { baslik: "TBT", hizala: "sag", ipucu: "Etkileşimin kilitlendiği süre. İyi sınır 200 ms." },
    { baslik: "Sunucu", hizala: "sag", ipucu: "İlk baytın gelmesi. İyi sınır 600 ms." },
  ];

  const satirlar: TabloSatiri[] = satirlarHam.map((s) => {
    const iliski = Array.isArray(s.pages) ? s.pages[0] : s.pages;
    const tur = (iliski?.page_type ?? "diger") as SayfaTuru;

    return {
      id: s.id,
      degerler: [s.url, TUR_ADI[tur] ?? tur, s.performans, s.lcp_ms, s.cls, s.tbt_ms, s.ttfb_ms],
      hucreler: [
        <a
          key="url"
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[320px] truncate text-ink-700 hover:text-ink-900 hover:underline"
          title={`${s.url}\n${tarihSaat(s.olculdu_at)} tarihinde ölçüldü`}
        >
          {urlYolu(s.url)}
        </a>,
        <span key="tur" className="text-[13px] text-ink-500">
          {TUR_ADI[tur] ?? tur}
        </span>,
        <Rozet key="p" ton={skorTonu(s.performans)}>
          {s.performans ?? "—"}
        </Rozet>,
        <span key="lcp" className="tabular text-[13px]">
          {saniye(s.lcp_ms)}
        </span>,
        <span key="cls" className="tabular text-[13px]">
          {s.cls === null ? "—" : s.cls.toLocaleString("tr-TR", { maximumFractionDigits: 3 })}
        </span>,
        <span key="tbt" className="tabular text-[13px]">
          {saniye(s.tbt_ms)}
        </span>,
        <span key="ttfb" className="tabular text-[13px]">
          {saniye(s.ttfb_ms)}
        </span>,
      ],
    };
  });

  return (
    <>
      {baslik}
      <Sekmeler ogeler={SITE_SEKMELERI} aktif="/teknik-seo" className="mb-6" />

      <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
        <OzetDegeri
          etiket="Ortalama performans"
          deger={ortalama ?? "—"}
          ipucu="Ölçülen sayfaların ortalama Lighthouse performans skoru."
        />
        <OzetDegeri etiket="Ölçülen sayfa" deger={sayi(satirlarHam.length)} />
        <OzetDegeri
          etiket="İyi (90+)"
          deger={sayi(skorlar.filter((s) => s >= 90).length)}
          ipucu="Google'ın iyi saydığı eşiği geçen sayfa sayısı."
        />
        <OzetDegeri
          etiket="Kötü (50 altı)"
          deger={sayi(skorlar.filter((s) => s < 50).length)}
        />
      </div>

      {turOrtalamalari.length > 1 ? (
        <section className="mb-8">
          <BolumBasligi
            baslik="Hangi şablon yavaş?"
            aciklama="Mağazanızdaki yüzlerce sayfa aynı birkaç şablonu kullanır. Bir şablondaki sorun, o şablonu kullanan her sayfayı etkiler — düzeltme de aynı şekilde hepsine yarar."
          />
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {turOrtalamalari.map((t) => (
              <li
                key={t.tur}
                className="flex items-center justify-between rounded-[12px] border border-line bg-white px-4 py-3"
              >
                <div>
                  <p className="text-[13.5px] font-medium text-ink-900">
                    {TUR_ADI[t.tur] ?? t.tur}
                  </p>
                  <p className="text-[12px] text-ink-400">{sayi(t.adet)} sayfa ölçüldü</p>
                </div>
                <Rozet ton={skorTonu(t.ortalama)}>{t.ortalama}</Rozet>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <BolumBasligi
        baslik="Ölçülen sayfalar"
        aciklama="En yavaştan başlayarak sıralanır. Ölçüm mobil cihaz koşullarında yapılır; Google sıralamada mobil sürümü esas alır."
      />
      <div className="mt-4">
        <VeriTablosu kolonlar={kolonlar} satirlar={satirlar} />
      </div>
    </>
  );
}
