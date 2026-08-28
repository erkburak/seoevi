import type { Metadata } from "next";
import Link from "next/link";

import { Ayirici, AuthKabugu } from "@/components/auth/kabuk";
import { GirisFormu } from "@/components/auth/formlar";
import { GoogleButonu } from "@/components/auth/google-butonu";

export const metadata: Metadata = {
  title: "Giriş Yap",
  description: "SEO Evi hesabınıza giriş yapın.",
  robots: { index: false, follow: true },
};

export default async function GirisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string }>;
}) {
  const { devam } = await searchParams;
  const hedef = devam && devam.startsWith("/") ? devam : undefined;

  return (
    <AuthKabugu
      baslik="Tekrar hoş geldiniz"
      aciklama="Mağazanızın SEO durumunu görmek için giriş yapın."
      altBaglanti={
        <>
          Hesabınız yok mu?{" "}
          <Link href="/kayit" className="font-medium text-ink-900 underline-offset-4 hover:underline">
            Ücretsiz oluşturun
          </Link>
        </>
      }
    >
      <GoogleButonu devam={hedef ?? "/genel-bakis"} metin="Google ile giriş yap" />
      <Ayirici metin="veya e-posta ile" />
      <GirisFormu devam={hedef} />
    </AuthKabugu>
  );
}
