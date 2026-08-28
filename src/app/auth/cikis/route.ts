import { NextResponse, type NextRequest } from "next/server";

import { sunucuIstemcisi } from "@/lib/supabase/server";

/** Oturumu sonlandırır. */
export async function POST(istek: NextRequest) {
  const supabase = await sunucuIstemcisi();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/giris", istek.nextUrl.origin), { status: 303 });
}
