import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { RAKIP_SEO_ANALIZI } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(RAKIP_SEO_ANALIZI);
}

export default function RakipSeoAnaliziSayfasi() {
  return <PazarlamaSayfasi icerik={RAKIP_SEO_ANALIZI} />;
}
