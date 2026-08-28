import type { Metadata } from "next";
import Link from "next/link";

import { AuthKabugu } from "@/components/auth/kabuk";
import { SifremiUnuttumFormu } from "@/components/auth/formlar";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  description: "SEO Evi hesabınızın şifresini yenileyin.",
  robots: { index: false, follow: false },
};

export default function SifremiUnuttumSayfasi() {
  return (
    <AuthKabugu
      baslik="Şifrenizi yenileyin"
      aciklama="E-posta adresinizi girin, yenileme bağlantısını gönderelim."
      altBaglanti={
        <Link href="/giris" className="font-medium text-ink-900 underline-offset-4 hover:underline">
          Giriş sayfasına dön
        </Link>
      }
    >
      <SifremiUnuttumFormu />
    </AuthKabugu>
  );
}
