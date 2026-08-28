import type { Metadata } from "next";

import { KELIME_SEKMELERI } from "@/config/navigation";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { SerpAraci } from "@/components/app/serp-araci";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";

export const metadata: Metadata = {
  title: "SERP Analizi",
  robots: { index: false, follow: false },
};

export default async function SerpAnaliziSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ kelime?: string }>;
}) {
  const { proje } = await projeBaglami();
  const { kelime } = await searchParams;

  return (
    <>
      <SayfaBasligi
        baslik="SERP Analizi"
        aciklama={`Herhangi bir kelimenin ${proje.location_name ?? "Türkiye"} arama sonuçlarını inceleyin; kimin sıralandığını ve hangi alanların açık olduğunu görün.`}
      />

      <Sekmeler ogeler={KELIME_SEKMELERI} aktif="/serp-analizi" className="mb-6" />

      <SerpAraci ilkKelime={kelime ?? ""} />
    </>
  );
}
