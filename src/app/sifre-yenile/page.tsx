import type { Metadata } from "next";
import Link from "next/link";

import { AuthKabugu } from "@/components/auth/kabuk";
import { SifreYenileFormu } from "@/components/auth/formlar";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle",
  robots: { index: false, follow: false },
};

export default async function SifreYenileSayfasi() {
  /*
   * Şifre değiştirmek oturum gerektirir: bağlantıdaki kod
   * /auth/callback tarafından oturuma çevrilir. Oturum yoksa form
   * çalışmaz — kullanıcıya boş bir form gösterip sessizce başarısız
   * olmak yerine ne olduğu ve ne yapacağı söylenir.
   *
   * Oturumun düşmesinin en yaygın nedeni, bağlantının istendiği
   * tarayıcıdan farklı bir tarayıcıda açılmasıdır.
   */
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <AuthKabugu
        baslik="Bağlantı doğrulanamadı"
        aciklama="Şifre yenileme bağlantısı geçersiz ya da süresi dolmuş olabilir."
      >
        <Uyari ton="uyari">
          Şifre yenileme bağlantıları kısa süre geçerlidir ve yalnızca isteği yaptığınız
          tarayıcıda açıldığında çalışır. Bağlantıyı başka bir cihazda veya tarayıcıda
          açtıysanız yeni bir bağlantı istemeniz gerekir.
        </Uyari>

        <div className="mt-5">
          <Buton asChild tamGenislik>
            <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
          </Buton>
        </div>

        <p className="mt-4 text-center text-[13px] text-ink-500">
          Şifrenizi hatırladınız mı?{" "}
          <Link href="/giris" className="font-medium text-ink-900 underline-offset-2 hover:underline">
            Giriş yapın
          </Link>
        </p>
      </AuthKabugu>
    );
  }

  return (
    <AuthKabugu
      baslik="Yeni şifrenizi belirleyin"
      aciklama="Güvenliğiniz için en az 8 karakterli bir şifre seçin."
    >
      <SifreYenileFormu />
    </AuthKabugu>
  );
}
