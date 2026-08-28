import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/brand/logo";
import { BaslangicAkisi } from "@/components/onboarding/akis";
import { aktifProjeGetir, oturumKullanicisi, profilGetir } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Kuruluma Başlayın",
  robots: { index: false, follow: false },
};

export default async function BaslangicSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const kullanici = await oturumKullanicisi();
  const profil = await profilGetir(kullanici.id);

  // Kurulumu tamamlamış ve projesi olan kullanıcıyı panele al.
  if (profil?.onboarded_at) {
    const { aktif } = await aktifProjeGetir(kullanici.id);
    if (aktif) redirect("/genel-bakis");
  }

  const { site } = await searchParams;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-6 sm:px-10">
        <Logo boyut={26} href={null} />
      </header>

      <main id="icerik" className="flex flex-1 items-center px-5 pb-16 sm:px-10">
        <BaslangicAkisi baslangicSitesi={site} />
      </main>
    </div>
  );
}
