import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { SEO_ARACI } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(SEO_ARACI);
}

export default function SeoAraciSayfasi() {
  return <PazarlamaSayfasi icerik={SEO_ARACI} />;
}
