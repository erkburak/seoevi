import { NextResponse } from "next/server";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { AiHatasi, aiHazirMi } from "@/lib/ai/saglayici";
import {
  aksiyonuCoz,
  icerikStratejisiUret,
  sayfayiAnaliz,
  urunuAnaliz,
} from "@/lib/ai/gorevler";
import { harcamaIzni } from "@/lib/guvenlik";
import { aktifProjeGetir } from "@/lib/projects";
import { kullanimArtir, limitKontrol } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export const maxDuration = 60;

const Sema = z.discriminatedUnion("gorev", [
  z.object({ gorev: z.literal("aksiyon"), aksiyonId: z.string().uuid() }),
  z.object({ gorev: z.literal("sayfa"), sayfaId: z.string().uuid() }),
  z.object({ gorev: z.literal("urun"), urunId: z.string().uuid() }),
  z.object({ gorev: z.literal("icerik"), keyword: z.string().min(1).max(120) }),
]);

/**
 * Yapay zekâ görevlerinin tek giriş noktası.
 * Sağlayıcı bilgisi ve anahtarlar yalnızca sunucuda kalır.
 */
export async function POST(istek: Request) {
  if (!aiHazirMi()) {
    return NextResponse.json(
      { hata: "Yapay zekâ önerileri şu anda kullanılamıyor." },
      { status: 503 },
    );
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) {
    return NextResponse.json({ hata: yazmaEngeli }, { status: 403 });
  }


  const sonuc = Sema.safeParse(await istek.json().catch(() => null));
  if (!sonuc.success) return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });

  const izin = await harcamaIzni(user);
  if (!izin.izinli) {
    return NextResponse.json({ hata: izin.mesaj, kod: izin.kod }, { status: 403 });
  }

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return NextResponse.json({ hata: "Aktif proje bulunamadı." }, { status: 400 });

  const limit = await limitKontrol({ kullaniciId: user.id, metrik: "ai" });
  if (!limit.uygun) {
    return NextResponse.json(
      {
        hata: `Bu ay ${limit.limit} yapay zekâ analizi hakkınızı kullandınız. Paketinizi yükselterek devam edebilirsiniz.`,
        limitAsildi: true,
      },
      { status: 429 },
    );
  }

  try {
    let veri: unknown;

    switch (sonuc.data.gorev) {
      case "aksiyon":
        veri = await aksiyonuCoz({ aksiyonId: sonuc.data.aksiyonId, proje });
        break;
      case "sayfa":
        veri = await sayfayiAnaliz({ sayfaId: sonuc.data.sayfaId, proje });
        break;
      case "urun":
        veri = await urunuAnaliz({ urunId: sonuc.data.urunId, proje });
        break;
      case "icerik":
        veri = await icerikStratejisiUret({ keyword: sonuc.data.keyword, proje });
        break;
    }

    await kullanimArtir({ kullaniciId: user.id, metrik: "ai" });
    await olayKaydet({
      olay: "ai_action_used",
      kaynak: sonuc.data.gorev,
      kullaniciId: user.id,
      projeId: proje.id,
    });

    return NextResponse.json({ veri });
  } catch (hata) {
    const mesaj =
      hata instanceof AiHatasi
        ? hata.kullaniciMesaji
        : "Öneri üretilirken bir sorun oluştu. Birkaç dakika sonra tekrar deneyin.";

    console.error("[ai] görev hatası", {
      gorev: sonuc.data.gorev,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    return NextResponse.json({ hata: mesaj }, { status: 500 });
  }
}
