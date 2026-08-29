import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BaglantiDurumu } from "@/components/auth/baglanti-durumu";
import { AuthKabugu } from "@/components/auth/kabuk";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Bağlantı doğrulanıyor",
  robots: { index: false, follow: false },
};

/**
 * Sağlayıcı dönüş noktası — OAuth, e-posta doğrulama ve şifre yenileme.
 *
 * Burası bilerek bir SAYFA, rota işleyicisi değil. Supabase bazı akışlarda
 * oturum bilgisini ve hataları sorgu parametresi olarak değil ADRES
 * PARÇASI olarak döndürür ("#access_token=…", "#error=otp_expired").
 * Adres parçası sunucuya hiç gönderilmez ve sunucu yönlendirmesinde de
 * kaybolur; okunabileceği tek yer tarayıcıdır. Rota işleyicisi HTML
 * döndüremediği için bu durum sessizce kayboluyordu: kullanıcı şifre
 * ekranı yerine ana sayfaya düşüyordu.
 *
 * Kod sorgu parametresiyle geldiğinde (PKCE) iş yine sunucuda biter;
 * yalnızca parçalı durumlar tarayıcıya bırakılır.
 */
export default async function AuthCallbackSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; devam?: string; error_description?: string }>;
}) {
  const { code, devam: devamParam, error_description: hataAciklamasi } = await searchParams;
  const devam = devamParam && devamParam.startsWith("/") ? devamParam : "/genel-bakis";

  if (hataAciklamasi) {
    console.error("[auth] sağlayıcı hatası", { mesaj: hataAciklamasi });
    redirect("/giris?hata=saglayici");
  }

  if (code) {
    const supabase = await sunucuIstemcisi();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth] oturum oluşturulamadı", { mesaj: error.message });
      redirect("/giris?hata=oturum");
    }

    // Kurulumunu tamamlamamış kullanıcıyı başlangıç akışına al.
    if (data.user) {
      const { data: profil } = await supabase
        .from("profiles")
        .select("onboarded_at")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profil?.onboarded_at && devam === "/genel-bakis") {
        redirect("/baslangic");
      }
    }

    redirect(devam);
  }

  // Kod yok: durum adres parçasında olabilir; çözümlemeyi tarayıcı yapar.
  return (
    <AuthKabugu baslik="Bağlantı doğrulanıyor" aciklama="Bir saniye…">
      <BaglantiDurumu />
    </AuthKabugu>
  );
}
