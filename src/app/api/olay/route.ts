import { NextResponse } from "next/server";
import { z } from "zod";

import { OLAYLAR, olayKaydet, type OlayAdi } from "@/lib/analytics";
import { sunucuIstemcisi } from "@/lib/supabase/server";

const Sema = z.object({
  olay: z.enum(OLAYLAR),
  kaynak: z.string().max(64).optional(),
  ozellikler: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

/** İstemci tarafı olay kaydı — yalnızca izin verilen olay adları kabul edilir. */
export async function POST(istek: Request) {
  try {
    const gövde = await istek.json();
    const sonuc = Sema.safeParse(gövde);
    if (!sonuc.success) {
      return NextResponse.json({ tamam: false }, { status: 400 });
    }

    const supabase = await sunucuIstemcisi();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await olayKaydet({
      olay: sonuc.data.olay as OlayAdi,
      kaynak: sonuc.data.kaynak,
      kullaniciId: user?.id ?? null,
      ozellikler: sonuc.data.ozellikler ?? {},
    });

    return NextResponse.json({ tamam: true });
  } catch {
    return NextResponse.json({ tamam: false }, { status: 400 });
  }
}
