import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SITE_SEKMELERI } from "@/config/navigation";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { FiltreSeridi, Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, urlYolu } from "@/lib/utils";
import type { SayfaOzeti, SayfaTuru } from "@/types/database";

export const metadata: Metadata = {
  title: "Sayfa Analizi",
  robots: { index: false, follow: false },
};

const TUR_ETIKET: Record<SayfaTuru, string> = {
  anasayfa: "Ana sayfa",
  urun: "Ürün",
  kategori: "Kategori",
  icerik: "İçerik",
  diger: "Diğer",
};

export default async function SayfaAnaliziSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { tur = "hepsi" } = await searchParams;
  const supabase = await sunucuIstemcisi();

  let sorgu = supabase
    .from("sayfa_ozet")
    .select("*")
    .eq("project_id", proje.id)
    .order("critical_count", { ascending: false })
    .limit(1000);

  if (tur !== "hepsi") sorgu = sorgu.eq("page_type", tur);

  const [{ data }, { data: turSayimlari }] = await Promise.all([
    sorgu,
    supabase.from("pages").select("page_type").eq("project_id", proje.id).limit(5000),
  ]);

  const sayfalar = (data ?? []) as SayfaOzeti[];
  const sayimlar = (turSayimlari ?? []).reduce<Record<string, number>>((acc, s) => {
    acc[s.page_type] = (acc[s.page_type] ?? 0) + 1;
    return acc;
  }, {});

  const sorunluSayfa = sayfalar.filter((s) => s.issue_count > 0).length;
  const indekslenemez = sayfalar.filter((s) => s.is_indexable === false).length;

  const kolonlar: TabloKolonu[] = [
    { baslik: "Sayfa", sabit: true, genislik: "30%" },
    { baslik: "Tür" },
    { baslik: "Durum", hizala: "sag", ipucu: "HTTP durum kodu." },
    { baslik: "Başlık", hizala: "sag", ipucu: "Başlık etiketinin karakter uzunluğu." },
    { baslik: "Açıklama", hizala: "sag", ipucu: "Meta açıklamanın karakter uzunluğu." },
    { baslik: "Kelime", hizala: "sag" },
    { baslik: "İç bağlantı", hizala: "sag" },
    { baslik: "Sorun", hizala: "sag" },
  ];

  const satirlar: TabloSatiri[] = sayfalar.map((s) => ({
    id: s.id,
    href: `/sayfa-analizi/${s.id}`,
    degerler: [
      s.title ?? s.url,
      TUR_ETIKET[s.page_type],
      s.status_code,
      s.title_length,
      s.meta_description_length,
      s.word_count,
      s.internal_links_count,
      s.issue_count,
    ],
    hucreler: [
      <Link key="s" href={`/sayfa-analizi/${s.id}`} className="block min-w-0">
        <span className="block truncate font-medium text-ink-900">
          {kirp(s.title, 60) || urlYolu(s.url)}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-400">{urlYolu(s.url)}</span>
      </Link>,
      <Rozet key="t">{TUR_ETIKET[s.page_type]}</Rozet>,
      <span
        key="d"
        className={`tabular ${(s.status_code ?? 200) >= 400 ? "font-medium text-critical" : ""}`}
      >
        {s.status_code ?? "—"}
      </span>,
      <span key="b" className={`tabular ${uzunlukRengi(s.title_length, 25, 65)}`}>
        {s.title_length ?? "—"}
      </span>,
      <span key="a" className={`tabular ${uzunlukRengi(s.meta_description_length, 70, 165)}`}>
        {s.meta_description_length ?? "—"}
      </span>,
      <span key="k" className={`tabular ${(s.word_count ?? 0) < 150 ? "text-caution" : ""}`}>
        {sayi(s.word_count)}
      </span>,
      <span key="i" className="tabular">
        {sayi(s.internal_links_count)}
      </span>,
      s.issue_count > 0 ? (
        <Rozet key="so" ton={s.critical_count > 0 ? "kritik" : "uyari"}>
          {s.issue_count}
        </Rozet>
      ) : (
        <span key="so" className="text-ink-300">
          —
        </span>
      ),
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Sayfa Analizi"
        aciklama="Taranan tüm sayfalar; başlık, açıklama, içerik derinliği ve sorunlarıyla birlikte."
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <Sekmeler ogeler={SITE_SEKMELERI} aktif="/sayfa-analizi" className="mb-6" />

      {sayfalar.length === 0 && tur === "hepsi" ? (
        <BosDurum
          ikon={FileText}
          baslik="Henüz taranmış sayfa yok."
          aciklama="Site taramasını başlatın; tüm sayfalarınız tek tek incelensin."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <OzetDegeri etiket="Taranan sayfa" deger={sayi(proje.stats?.taranan_sayfa ?? sayfalar.length)} />
            <OzetDegeri etiket="Sorunlu sayfa" deger={sayi(sorunluSayfa)} />
            <OzetDegeri
              etiket="İndekslenemeyen"
              deger={sayi(indekslenemez)}
              ipucu="noindex veya robots kuralı nedeniyle arama sonuçlarına giremeyen sayfalar."
            />
            <OzetDegeri etiket="Ürün sayfası" deger={sayi(sayimlar.urun ?? 0)} />
          </div>

          <FiltreSeridi
            ogeler={[
              { etiket: "Tüm sayfalar", href: "/sayfa-analizi?tur=hepsi" },
              ...(Object.keys(TUR_ETIKET) as SayfaTuru[]).map((t) => ({
                etiket: TUR_ETIKET[t],
                href: `/sayfa-analizi?tur=${t}`,
                sayac: sayimlar[t] ?? 0,
              })),
            ]}
            aktif={`/sayfa-analizi?tur=${tur}`}
            className="mb-5"
          />

          <VeriTablosu kolonlar={kolonlar} satirlar={satirlar} aramaYerTutucu="Sayfa veya başlık ara…" sayfaBoyutu={50} />
        </>
      )}
    </>
  );
}

function uzunlukRengi(deger: number | null, alt: number, ust: number): string {
  if (deger === null || deger === 0) return "text-critical font-medium";
  if (deger < alt || deger > ust) return "text-caution";
  return "";
}
