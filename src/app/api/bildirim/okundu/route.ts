import { NextResponse } from "next/server";

import { sunucuIstemcisi } from "@/lib/supabase/server";

/** Kullanıcının tüm bildirimlerini okundu olarak işaretler. */
export async function POST() {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);

  return NextResponse.json({ tamam: true });
}
