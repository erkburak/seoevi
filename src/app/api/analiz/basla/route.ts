import { after, NextResponse } from "next/server";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { isOlustur } from "@/lib/jobs/runner";
import { isiIlerlet } from "@/lib/jobs/runner";
import { IS_TURLERI } from "@/lib/jobs/types";
import { projeSahibiMi } from "@/lib/projects";
import { limitKontrol } from "@/lib/subscription";
import { eszamanliIsUygunMu, harcamaIzni, platformTavaniUygunMu } from "@/lib/guvenlik";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export const maxDuration = 60;

const Sema = z.object({
  projeId: z.string().uuid(),
  tur: z.enum(IS_TURLERI).default("tam_analiz"),
});

/** Analiz işi oluşturur ve arka planda ilerletmeye başlar. */
export async function POST(istek: Request) {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {

  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) {
    return NextResponse.json({ hata: yazmaEngeli }, { status: 403 });
  }

    return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });
  }

  let govde: unknown;
  try {
    govde = await istek.json();
  } catch {
    return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const sonuc = Sema.safeParse(govde);
  if (!sonuc.success) {
    return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

  const sahip = await projeSahibiMi(sonuc.data.projeId, user.id);
  if (!sahip) {
    return NextResponse.json({ hata: "Bu projeye erişiminiz yok." }, { status: 403 });
  }

  // Hesap maliyetli işlem yapmaya uygun mu? (e-posta doğrulaması, abonelik)
  const izin = await harcamaIzni(user);
  if (!izin.izinli) {
    return NextResponse.json({ hata: izin.mesaj, kod: izin.kod }, { status: 403 });
  }

  // Tek hesabın kuyruğu doldurmasını engelle.
  const eszamanli = await eszamanliIsUygunMu(user.id);
  if (!eszamanli.uygun) {
    return NextResponse.json(
      { hata: `Aynı anda en fazla ${eszamanli.calisan} analiz çalıştırabilirsiniz. Mevcut analiz bitince tekrar deneyin.` },
      { status: 429 },
    );
  }

  // Platform genelinde günlük harcama tavanı — son emniyet valfi.
  const tavan = await platformTavaniUygunMu();
  if (!tavan.uygun) {
    console.error("[guvenlik] günlük platform harcama tavanı aşıldı", { harcanan: tavan.harcanan });
    return NextResponse.json(
      { hata: "Sistem şu anda yoğun. Analiziniz kısa süre içinde başlatılabilecek." },
      { status: 503 },
    );
  }

  // Maliyetli işlemler için plan limiti sunucu tarafında kontrol edilir.
  if (sonuc.data.tur === "tam_analiz" || sonuc.data.tur === "onpage") {
    const limit = await limitKontrol({ kullaniciId: user.id, metrik: "site_taramasi" });
    if (!limit.uygun) {
      return NextResponse.json(
        {
          hata: `Bu ay ${limit.limit} site taraması hakkınızı kullandınız. Paketinizi yükselterek devam edebilirsiniz.`,
          limitAsildi: true,
        },
        { status: 429 },
      );
    }
  }

  try {
    const is = await isOlustur({
      projeId: sonuc.data.projeId,
      kullaniciId: user.id,
      tur: sonuc.data.tur,
    });

    await olayKaydet({
      olay: "audit_started",
      kaynak: "uygulama",
      kullaniciId: user.id,
      projeId: sonuc.data.projeId,
      ozellikler: { tur: sonuc.data.tur },
    });

    // Yanıtı bekletmeden işi ilerletmeye başla.
    after(async () => {
      try {
        await isiIlerlet(is.id);
      } catch (hata) {
        console.error("[analiz] arka plan hatası", {
          isId: is.id,
          mesaj: hata instanceof Error ? hata.message : String(hata),
        });
      }
    });

    return NextResponse.json({ isId: is.id, durum: is.status });
  } catch (hata) {
    console.error("[analiz] başlatılamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return NextResponse.json(
      { hata: "Analiz başlatılamadı. Birkaç dakika sonra tekrar deneyin." },
      { status: 500 },
    );
  }
}
