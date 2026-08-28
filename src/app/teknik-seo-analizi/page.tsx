import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { TEKNIK_SEO_ANALIZI } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(TEKNIK_SEO_ANALIZI);
}

export default function TeknikSeoAnaliziSayfasi() {
  return <PazarlamaSayfasi icerik={TEKNIK_SEO_ANALIZI} />;
}
