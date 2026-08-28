import type { Metadata } from "next";

import { AuthKabugu } from "@/components/auth/kabuk";
import { SifreYenileFormu } from "@/components/auth/formlar";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle",
  robots: { index: false, follow: false },
};

export default function SifreYenileSayfasi() {
  return (
    <AuthKabugu
      baslik="Yeni şifrenizi belirleyin"
      aciklama="Güvenliğiniz için en az 8 karakterli bir şifre seçin."
    >
      <SifreYenileFormu />
    </AuthKabugu>
  );
}
