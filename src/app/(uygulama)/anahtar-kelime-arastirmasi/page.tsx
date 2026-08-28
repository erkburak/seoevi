import type { Metadata } from "next";

import { KELIME_SEKMELERI } from "@/config/navigation";
import { KelimeArastirmasi } from "@/components/app/kelime-arastirmasi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Anahtar Kelime Araştırması",
  robots: { index: false, follow: false },
};

export default async function KelimeArastirmasiSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ tohum?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { tohum } = await searchParams;

  return (
    <>
      <SayfaBasligi
        baslik="Anahtar Kelime Araştırması"
        aciklama={`${proje.location_name ?? "Türkiye"} arama verisiyle yeni kelimeler bulun ve takibe alın.`}
      />

      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/anahtar-kelime-arastirmasi" className="mb-6" />

      <KelimeArastirmasi ilkTohum={tohum ?? ""} />
    </>
  );
}
