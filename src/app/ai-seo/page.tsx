import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { AI_SEO } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(AI_SEO);
}

export default function AiSeoSayfasi() {
  return <PazarlamaSayfasi icerik={AI_SEO} />;
}
