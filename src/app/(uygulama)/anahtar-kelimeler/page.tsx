import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { KELIME_SEKMELERI } from "@/config/navigation";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { YukseltmeDuvari } from "@/components/app/yukseltme-duvari";
import { Sparkline } from "@/components/charts";
import { AmacRozeti } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { VeriTablosu, type TabloKolonu, type TabloSatiri } from "@/components/ui/data-table";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { FirsatSkoru, PozisyonDegisimi } from "@/components/ui/score";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu, sonrakiPlan } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi, urlYolu } from "@/lib/utils";
import { SiraHucresi } from "@/components/app/sira-hucresi";
import type { KelimeOzeti } from "@/types/database";

export const metadata: Metadata = {
  title: "Anahtar Kelimeler",
  robots: { index: false, follow: false },
};

export default async function AnahtarKelimelerSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ data }, { plan }] = await Promise.all([
    supabase
      .from("kelime_ozet")
      .select("*")
      .eq("project_id", proje.id)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(1000),
    abonelikDurumu(kullanici.id),
  ]);

  const tumKelimeler = (data ?? []) as KelimeOzeti[];

  /*
   * Analiz, paketin izin verdiğinden çok daha fazla kelime bulur ve hepsi
   * saklanır. Yalnızca takibe alınanlar gösterilir; gerisi istemciye hiç
   * gönderilmez, sayısı ve toplam değeri sunucuda hesaplanıp yükseltme
   * panelinde gösterilir.
   */
  const kelimeler = tumKelimeler.filter((k) => k.is_tracked);
  const gizlenenler = tumKelimeler.filter((k) => !k.is_tracked);

  const gizliHacim = gizlenenler.reduce((t, k) => t + (k.search_volume ?? 0), 0);
  const gizliVurmaMesafesi = gizlenenler.filter(
    (k) => k.position !== null && k.position > 10 && k.position <= 20,
  ).length;

  const hedefPlan = plan ? await sonrakiPlan(plan.id) : null;

  // Ölçülmüş kelime: sırası bilinen VEYA "ilk 30'da yok" diye ölçülmüş olan.
  const olculen = kelimeler.filter((k) => k.checked_at !== null).length;
  const siralanan = kelimeler.filter((k) => k.position !== null);
  const ilkOn = siralanan.filter((k) => (k.position ?? 99) <= 10).length;
  const ilkUc = siralanan.filter((k) => (k.position ?? 99) <= 3).length;
  const toplamHacim = kelimeler.reduce((t, k) => t + (k.search_volume ?? 0), 0);

  const kolonlar: TabloKolonu[] = [
    { baslik: "Anahtar kelime", sabit: true, genislik: "26%" },
    { baslik: "Hacim", hizala: "sag", ipucu: "Aylık ortalama arama sayısı." },
    {
      baslik: "Sıra",
      hizala: "sag",
      ipucu:
        "Google'daki organik sıranız. Her analizde paketinizin izin verdiği sayıda kelime için canlı ölçülür; ölçülmeyen kelimede sıra iddia edilmez.",
    },
    { baslik: "Değişim", hizala: "sag", ipucu: "Bir önceki ölçüme göre sıra değişimi." },
    { baslik: "Zorluk", hizala: "sag", ipucu: "0-100 arası; yüksek değer daha zor sıralanma anlamına gelir." },
    { baslik: "Amaç", ipucu: "Kullanıcının bu aramadaki niyeti." },
    { baslik: "Trend", siralanabilir: false, mobilGizle: true },
    { baslik: "Fırsat", hizala: "sag", ipucu: "Bu kelimede kazanç elde etme potansiyeliniz." },
    { baslik: "Adres", mobilGizle: true },
  ];

  const satirlar: TabloSatiri[] = kelimeler.map((k) => ({
    id: k.id,
    href: `/anahtar-kelimeler/${k.id}`,
    degerler: [
      k.keyword,
      k.search_volume,
      k.position,
      k.previous_position !== null && k.position !== null ? k.previous_position - k.position : null,
      k.difficulty,
      k.intent,
      null,
      k.opportunity_score,
      k.url,
    ],
    hucreler: [
      <Link
        key="kelime"
        href={`/anahtar-kelimeler/${k.id}`}
        className="font-medium text-ink-900 hover:underline"
      >
        {k.keyword}
      </Link>,
      <span key="hacim" className="tabular">
        {sayi(k.search_volume)}
      </span>,
      <SiraHucresi key="sira" sira={k.position} olculduAt={k.checked_at} />,
      <PozisyonDegisimi key="degisim" simdiki={k.position} onceki={k.previous_position} />,
      <span key="zorluk" className="tabular">
        {k.difficulty ?? <span className="text-ink-300">—</span>}
      </span>,
      <AmacRozeti key="amac" amac={k.intent} />,
      k.trend?.length > 1 ? (
        <Sparkline key="trend" degerler={k.trend.map((t) => t.hacim)} />
      ) : (
        <span key="trend" className="text-ink-300">
          —
        </span>
      ),
      k.opportunity_score !== null ? (
        <FirsatSkoru key="firsat" skor={k.opportunity_score} />
      ) : (
        <span key="firsat" className="text-ink-300">
          —
        </span>
      ),
      k.url ? (
        <a
          key="adres"
          href={k.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block max-w-[220px] truncate text-ink-500 hover:text-ink-900"
        >
          {urlYolu(k.url)}
        </a>
      ) : (
        <span key="adres" className="text-ink-300">
          —
        </span>
      ),
    ],
  }));

  return (
    <>
      <SayfaBasligi
        baslik="Anahtar Kelimeler"
        aciklama={`${proje.domain} için takip edilen kelimeler ve güncel sıralamalar.`}
        aksiyon={
          <Buton asChild gorunum="ikincil">
            <Link href="/anahtar-kelime-arastirmasi">
              <Search aria-hidden />
              Yeni Kelime Araştır
            </Link>
          </Buton>
        }
      />

      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/anahtar-kelimeler" className="mb-6" />

      {tumKelimeler.length === 0 ? (
        <BosDurum
          ikon={Search}
          baslik="Henüz anahtar kelime bulunmuyor."
          aciklama="İlk kelime araştırmanızı başlatın veya site analizini çalıştırarak sıralandığınız kelimeleri getirin."
          aksiyon={
            <Buton asChild>
              <Link href="/anahtar-kelime-arastirmasi">Kelime Araştır</Link>
            </Buton>
          }
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
            <OzetDegeri
              etiket="Sırası ölçülen"
              deger={`${sayi(olculen)} / ${sayi(kelimeler.length)}`}
              ipucu="Takip edilen kelimelerden kaçının sırası son analizde canlı olarak ölçüldüğü. Ölçülmeyen kelimeler için sıra iddia edilmez."
            />
            <OzetDegeri
              etiket="İlk 10'da"
              deger={sayi(ilkOn)}
              ipucu="Ölçülen kelimelerden kaçının Google'ın ilk sayfasında sıralandığı."
            />
            <OzetDegeri
              etiket="İlk 3'te"
              deger={sayi(ilkUc)}
              ipucu="Ölçülen kelimelerden kaçının ilk üç sonuçta sıralandığı."
            />
            <OzetDegeri
              etiket="Toplam arama hacmi"
              deger={kisaSayi(toplamHacim)}
              ipucu="Takip edilen kelimelerin aylık toplam arama hacmi."
            />
          </div>

          <VeriTablosu
            kolonlar={kolonlar}
            satirlar={satirlar}
            aramaYerTutucu="Anahtar kelime ara…"
            sayfaBoyutu={50}
          />

          <YukseltmeDuvari
            gizliSayi={gizlenenler.length}
            baslik={`${sayi(gizlenenler.length)} kelime daha bulundu`}
            aciklama={
              `Sitenizin sıralandığı kelimeleri tamamen taradık; paketiniz ${sayi(kelimeler.length)} kelimeyi ` +
              `takip etmenize izin veriyor. Kalanlar hesabınızda duruyor, paketinizi yükselttiğinizde ek analiz ` +
              `gerekmeden açılır.`
            }
            olcumler={[
              { etiket: "Gizli kelime", deger: sayi(gizlenenler.length) },
              { etiket: "Aylık toplam arama", deger: kisaSayi(gizliHacim), vurgulu: true },
              ...(gizliVurmaMesafesi > 0
                ? [
                    {
                      etiket: "İlk sayfaya yakın (11-20)",
                      deger: sayi(gizliVurmaMesafesi),
                      vurgulu: true,
                    },
                  ]
                : []),
            ]}
            hedefPlanAdi={hedefPlan?.name ?? null}
          />
        </>
      )}
    </>
  );
}
