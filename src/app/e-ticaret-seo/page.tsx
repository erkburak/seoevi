import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { ETICARET_SEO } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(ETICARET_SEO);
}

export default function EticaretSeoSayfasi() {
  return <PazarlamaSayfasi icerik={ETICARET_SEO} />;
}
