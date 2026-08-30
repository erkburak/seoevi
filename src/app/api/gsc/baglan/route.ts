import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { gscHazirMi, yetkilendirmeAdresi } from "@/lib/gsc/client";
import { aktifProjeGetir } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { SITE } from "@/config/site";

/**
 * Kullanıcıyı Google onay ekranına yönlendirir.
 *
 * CSRF koruması: rastgele bir `state` üretilip httpOnly çerezde saklanır
 * ve dönüşte karşılaştırılır. Böylece saldırgan başkasının hesabını
 * bağlayamaz.
 */
export async function GET() {
  if (!gscHazirMi()) {
    return NextResponse.json(
      { hata: "Search Console entegrasyonu yapılandırılmamış." },
      { status: 503 },
    );
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/giris", SITE.url));

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) {
    return NextResponse.redirect(new URL("/projeler/yeni", SITE.url));
  }

  const durum = randomBytes(24).toString("hex");

  const cerezler = await cookies();
  cerezler.set("gsc_state", `${durum}:${proje.id}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 dakika
  });

  return NextResponse.redirect(yetkilendirmeAdresi(durum));
}
