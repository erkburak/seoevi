import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { CubukGrafik } from "@/components/charts";
import { AmacRozeti, Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { OzetDegeri } from "@/components/ui/metric";
import { FirsatSkoru } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi, urlYolu } from "@/lib/utils";
import type { AramaAmaci, Rakip } from "@/types/database";

export const metadata: Metadata = {
  title: "Rakip Analizi",
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
  trafik_sayfalari?: { url: string; kelime_sayisi: number; tahmini_trafik: number; ilk_on: number }[];
};

export default async function RakipAnaliziSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { proje } = await projeBaglami();
  const { id } = await params;
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("competitors")
    .select("*")
    .eq("id", id)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!data) notFound();
  const rakip = data as Rakip;
  const m = rakip.metrics as RakipMetrikleri;

  // Rakibin sıralandığı kelimeler ile bizim sıralamalarımızı karşılaştır
  const { data: rakipSiralari } = await supabase
    .from("keyword_rankings")
    .select("position, url, keyword_id, keywords(id, keyword, search_volume, difficulty, intent)")
    .eq("project_id", proje.id)
    .eq("domain", rakip.domain)
    .eq("is_competitor", true)
    .order("position", { ascending: true })
    .limit(500);

  type Satir = {
    position: number | null;
    url: string | null;
    keyword_id: string;
    keywords:
      | { id: string; keyword: string; search_volume: number | null; difficulty: number | null; intent: string | null }
      | { id: string; keyword: string; search_volume: number | null; difficulty: number | null; intent: string | null }[]
      | null;
  };

  const rakipKelimeleri = ((rakipSiralari ?? []) as unknown as Satir[])
    .map((s) => {
      const k = Array.isArray(s.keywords) ? s.keywords[0] : s.keywords;
      return k ? { ...k, rakipPozisyon: s.position, rakipUrl: s.url } : null;
    })
    .filter((k): k is NonNullable<typeof k> => k !== null);

  const kelimeIdleri = rakipKelimeleri.map((k) => k.id);

  const [{ data: bizimSiralar }, { data: firsatlar }] = await Promise.all([
    kelimeIdleri.length
      ? supabase
          .from("keyword_rankings")
          .select("keyword_id, position, url")
          .eq("project_id", proje.id)
          .eq("is_competitor", false)
          .in("keyword_id", kelimeIdleri.slice(0, 300))
          .order("checked_at", { ascending: false })
      : Promise.resolve({ data: [] as { keyword_id: string; position: number | null; url: string | null }[] }),
    supabase
      .from("keyword_opportunities")
      .select("keyword_id, score")
      .eq("project_id", proje.id)
      .eq("opportunity_type", "rakip_acigi")
      .limit(500),
  ]);

  const bizimHarita = new Map<string, { position: number | null; url: string | null }>();
  for (const s of bizimSiralar ?? []) {
    if (!bizimHarita.has(s.keyword_id)) bizimHarita.set(s.keyword_id, { position: s.position, url: s.url });
  }

  const firsatHarita = new Map((firsatlar ?? []).map((f) => [f.keyword_id, f.score]));

  const satirVerisi = rakipKelimeleri.map((k) => {
    const bizim = bizimHarita.get(k.id);
    return {
      ...k,
      bizimPozisyon: bizim?.position ?? null,
      bizimUrl: bizim?.url ?? null,
      firsat: firsatHarita.get(k.id) ?? null,
    };
  });

  const kaybettiklerimiz = satirVerisi.filter(
    (k) => k.rakipPozisyon !== null && (k.bizimPozisyon === null || k.bizimPozisyon > k.rakipPozisyon),
  );
  const kazandiklarimiz = satirVerisi.filter(
    (k) => k.bizimPozisyon !== null && k.rakipPozisyon !== null && k.bizimPozisyon < k.rakipPozisyon,
  );
  const hicSiralanmadiklarimiz = satirVerisi.filter((k) => k.bizimPozisyon === null);

  const kolonlar: TabloKolonu[] = [
    { baslik: "Anahtar kelime", sabit: true, genislik: "26%" },
    { baslik: "Hacim", hizala: "sag" },
    { baslik: "Sizin sıranız", hizala: "sag" },
    { baslik: "Rakip sırası", hizala: "sag" },
    { baslik: "Fark", hizala: "sag" },
    { baslik: "Zorluk", hizala: "sag" },
    { baslik: "Amaç" },
    { baslik: "Fırsat", hizala: "sag" },
    { baslik: "Rakip sayfası", mobilGizle: true },
  ];

  const satirlar: TabloSatiri[] = satirVerisi.map((k) => {
    const fark =
      k.bizimPozisyon !== null && k.rakipPozisyon !== null ? k.bizimPozisyon - k.rakipPozisyon : null;

    return {
      id: k.id,
      href: `/anahtar-kelimeler/${k.id}`,
      degerler: [
        k.keyword,
        k.search_volume,
        k.bizimPozisyon,
        k.rakipPozisyon,
        fark,
        k.difficulty,
        k.intent,
        k.firsat,
        k.rakipUrl,
      ],
      hucreler: [
        <Link key="k" href={`/anahtar-kelimeler/${k.id}`} className="font-medium text-ink-900 hover:underline">
          {k.keyword}
        </Link>,
        <span key="h" className="tabular">
          {sayi(k.search_volume)}
        </span>,
        <span key="b" className="tabular font-medium">
          {k.bizimPozisyon ?? <span className="text-critical">yok</span>}
        </span>,
        <span key="r" className="tabular">
          {k.rakipPozisyon ?? "—"}
        </span>,
        fark === null ? (
          <span key="f" className="text-ink-300">
            —
          </span>
        ) : (
          <span key="f" className={`tabular font-medium ${fark > 0 ? "text-critical" : "text-positive"}`}>
            {fark > 0 ? `${fark} geride` : `${Math.abs(fark)} önde`}
          </span>
        ),
        <span key="z" className="tabular">
          {k.difficulty ?? "—"}
        </span>,
        <AmacRozeti key="a" amac={k.intent as AramaAmaci | null} />,
        k.firsat !== null ? (
          <FirsatSkoru key="fs" skor={k.firsat} />
        ) : (
          <span key="fs" className="text-ink-300">
            —
          </span>
        ),
        k.rakipUrl ? (
          <a
            key="u"
            href={k.rakipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block max-w-[200px] truncate text-ink-500 hover:text-ink-900"
          >
            {urlYolu(k.rakipUrl)}
          </a>
        ) : (
          <span key="u" className="text-ink-300">
            —
          </span>
        ),
      ],
    };
  });

  return (
    <>
      <Link
        href="/rakipler"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Rakipler
      </Link>

      <SayfaBasligi
        baslik={rakip.domain}
        aciklama={`${proje.domain} ile karşılaştırmalı görünürlük analizi.`}
      />

      <div className="mb-8 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-3 lg:grid-cols-6">
        <OzetDegeri etiket="Rakip kelime sayısı" deger={sayi(m.organik_kelime ?? 0)} />
        <OzetDegeri etiket="Rakip trafiği" deger={kisaSayi(m.tahmini_trafik ?? 0)} />
        <OzetDegeri etiket="Ortak kelime" deger={sayi(m.ortak_kelime ?? 0)} />
        <OzetDegeri
          etiket="Geride olduğunuz"
          deger={sayi(kaybettiklerimiz.length)}
          ipucu="Rakibin sizden daha üst sırada olduğu kelimeler."
        />
        <OzetDegeri etiket="Önde olduğunuz" deger={sayi(kazandiklarimiz.length)} />
        <OzetDegeri
          etiket="Hiç sıralanmadığınız"
          deger={sayi(hicSiralanmadiklarimiz.length)}
          ipucu="Rakibin sıralandığı ama sizin ilk 100'de görünmediğiniz kelimeler."
        />
      </div>

      {m.kirilim ? (
        <section className="mb-9">
          <BolumBasligi
            baslik="Rakibin Açığı"
            aciklama={`${sayi(m.acik_firsat ?? 0)} fırsat, tür bazında kırılım.`}
          />
          <div className="mt-4 rounded-[14px] border border-line bg-white p-5">
            <CubukGrafik
              veri={[
                { etiket: "Düşük rekabetli kelime", deger: m.kirilim.dusuk_rekabet ?? 0 },
                { etiket: "Ticari kelime", deger: m.kirilim.ticari ?? 0 },
                { etiket: "İçerik fırsatı", deger: m.kirilim.bilgi ?? 0 },
                { etiket: "Hiç sıralanmadığınız", deger: m.kirilim.sadece_rakipte ?? 0 },
              ]}
              vurgulanan="Ticari kelime"
            />
          </div>
        </section>
      ) : null}

      {m.trafik_sayfalari?.length ? (
        <section className="mb-9">
          <BolumBasligi
            baslik="Rakibin trafik getiren sayfaları"
            aciklama="En çok organik ziyaret alan sayfalar; içerik boşluğunuzu buradan görebilirsiniz."
          />
          <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
            {m.trafik_sayfalari.slice(0, 10).map((s) => (
              <li key={s.url} className="flex items-center justify-between gap-3 px-4 py-3">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-[13.5px] text-ink-700 hover:text-ink-900"
                >
                  {urlYolu(s.url)}
                </a>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="tabular text-[12.5px] text-ink-400">{sayi(s.kelime_sayisi)} kelime</span>
                  <Rozet ton="bilgi">{kisaSayi(s.tahmini_trafik)} trafik</Rozet>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <BolumBasligi
          baslik="Kelime karşılaştırması"
          aciklama="Rakibin sıralandığı kelimelerde sizin durumunuz."
        />
        <div className="mt-4">
          {satirlar.length === 0 ? (
            <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-10 text-center text-[13px] text-ink-400">
              Bu rakip için karşılaştırma verisi henüz toplanmadı. Rakip analizini yenileyerek
              verileri getirebilirsiniz.
            </p>
          ) : (
            <VeriTablosu
              kolonlar={kolonlar}
              satirlar={satirlar}
              aramaYerTutucu="Kelime ara…"
              sayfaBoyutu={50}
            />
          )}
        </div>
      </section>
    </>
  );
}
