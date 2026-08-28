import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { KELIME_SEKMELERI } from "@/config/navigation";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { AmacRozeti, Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { FirsatSkoru } from "@/components/ui/score";
import { FiltreSeridi, Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi } from "@/lib/utils";
import type { FirsatTuru } from "@/types/database";

export const metadata: Metadata = {
  title: "Kelime Fırsatları",
  robots: { index: false, follow: false },
};

const TUR_ETIKET: Record<FirsatTuru, string> = {
  genel: "Genel",
  urun: "Ürün",
  kategori: "Kategori",
  icerik: "İçerik",
  rakip_acigi: "Rakip açığı",
  hizli_kazanim: "Hızlı kazanım",
};

const FILTRELER: { deger: string; etiket: string }[] = [
  { deger: "hepsi", etiket: "Tüm fırsatlar" },
  { deger: "hizli_kazanim", etiket: "Hızlı kazanımlar" },
  { deger: "rakip_acigi", etiket: "Rakip açığı" },
  { deger: "genel", etiket: "Genel" },
];

type FirsatSatiri = {
  id: string;
  score: number;
  potential_traffic: number | null;
  current_position: number | null;
  target_position: number | null;
  reason: string | null;
  opportunity_type: FirsatTuru;
  keywords:
    | { id: string; keyword: string; search_volume: number | null; difficulty: number | null; intent: string | null }
    | { id: string; keyword: string; search_volume: number | null; difficulty: number | null; intent: string | null }[]
    | null;
};

export default async function KelimeFirsatlariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { tur = "hepsi" } = await searchParams;
  const supabase = await sunucuIstemcisi();

  let sorgu = supabase
    .from("keyword_opportunities")
    .select("id, score, potential_traffic, current_position, target_position, reason, opportunity_type, keywords(id, keyword, search_volume, difficulty, intent)")
    .eq("project_id", proje.id)
    .eq("status", "acik")
    .order("score", { ascending: false })
    .limit(500);

  if (tur !== "hepsi") sorgu = sorgu.eq("opportunity_type", tur);

  const { data } = await sorgu;

  const firsatlar = ((data ?? []) as unknown as FirsatSatiri[])
    .map((f) => {
      const k = Array.isArray(f.keywords) ? f.keywords[0] : f.keywords;
      if (!k) return null;
      return {
        id: f.id,
        keywordId: k.id,
        keyword: k.keyword,
        hacim: k.search_volume,
        zorluk: k.difficulty,
        amac: k.intent as never,
        skor: f.score,
        trafik: f.potential_traffic,
        pozisyon: f.current_position,
        hedef: f.target_position,
        gerekce: f.reason,
        tur: f.opportunity_type,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  const yuksek = firsatlar.filter((f) => f.skor >= 75).length;
  const toplamTrafik = firsatlar.reduce((t, f) => t + (f.trafik ?? 0), 0);

  const kolonlar: TabloKolonu[] = [
    { baslik: "Anahtar kelime", sabit: true, genislik: "24%" },
    { baslik: "Fırsat", hizala: "sag", ipucu: "Arama hacmi, rekabet, mevcut sıralamanız ve ticari potansiyel gibi sinyallerden hesaplanır." },
    { baslik: "Hacim", hizala: "sag" },
    { baslik: "Sıra", hizala: "sag" },
    { baslik: "Hedef", hizala: "sag", ipucu: "Ulaşılabilir gördüğümüz sıralama." },
    { baslik: "Tahmini kazanç", hizala: "sag", ipucu: "Hedef sıraya çıkıldığında beklenen aylık ek ziyaret." },
    { baslik: "Amaç" },
    { baslik: "Tür" },
    { baslik: "Gerekçe", siralanabilir: false, mobilGizle: true },
  ];

  const satirlar: TabloSatiri[] = firsatlar.map((f) => ({
    id: f.id,
    href: `/anahtar-kelimeler/${f.keywordId}`,
    degerler: [f.keyword, f.skor, f.hacim, f.pozisyon, f.hedef, f.trafik, f.amac, TUR_ETIKET[f.tur], f.gerekce],
    hucreler: [
      <Link
        key="k"
        href={`/anahtar-kelimeler/${f.keywordId}`}
        className="font-medium text-ink-900 hover:underline"
      >
        {f.keyword}
      </Link>,
      <FirsatSkoru key="s" skor={f.skor} />,
      <span key="h" className="tabular">
        {sayi(f.hacim)}
      </span>,
      <span key="p" className="tabular">
        {f.pozisyon ?? <span className="text-ink-300">—</span>}
      </span>,
      <span key="t" className="tabular text-ink-500">
        {f.hedef ?? "—"}
      </span>,
      <span key="tr" className="tabular font-medium text-positive">
        {f.trafik ? `+${sayi(f.trafik)}` : "—"}
      </span>,
      <AmacRozeti key="a" amac={f.amac} />,
      <Rozet key="tu" ton={f.tur === "hizli_kazanim" ? "olumlu" : f.tur === "rakip_acigi" ? "uyari" : "notr"}>
        {TUR_ETIKET[f.tur]}
      </Rozet>,
      <span key="g" className="block max-w-[280px] text-[12.5px] text-ink-500">
        {f.gerekce ?? "—"}
      </span>,
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Kelime Fırsatları"
        aciklama="Kazanılması en olası kelimeler; hangi sıraya çıkabileceğiniz ve ne kadar trafik getireceğiyle birlikte."
      />

      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/kelime-firsatlari" className="mb-6" />

      {firsatlar.length === 0 ? (
        <BosDurum
          ikon={Sparkles}
          baslik="Henüz fırsat hesaplanmadı."
          aciklama="Site analizini çalıştırdığınızda sıralandığınız kelimeler için fırsat skorları burada listelenir."
          aksiyon={
            <Buton asChild>
              <Link href="/anahtar-kelime-arastirmasi">Kelime Araştır</Link>
            </Buton>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-3">
            <OzetDegeri etiket="Açık fırsat" deger={sayi(firsatlar.length)} />
            <OzetDegeri etiket="Yüksek öncelikli" deger={sayi(yuksek)} ipucu="Fırsat skoru 75 ve üzerindeki kelimeler." />
            <OzetDegeri
              etiket="Toplam kazanç potansiyeli"
              deger={`+${kisaSayi(toplamTrafik)}`}
              ipucu="Tüm fırsatlar hedef sıralarına ulaşırsa beklenen aylık ek ziyaret."
            />
          </div>

          <FiltreSeridi
            ogeler={FILTRELER.map((f) => ({ etiket: f.etiket, href: `/kelime-firsatlari?tur=${f.deger}` }))}
            aktif={`/kelime-firsatlari?tur=${tur}`}
            className="mb-5"
          />

          <VeriTablosu kolonlar={kolonlar} satirlar={satirlar} aramaYerTutucu="Fırsatlarda ara…" sayfaBoyutu={50} />
        </>
      )}
    </>
  );
}
