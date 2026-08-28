import { NextResponse, type NextRequest } from "next/server";

import { sunucuIstemcisi } from "@/lib/supabase/server";

/**
 * OAuth ve e-posta doğrulama dönüş noktası.
 * Kod oturuma çevrilir, ardından hedef sayfaya yönlendirilir.
 */
export async function GET(istek: NextRequest) {
  const { searchParams, origin } = istek.nextUrl;
  const kod = searchParams.get("code");
  const devamParam = searchParams.get("devam");
  const hataAciklamasi = searchParams.get("error_description");

  const devam = devamParam && devamParam.startsWith("/") ? devamParam : "/genel-bakis";

  if (hataAciklamasi) {
    console.error("[auth] sağlayıcı hatası", { mesaj: hataAciklamasi });
    return NextResponse.redirect(`${origin}/giris?hata=saglayici`);
  }

  if (!kod) {
    return NextResponse.redirect(`${origin}/giris?hata=eksik_kod`);
  }

  const supabase = await sunucuIstemcisi();
  const { data, error } = await supabase.auth.exchangeCodeForSession(kod);

  if (error) {
    console.error("[auth] oturum oluşturulamadı", { mesaj: error.message });
    return NextResponse.redirect(`${origin}/giris?hata=oturum`);
  }

  // Kurulumunu tamamlamamış kullanıcıyı başlangıç akışına al.
  if (data.user) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profil?.onboarded_at && devam === "/genel-bakis") {
      return NextResponse.redirect(`${origin}/baslangic`);
    }
  }

  return NextResponse.redirect(`${origin}${devam}`);
}
