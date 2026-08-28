import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SITE_SEKMELERI } from "@/config/navigation";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { DagilimSeridi } from "@/components/charts";
import { OnemRozeti, Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { SkorCubugu, SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { FiltreSeridi, Sekmeler } from "@/components/ui/tabs";
import { TEKNIK_KATEGORI_ADI, type TeknikKirilim } from "@/lib/scoring";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, urlYolu } from "@/lib/utils";
import type { ProjeSkorlari, TeknikSorun } from "@/types/database";

export const metadata: Metadata = {
  title: "Teknik SEO",
  robots: { index: false, follow: false },
};

const KATEGORI_ETIKET: Record<string, string> = {
  tarama: "Tarama",
  indeksleme: "İndeksleme",
  meta: "Meta veriler",
  baslik: "Başlık yapısı",
  link: "Link yapısı",
  gorsel: "Görseller",
  schema: "Schema",
  mimari: "Site mimarisi",
};

export default async function TeknikSeoSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ onem?: string; kategori?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { onem = "hepsi", kategori = "hepsi" } = await searchParams;
  const supabase = await sunucuIstemcisi();

  let sorgu = supabase
    .from("technical_issues")
    .select("*")
    .eq("project_id", proje.id)
    .eq("status", "acik")
    .limit(2000);

  if (onem !== "hepsi") sorgu = sorgu.eq("severity", onem);
  if (kategori !== "hepsi") sorgu = sorgu.eq("category", kategori);

  const [{ data: sorunVerisi }, { data: tumSorunlar }, { data: gecmis }] = await Promise.all([
    sorgu,
    supabase
      .from("technical_issues")
      .select("severity, category")
      .eq("project_id", proje.id)
      .eq("status", "acik")
      .limit(5000),
    supabase
      .from("audit_history")
      .select("scores, created_at")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const sorunlar = (sorunVerisi ?? []) as TeknikSorun[];
  const tumu = tumSorunlar ?? [];
  const skorlar = (proje.scores ?? {}) as ProjeSkorlari;

  const onemSayaclari = {
    kritik: tumu.filter((s) => s.severity === "kritik").length,
    uyari: tumu.filter((s) => s.severity === "uyari").length,
    bilgi: tumu.filter((s) => s.severity === "bilgi").length,
  };

  const kategoriSayaclari = Object.keys(KATEGORI_ETIKET).reduce<Record<string, number>>((acc, k) => {
    acc[k] = tumu.filter((s) => s.category === k).length;
    return acc;
  }, {});

  // Kırılım geçmiş kayıttan okunur; yoksa genel teknik skor gösterilir.
  const kirilim = ((gecmis?.scores as Record<string, unknown>)?.teknik_kirilim ?? null) as TeknikKirilim | null;

  const filtreBaglantisi = (o: string, k: string) => `/teknik-seo?onem=${o}&kategori=${k}`;

  const kolonlar: TabloKolonu[] = [
    { baslik: "Sorun", sabit: true, genislik: "28%" },
    { baslik: "Önem" },
    { baslik: "Kategori" },
    { baslik: "Adres", genislik: "26%" },
    { baslik: "Öneri", siralanabilir: false, mobilGizle: true },
  ];

  const satirlar: TabloSatiri[] = sorunlar.map((s) => ({
    id: s.id,
    degerler: [s.title, s.severity, KATEGORI_ETIKET[s.category] ?? s.category, s.url, s.recommendation],
    hucreler: [
      <span key="b" className="font-medium text-ink-900">
        {s.title}
      </span>,
      <OnemRozeti key="o" onem={s.severity} />,
      <Rozet key="k">{KATEGORI_ETIKET[s.category] ?? s.category}</Rozet>,
      s.url ? (
        <a
          key="u"
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[260px] truncate text-ink-500 hover:text-ink-900"
        >
          {urlYolu(s.url)}
        </a>
      ) : (
        <span key="u" className="text-ink-300">
          —
        </span>
      ),
      <span key="r" className="block max-w-[320px] text-[12.5px] text-ink-500">
        {s.recommendation ?? "—"}
      </span>,
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Teknik SEO"
        aciklama={`${proje.domain} taramasında bulunan teknik sorunlar ve site sağlığı.`}
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <Sekmeler ogeler={SITE_SEKMELERI} aktif="/teknik-seo" className="mb-6" />

      {tumu.length === 0 && !proje.last_audit_at ? (
        <BosDurum
          ikon={Wrench}
          baslik="Henüz teknik tarama yapılmadı."
          aciklama="Site taramasını başlatın; başlık, açıklama, indeksleme, schema ve link yapısı sayfa sayfa kontrol edilsin."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      ) : (
        <div className="space-y-9">
          <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <div className="rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-center gap-4">
                <SkorHalkasi skor={skorlar.teknik ?? null} boyut={92} etiket="Teknik" />
                <div>
                  <p className="text-[13px] font-medium text-ink-900">Teknik SEO skoru</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                    Tarama, indeksleme, meta veriler ve site mimarisinin ağırlıklı ortalaması.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[14px] border border-line bg-white p-5">
              {kirilim ? (
                <div className="grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                  {(Object.keys(TEKNIK_KATEGORI_ADI) as (keyof TeknikKirilim)[]).map((k) => (
                    <SkorCubugu key={k} etiket={TEKNIK_KATEGORI_ADI[k]} skor={kirilim[k]} />
                  ))}
                </div>
              ) : (
                <>
                  <p className="mb-4 text-[13px] font-medium text-ink-900">Sorun dağılımı</p>
                  <DagilimSeridi
                    dilimler={[
                      { etiket: "Kritik", deger: onemSayaclari.kritik, renk: "var(--color-critical)" },
                      { etiket: "Uyarı", deger: onemSayaclari.uyari, renk: "var(--color-caution)" },
                      { etiket: "Bilgi", deger: onemSayaclari.bilgi, renk: "var(--color-ink-300)" },
                    ]}
                  />
                </>
              )}
            </div>
          </section>

          <section>
            <BolumBasligi
              baslik="Açık sorunlar"
              aciklama={`${sayi(tumu.length)} sorun bulundu. Kritik olanlar sıralamayı doğrudan etkiler.`}
              sag={
                <Link href="/aksiyon-merkezi" className="text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
                  Aksiyon merkezinde gör
                </Link>
              }
            />

            <div className="mt-4 space-y-3">
              <FiltreSeridi
                ogeler={[
                  { etiket: "Tüm önem seviyeleri", href: filtreBaglantisi("hepsi", kategori) },
                  { etiket: "Kritik", href: filtreBaglantisi("kritik", kategori), sayac: onemSayaclari.kritik },
                  { etiket: "Uyarı", href: filtreBaglantisi("uyari", kategori), sayac: onemSayaclari.uyari },
                  { etiket: "Bilgi", href: filtreBaglantisi("bilgi", kategori), sayac: onemSayaclari.bilgi },
                ]}
                aktif={filtreBaglantisi(onem, kategori)}
              />
              <FiltreSeridi
                ogeler={[
                  { etiket: "Tüm kategoriler", href: filtreBaglantisi(onem, "hepsi") },
                  ...Object.entries(KATEGORI_ETIKET).map(([deger, etiket]) => ({
                    etiket,
                    href: filtreBaglantisi(onem, deger),
                    sayac: kategoriSayaclari[deger],
                  })),
                ]}
                aktif={filtreBaglantisi(onem, kategori)}
              />
            </div>

            <div className="mt-5">
              {sorunlar.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-10 text-center text-[13px] text-ink-400">
                  {tumu.length === 0
                    ? "Tebrikler, açık teknik sorun bulunmuyor."
                    : "Bu filtreye uyan sorun bulunmuyor."}
                </p>
              ) : (
                <VeriTablosu
                  kolonlar={kolonlar}
                  satirlar={satirlar}
                  aramaYerTutucu="Sorun veya adres ara…"
                  sayfaBoyutu={50}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
