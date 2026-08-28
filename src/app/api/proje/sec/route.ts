import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { AKTIF_PROJE_COOKIE, projeSahibiMi } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";

const Sema = z.object({ projeId: z.string().uuid() });

/** Aktif projeyi değiştirir. */
export async function POST(istek: Request) {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  const sonuc = Sema.safeParse(await istek.json().catch(() => null));
  if (!sonuc.success) return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });

  const sahip = await projeSahibiMi(sonuc.data.projeId, user.id);
  if (!sahip) return NextResponse.json({ hata: "Bu projeye erişiminiz yok." }, { status: 403 });

  const cerezler = await cookies();
  cerezler.set(AKTIF_PROJE_COOKIE, sonuc.data.projeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return NextResponse.json({ tamam: true });
}
