import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { GOOGLE_SHOPPING_SEO } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(GOOGLE_SHOPPING_SEO);
}

export default function GoogleShoppingSeoSayfasi() {
  return <PazarlamaSayfasi icerik={GOOGLE_SHOPPING_SEO} />;
}
