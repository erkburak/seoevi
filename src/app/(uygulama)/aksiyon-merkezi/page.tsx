import { ListChecks } from "lucide-react";
import type { Metadata } from "next";

import { AksiyonKarti } from "@/components/app/aksiyon-karti";
import { AksiyonEtkisi, KazancPaneli } from "@/components/app/etki-karti";
import { kazancOzeti, projeEtkileri } from "@/lib/analiz/etki";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { FiltreSeridi } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi } from "@/lib/utils";
import type { SeoAksiyonu } from "@/types/database";

export const metadata: Metadata = {
  title: "Aksiyon Merkezi",
  robots: { index: false, follow: false },
};

const DURUM_FILTRELERI = [
  { deger: "acik", etiket: "Yapılacaklar" },
  { deger: "devam_ediyor", etiket: "Devam edenler" },
  { deger: "tamamlandi", etiket: "Tamamlananlar" },
  { deger: "hepsi", etiket: "Tümü" },
];

const KATEGORI_FILTRELERI = [
  { deger: "hepsi", etiket: "Tüm kategoriler" },
  { deger: "teknik", etiket: "Teknik" },
  { deger: "icerik", etiket: "İçerik" },
  { deger: "keyword", etiket: "Anahtar kelime" },
  { deger: "urun", etiket: "Ürün" },
  { deger: "kategori", etiket: "Kategori" },
  { deger: "merchant", etiket: "Merchant" },
];

export default async function AksiyonMerkeziSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; kategori?: string; aksiyon?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { durum = "acik", kategori = "hepsi", aksiyon: acikAksiyon } = await searchParams;
  const supabase = await sunucuIstemcisi();

  // Tamamlanan aksiyonların sonrasında ne olduğu — mevcut sıralama
  // verisinden okunur, ek sağlayıcı maliyeti yoktur.
  const [etkiler, kazanc] = await Promise.all([
    projeEtkileri(proje.id),
    kazancOzeti(proje.id),
  ]);

  let sorgu = supabase
    .from("seo_actions")
    .select("*")
    .eq("project_id", proje.id)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(200);

  if (durum === "acik") sorgu = sorgu.eq("status", "bekliyor");
  else if (durum !== "hepsi") sorgu = sorgu.eq("status", durum);

  if (kategori !== "hepsi") sorgu = sorgu.eq("category", kategori);

  const [{ data: aksiyonVerisi }, { data: tumDurumlar }] = await Promise.all([
    sorgu,
    supabase.from("seo_actions").select("status, priority, impact").eq("project_id", proje.id).limit(1000),
  ]);

  const aksiyonlar = (aksiyonVerisi ?? []) as SeoAksiyonu[];
  const tumu = tumDurumlar ?? [];

  const bekleyen = tumu.filter((a) => a.status === "bekliyor").length;
  const devamEden = tumu.filter((a) => a.status === "devam_ediyor").length;
  const tamamlanan = tumu.filter((a) => a.status === "tamamlandi").length;
  const kritik = tumu.filter((a) => a.status === "bekliyor" && a.priority === "kritik").length;

  const oncelikSirasi: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };
  const sirali = [...aksiyonlar].sort(
    (a, b) => (oncelikSirasi[a.priority] ?? 9) - (oncelikSirasi[b.priority] ?? 9),
  );

  const filtreBaglantisi = (yeniDurum: string, yeniKategori: string) =>
    `/aksiyon-merkezi?durum=${yeniDurum}&kategori=${yeniKategori}`;

  return (
    <>
      <SayfaBasligi
        baslik="Aksiyon Merkezi"
        aciklama="Bulunan tüm sorunlar ve fırsatlar; önem sırasına göre, tahmini etkisiyle birlikte."
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <div className="mb-7">
        <KazancPaneli ozet={kazanc} />
      </div>

      {tumu.length > 0 ? (
        <div className="mb-7 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
          <OzetDegeri etiket="Yapılacak" deger={sayi(bekleyen)} />
          <OzetDegeri etiket="Kritik öncelikli" deger={sayi(kritik)} />
          <OzetDegeri etiket="Devam eden" deger={sayi(devamEden)} />
          <OzetDegeri etiket="Tamamlanan" deger={sayi(tamamlanan)} />
        </div>
      ) : null}

      <div className="mb-5 space-y-3">
        <FiltreSeridi
          ogeler={DURUM_FILTRELERI.map((f) => ({
            etiket: f.etiket,
            href: filtreBaglantisi(f.deger, kategori),
          }))}
          aktif={filtreBaglantisi(durum, kategori)}
        />
        <FiltreSeridi
          ogeler={KATEGORI_FILTRELERI.map((f) => ({
            etiket: f.etiket,
            href: filtreBaglantisi(durum, f.deger),
          }))}
          aktif={filtreBaglantisi(durum, kategori)}
        />
      </div>

      {sirali.length === 0 ? (
        <BosDurum
          ikon={ListChecks}
          baslik={
            tumu.length === 0
              ? "Henüz aksiyon üretilmedi"
              : "Bu filtreye uyan aksiyon bulunmuyor"
          }
          aciklama={
            tumu.length === 0
              ? "Site analizini çalıştırdığınızda bulunan sorunlar ve fırsatlar burada önceliklendirilmiş bir listeye dönüşür."
              : "Farklı bir durum veya kategori seçerek diğer aksiyonları görebilirsiniz."
          }
          aksiyon={tumu.length === 0 ? <AnaliziYenile projeId={proje.id} boyut="md" /> : null}
        />
      ) : (
        <div className="space-y-2.5">
          {sirali.map((a) => (
            <AksiyonKarti
              key={a.id}
              aksiyon={a}
              baslangictaAcik={a.id === acikAksiyon}
              etki={etkiler.get(a.id) ? <AksiyonEtkisi etki={etkiler.get(a.id)!} /> : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}
