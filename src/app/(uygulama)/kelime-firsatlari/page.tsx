import { Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { KELIME_SEKMELERI } from "@/config/navigation";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { YukseltmeDuvari } from "@/components/app/yukseltme-duvari";
import { AmacRozeti, Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { SiraHucresi } from "@/components/app/sira-hucresi";
import { FirsatSkoru } from "@/components/ui/score";
import { FiltreSeridi, Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu, sonrakiPlan } from "@/lib/subscription";
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

type KelimeAlani = {
  id: string;
  keyword: string;
  search_volume: number | null;
  difficulty: number | null;
  intent: string | null;
  is_tracked: boolean;
};

type FirsatSatiri = {
  id: string;
  score: number;
  potential_traffic: number | null;
  current_position: number | null;
  target_position: number | null;
  reason: string | null;
  opportunity_type: FirsatTuru;
  keywords: KelimeAlani | KelimeAlani[] | null;
};

export default async function KelimeFirsatlariSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { kullanici, proje } = await projeBaglami();
  const { tur = "hepsi" } = await searchParams;
  const supabase = await sunucuIstemcisi();

  let sorgu = supabase
    .from("keyword_opportunities")
    .select("id, score, potential_traffic, current_position, target_position, reason, opportunity_type, keywords(id, keyword, search_volume, difficulty, intent, is_tracked)")
    .eq("project_id", proje.id)
    .eq("status", "acik")
    .order("score", { ascending: false })
    .limit(500);

  if (tur !== "hepsi") sorgu = sorgu.eq("opportunity_type", tur);

  /*
   * Sıranın ne zaman ölçüldüğü ayrı okunur: "ilk 30'da yok" ile "hiç
   * ölçülmedi" farklı şeylerdir ve tabloda farklı gösterilir.
   */
  const [{ data }, { plan }, { data: olcumler }] = await Promise.all([
    sorgu,
    abonelikDurumu(kullanici.id),
    supabase.from("kelime_ozet").select("id, checked_at").eq("project_id", proje.id).limit(2000),
  ]);

  const olcumZamani = new Map(
    ((olcumler ?? []) as { id: string; checked_at: string | null }[]).map((o) => [o.id, o.checked_at]),
  );
  const hedefPlan = plan ? await sonrakiPlan(plan.id) : null;

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
        olculduAt: olcumZamani.get(k.id) ?? null,
        hedef: f.target_position,
        gerekce: f.reason,
        tur: f.opportunity_type,
        takipte: k.is_tracked,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  /*
   * Fırsatlar, takip edilen kelimelerle sınırlı gösterilir. Paketin
   * dışında kalan kelimelere ait fırsatlar hesaplanmış ve saklanmış
   * durumdadır; istemciye gönderilmez, yalnızca sayısı ve toplam kazanç
   * tahmini yükseltme panelinde gösterilir.
   */
  const gorunenler = firsatlar.filter((f) => f.takipte);
  const gizlenenler = firsatlar.filter((f) => !f.takipte);

  const gizliTrafik = gizlenenler.reduce((t, f) => t + (f.trafik ?? 0), 0);
  const gizliYuksek = gizlenenler.filter((f) => f.skor >= 75).length;

  const yuksek = gorunenler.filter((f) => f.skor >= 75).length;
  const toplamTrafik = gorunenler.reduce((t, f) => t + (f.trafik ?? 0), 0);

  const kolonlar: TabloKolonu[] = [
    { baslik: "Anahtar kelime", sabit: true, genislik: "24%" },
    { baslik: "Fırsat", hizala: "sag", ipucu: "Arama hacmi, rekabet, mevcut sıralamanız ve ticari potansiyel gibi sinyallerden hesaplanır." },
    { baslik: "Hacim", hizala: "sag" },
    {
      baslik: "Sıra",
      hizala: "sag",
      ipucu:
        "Organik sıranız. Her analizde paketinizin izin verdiği sayıda kelime canlı ölçülür; ölçülmeyen kelimede sıra iddia edilmez.",
    },
    { baslik: "Hedef", hizala: "sag", ipucu: "Ulaşılabilir gördüğümüz sıralama." },
    { baslik: "Tahmini kazanç", hizala: "sag", ipucu: "Hedef sıraya çıkıldığında beklenen aylık ek ziyaret." },
    { baslik: "Amaç" },
    { baslik: "Tür" },
    { baslik: "Gerekçe", siralanabilir: false, mobilGizle: true },
  ];

  const satirlar: TabloSatiri[] = gorunenler.map((f) => ({
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
      <SiraHucresi key="p" sira={f.pozisyon} olculduAt={f.olculduAt} />,
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
            <OzetDegeri etiket="Açık fırsat" deger={sayi(gorunenler.length)} />
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

          <YukseltmeDuvari
            gizliSayi={gizlenenler.length}
            baslik={`${sayi(gizlenenler.length)} fırsat daha hesaplandı`}
            aciklama={
              "Bu fırsatlar sitenizin gerçek sıralama verisinden hesaplandı ve hesabınızda duruyor. " +
              "Paketiniz takip ettiğiniz kelimelerin fırsatlarını gösteriyor; yükselttiğinizde kalanlar " +
              "ek analiz gerekmeden açılır."
            }
            olcumler={[
              { etiket: "Gizli fırsat", deger: sayi(gizlenenler.length) },
              {
                etiket: "Tahmini aylık ek ziyaret",
                deger: kisaSayi(gizliTrafik),
                vurgulu: true,
              },
              ...(gizliYuksek > 0
                ? [{ etiket: "Yüksek skorlu (75+)", deger: sayi(gizliYuksek), vurgulu: true }]
                : []),
            ]}
            hedefPlanAdi={hedefPlan?.name ?? null}
          />
        </>
      )}
    </>
  );
}
