import type { Metadata } from "next";

import { PazarlamaSayfasi, pazarlamaMetadata } from "@/components/marketing/pazarlama-sayfasi";
import { ANAHTAR_KELIME_ARACI } from "@/config/pazarlama-icerikleri";

export async function generateMetadata(): Promise<Metadata> {
  return pazarlamaMetadata(ANAHTAR_KELIME_ARACI);
}

export default function AnahtarKelimeAraciSayfasi() {
  return <PazarlamaSayfasi icerik={ANAHTAR_KELIME_ARACI} />;
}
