import type { Metadata } from "next";
import Link from "next/link";

import { Ayirici, AuthKabugu } from "@/components/auth/kabuk";
import { KayitFormu } from "@/components/auth/formlar";
import { GoogleButonu } from "@/components/auth/google-butonu";

export const metadata: Metadata = {
  title: "Kayıt Ol",
  description:
    "SEO Evi hesabınızı oluşturun ve e-ticaret sitenizin SEO analizini 7 gün ücretsiz deneyin.",
  robots: { index: false, follow: true },
};

export default async function KayitSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; paket?: string }>;
}) {
  const { site, paket } = await searchParams;

  return (
    <AuthKabugu
      baslik="Mağazanızı büyütmeye başlayın"
      aciklama="Hesabınızı oluşturun, ilk analiz birkaç dakika içinde hazır olsun."
      altBaglanti={
        <>
          Zaten hesabınız var mı?{" "}
          <Link href="/giris" className="font-medium text-ink-900 underline-offset-4 hover:underline">
            Giriş yapın
          </Link>
        </>
      }
    >
      <GoogleButonu devam="/baslangic" metin="Google ile kayıt ol" />
      <Ayirici metin="veya e-posta ile" />
      <KayitFormu site={site} paket={paket} />
    </AuthKabugu>
  );
}
