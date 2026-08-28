import { Link2 } from "lucide-react";
import type { Metadata } from "next";

import { SITE_SEKMELERI } from "@/config/navigation";
import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { CubukGrafik } from "@/components/charts";
import { Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { FiltreSeridi, Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { ozellikVarMi } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, tarih, urlYolu } from "@/lib/utils";
import type { GeriBaglanti, ReferansAlanAdi } from "@/types/database";

export const metadata: Metadata = {
  title: "Geri Bağlantılar",
  robots: { index: false, follow: false },
};

export default async function GeriBaglantilarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ gorunum?: string }>;
}) {
  const { kullanici, proje } = await projeBaglami();
  const { gorunum = "baglantilar" } = await searchParams;
  const izinli = await ozellikVarMi(kullanici.id, "geri_baglanti");
  const supabase = await sunucuIstemcisi();

  const [{ data: baglantiVerisi }, { data: alanAdiVerisi }, { data: calisanIs }] = await Promise.all([
    supabase
      .from("backlinks")
      .select("*")
      .eq("project_id", proje.id)
      .order("rank", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("referring_domains")
      .select("*")
      .eq("project_id", proje.id)
      .order("rank", { ascending: false, nullsFirst: false })
      .limit(500),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "backlink")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const baglantilar = (baglantiVerisi ?? []) as GeriBaglanti[];
  const alanAdlari = (alanAdiVerisi ?? []) as ReferansAlanAdi[];

  const baslik = (
    <SayfaBasligi
      baslik="Geri Bağlantılar"
      aciklama="Sitenize bağlantı veren alan adları, anchor dağılımı ve kaybedilen bağlantılar."
      aksiyon={
        izinli ? (
          <ModulAnaliziButonu
            projeId={proje.id}
            tur="backlink"
            etiket="Geri Bağlantıları Getir"
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
        <Sekmeler ogeler={SITE_SEKMELERI} aktif="/geri-baglantilar" className="mb-6" />
        <PaketUyarisi
          ozellik="Geri bağlantı analizi"
          aciklama="Referans veren alan adları, anchor dağılımı ve rakip bağlantı karşılaştırması Profesyonel paketten itibaren kullanılabilir."
        />
      </>
    );
  }

  if (!baglantilar.length && !alanAdlari.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={SITE_SEKMELERI} aktif="/geri-baglantilar" className="mb-6" />
        <BosDurum
          ikon={Link2}
          baslik="Henüz geri bağlantı verisi yok."
          aciklama="Analizi çalıştırın; sitenize bağlantı veren alan adlarını ve bağlantıların kalitesini getirelim."
          aksiyon={
            <ModulAnaliziButonu
              projeId={proje.id}
              tur="backlink"
              etiket="Geri Bağlantıları Getir"
              calisanIsId={calisanIs?.id ?? null}
            />
          }
        />
      </>
    );
  }

  const dofollow = baglantilar.filter((b) => b.is_dofollow).length;
  const yeni = baglantilar.filter((b) => b.is_new).length;
  const kayip = baglantilar.filter((b) => b.is_lost).length;

  const anchorDagilimi = Object.entries(
    baglantilar.reduce<Record<string, number>>((acc, b) => {
      const a = (b.anchor ?? "").trim() || "(boş anchor)";
      acc[a] = (acc[a] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([etiket, deger]) => ({ etiket: kirp(etiket, 40), deger }));

  const baglantiKolonlari: TabloKolonu[] = [
    { baslik: "Kaynak sayfa", sabit: true, genislik: "34%" },
    { baslik: "Anchor metni", genislik: "22%" },
    { baslik: "Hedef", genislik: "18%" },
    { baslik: "Güç", hizala: "sag", ipucu: "Kaynak sayfanın otorite değeri." },
    { baslik: "Tür" },
    { baslik: "İlk görülme", hizala: "sag" },
  ];

  const baglantiSatirlari: TabloSatiri[] = baglantilar.map((b) => ({
    id: b.id,
    degerler: [b.source_url, b.anchor, b.target_url, b.rank, b.is_dofollow ? "dofollow" : "nofollow", b.first_seen],
    hucreler: [
      <a
        key="k"
        href={b.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block max-w-[300px] truncate text-ink-800 hover:text-ink-900 hover:underline"
      >
        {b.source_url.replace(/^https?:\/\//, "")}
      </a>,
      <span key="a" className="block max-w-[220px] truncate text-ink-600">
        {b.anchor || <span className="text-ink-300">—</span>}
      </span>,
      <span key="h" className="block max-w-[180px] truncate text-ink-500">
        {b.target_url ? urlYolu(b.target_url) : "—"}
      </span>,
      <span key="g" className="tabular">
        {b.rank ?? "—"}
      </span>,
      <Rozet key="t" ton={b.is_dofollow ? "olumlu" : "notr"}>
        {b.is_dofollow ? "dofollow" : "nofollow"}
      </Rozet>,
      <span key="i" className="text-ink-500">
        {tarih(b.first_seen)}
      </span>,
    ],
  }));

  const alanKolonlari: TabloKolonu[] = [
    { baslik: "Alan adı", sabit: true, genislik: "40%" },
    { baslik: "Bağlantı sayısı", hizala: "sag" },
    { baslik: "Güç", hizala: "sag" },
    { baslik: "İlk görülme", hizala: "sag" },
    { baslik: "Durum" },
  ];

  const alanSatirlari: TabloSatiri[] = alanAdlari.map((a) => ({
    id: a.id,
    degerler: [a.domain, a.backlinks_count, a.rank, a.first_seen, a.is_lost ? "kayıp" : "aktif"],
    hucreler: [
      <a
        key="d"
        href={`https://${a.domain}`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-ink-900 hover:underline"
      >
        {a.domain}
      </a>,
      <span key="b" className="tabular">
        {sayi(a.backlinks_count)}
      </span>,
      <span key="g" className="tabular">
        {a.rank ?? "—"}
      </span>,
      <span key="i" className="text-ink-500">
        {tarih(a.first_seen)}
      </span>,
      <Rozet key="s" ton={a.is_lost ? "kritik" : "olumlu"}>
        {a.is_lost ? "Kaybedildi" : "Aktif"}
      </Rozet>,
    ],
  }));

  return (
    <>
      {baslik}
      <Sekmeler ogeler={SITE_SEKMELERI} aktif="/geri-baglantilar" className="mb-6" />

      <div className="mb-7 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-5">
        <OzetDegeri etiket="Toplam bağlantı" deger={sayi(proje.stats?.geri_baglanti ?? baglantilar.length)} />
        <OzetDegeri etiket="Referans alan adı" deger={sayi(proje.stats?.referans_alan_adi ?? alanAdlari.length)} />
        <OzetDegeri etiket="Dofollow" deger={sayi(dofollow)} ipucu="Otorite aktaran bağlantılar." />
        <OzetDegeri etiket="Yeni" deger={sayi(yeni)} />
        <OzetDegeri etiket="Kaybedilen" deger={sayi(kayip)} />
      </div>

      {anchorDagilimi.length ? (
        <section className="mb-9">
          <BolumBasligi
            baslik="Anchor metni dağılımı"
            aciklama="Doğal bir profilde marka adı ve adres ağırlıklıdır."
          />
          <div className="mt-4 rounded-[14px] border border-line bg-white p-5">
            <CubukGrafik veri={anchorDagilimi} />
          </div>
        </section>
      ) : null}

      <FiltreSeridi
        ogeler={[
          { etiket: "Bağlantılar", href: "/geri-baglantilar?gorunum=baglantilar", sayac: baglantilar.length },
          { etiket: "Alan adları", href: "/geri-baglantilar?gorunum=alan-adlari", sayac: alanAdlari.length },
        ]}
        aktif={`/geri-baglantilar?gorunum=${gorunum}`}
        className="mb-5"
      />

      {gorunum === "alan-adlari" ? (
        <VeriTablosu
          kolonlar={alanKolonlari}
          satirlar={alanSatirlari}
          aramaYerTutucu="Alan adı ara…"
          sayfaBoyutu={50}
        />
      ) : (
        <VeriTablosu
          kolonlar={baglantiKolonlari}
          satirlar={baglantiSatirlari}
          aramaYerTutucu="Bağlantı veya anchor ara…"
          sayfaBoyutu={50}
        />
      )}
    </>
  );
}
