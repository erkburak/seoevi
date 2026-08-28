import { Layers } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ETICARET_SEKMELERI } from "@/config/navigation";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, sayi, urlYolu } from "@/lib/utils";
import type { Kategori } from "@/types/database";

export const metadata: Metadata = {
  title: "Kategori SEO",
  robots: { index: false, follow: false },
};

export default async function KategoriSeoSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("project_id", proje.id)
    .order("seo_score", { ascending: true, nullsFirst: false })
    .limit(1000);

  const kategoriler = (data ?? []) as Kategori[];
  const zayif = kategoriler.filter((k) => (k.seo_score ?? 0) < 60).length;
  const metinsiz = kategoriler.filter((k) => (k.description_length ?? 0) < 400).length;
  const hedefsiz = kategoriler.filter((k) => !k.target_keyword).length;

  const kolonlar: TabloKolonu[] = [
    { baslik: "Kategori", sabit: true, genislik: "36%" },
    { baslik: "Skor", hizala: "sag" },
    { baslik: "Metin uzunluğu", hizala: "sag", ipucu: "Kategori açıklamasının karakter sayısı; 400+ önerilir." },
    { baslik: "İç bağlantı", hizala: "sag" },
    { baslik: "Hedef kelime" },
  ];

  const satirlar: TabloSatiri[] = kategoriler.map((k) => ({
    id: k.id,
    href: `/kategori-seo/${k.id}`,
    degerler: [
      k.name ?? k.url,
      k.seo_score,
      k.description_length,
      k.internal_links_count,
      k.target_keyword,
    ],
    hucreler: [
      <Link key="k" href={`/kategori-seo/${k.id}`} className="block min-w-0">
        <span className="block truncate font-medium text-ink-900">
          {kirp(k.name, 60) || urlYolu(k.url)}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-400">{urlYolu(k.url)}</span>
      </Link>,
      <span
        key="s"
        className={`tabular rounded-[7px] px-2 py-0.5 text-[13px] font-semibold ${
          (k.seo_score ?? 0) >= 80
            ? "bg-positive-soft text-positive"
            : (k.seo_score ?? 0) >= 55
              ? "bg-caution-soft text-caution"
              : "bg-critical-soft text-critical"
        }`}
      >
        {k.seo_score ?? "—"}
      </span>,
      <span key="m" className={`tabular ${(k.description_length ?? 0) < 400 ? "text-caution" : ""}`}>
        {sayi(k.description_length)}
      </span>,
      <span key="i" className="tabular">
        {sayi(k.internal_links_count)}
      </span>,
      <span key="h" className="text-ink-600">
        {k.target_keyword ?? <span className="text-ink-300">Atanmamış</span>}
      </span>,
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Kategori SEO"
        aciklama="Kategori sayfaları en yüksek hacimli kelimeleri hedefler; içerik derinliği ve iç bağlantı burada belirleyicidir."
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/kategori-seo" className="mb-6" />

      {kategoriler.length === 0 ? (
        <BosDurum
          ikon={Layers}
          baslik="Henüz kategori sayfası bulunamadı."
          aciklama="Site taramasını çalıştırın ya da Ayarlar'dan kategori adres kalıbınızı tanımlayın."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <OzetDegeri etiket="Kategori sayfası" deger={sayi(kategoriler.length)} />
            <OzetDegeri etiket="Skoru düşük" deger={sayi(zayif)} />
            <OzetDegeri
              etiket="Metni yetersiz"
              deger={sayi(metinsiz)}
              ipucu="400 karakterin altında açıklaması olan kategoriler."
            />
            <OzetDegeri etiket="Hedef kelimesi yok" deger={sayi(hedefsiz)} />
          </div>

          <VeriTablosu kolonlar={kolonlar} satirlar={satirlar} aramaYerTutucu="Kategori ara…" sayfaBoyutu={50} />
        </>
      )}
    </>
  );
}
