import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ETICARET_SEKMELERI } from "@/config/navigation";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kirp, para, sayi, urlYolu } from "@/lib/utils";
import type { Urun } from "@/types/database";

export const metadata: Metadata = {
  title: "Ürün SEO",
  robots: { index: false, follow: false },
};

export default async function UrunSeoSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("project_id", proje.id)
    .order("seo_score", { ascending: true, nullsFirst: false })
    .limit(2000);

  const urunler = (data ?? []) as Urun[];

  const schemasiz = urunler.filter((u) => !u.has_product_schema).length;
  const gtinsiz = urunler.filter((u) => !u.gtin).length;
  const zayif = urunler.filter((u) => (u.seo_score ?? 0) < 60).length;

  const kolonlar: TabloKolonu[] = [
    { baslik: "Ürün", sabit: true, genislik: "34%" },
    { baslik: "Skor", hizala: "sag", ipucu: "19 maddelik e-ticaret kontrol listesinden hesaplanır." },
    { baslik: "Schema", hizala: "sag" },
    { baslik: "GTIN", hizala: "sag" },
    { baslik: "Marka" },
    { baslik: "Fiyat", hizala: "sag" },
    { baslik: "Görsel", hizala: "sag" },
  ];

  const satirlar: TabloSatiri[] = urunler.map((u) => ({
    id: u.id,
    href: `/urun-seo/${u.id}`,
    degerler: [
      u.name ?? u.url,
      u.seo_score,
      u.has_product_schema ? 1 : 0,
      u.gtin ? 1 : 0,
      u.brand,
      u.price,
      u.images_count,
    ],
    hucreler: [
      <Link key="u" href={`/urun-seo/${u.id}`} className="block min-w-0">
        <span className="block truncate font-medium text-ink-900">
          {kirp(u.name, 60) || urlYolu(u.url)}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-400">{urlYolu(u.url)}</span>
      </Link>,
      <span
        key="s"
        className={`tabular rounded-[7px] px-2 py-0.5 text-[13px] font-semibold ${
          (u.seo_score ?? 0) >= 80
            ? "bg-positive-soft text-positive"
            : (u.seo_score ?? 0) >= 55
              ? "bg-caution-soft text-caution"
              : "bg-critical-soft text-critical"
        }`}
      >
        {u.seo_score ?? "—"}
      </span>,
      u.has_product_schema ? (
        <Rozet key="sc" ton="olumlu">
          Var
        </Rozet>
      ) : (
        <Rozet key="sc" ton="kritik">
          Yok
        </Rozet>
      ),
      u.gtin ? (
        <Rozet key="g" ton="olumlu">
          Var
        </Rozet>
      ) : (
        <Rozet key="g" ton="uyari">
          Yok
        </Rozet>
      ),
      <span key="m" className="text-ink-600">
        {u.brand ?? <span className="text-ink-300">—</span>}
      </span>,
      <span key="f" className="tabular">
        {u.price ? para(u.price, u.currency ?? "TRY") : <span className="text-ink-300">—</span>}
      </span>,
      <span key="gr" className="tabular">
        {sayi(u.images_count)}
      </span>,
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Ürün SEO"
        aciklama="Her ürün sayfası; başlık, açıklama, yapısal veri ve Merchant alanları açısından ayrı ayrı puanlanır."
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/urun-seo" className="mb-6" />

      {urunler.length === 0 ? (
        <BosDurum
          ikon={Boxes}
          baslik="Henüz ürün sayfası bulunamadı."
          aciklama="Site taramasını çalıştırın ya da Ayarlar'dan ürün adres kalıbınızı tanımlayın."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <OzetDegeri etiket="Ürün sayfası" deger={sayi(urunler.length)} />
            <OzetDegeri etiket="Skoru düşük" deger={sayi(zayif)} ipucu="SEO skoru 60'ın altındaki ürünler." />
            <OzetDegeri
              etiket="Yapısal verisi yok"
              deger={sayi(schemasiz)}
              ipucu="Product schema olmadan zengin sonuç ve Alışveriş görünürlüğü elde edilemez."
            />
            <OzetDegeri
              etiket="GTIN eksik"
              deger={sayi(gtinsiz)}
              ipucu="GTIN, Google Alışveriş eşleştirmesinin en güçlü sinyalidir."
            />
          </div>

          <VeriTablosu kolonlar={kolonlar} satirlar={satirlar} aramaYerTutucu="Ürün ara…" sayfaBoyutu={50} />
        </>
      )}
    </>
  );
}
