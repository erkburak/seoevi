import { NextResponse } from "next/server";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { DataForSeoHatasi } from "@/lib/dataforseo/client";
import { iliskiliKelimeler, kelimeOnerileri } from "@/lib/dataforseo/keywords";
import { aktifProjeGetir } from "@/lib/projects";
import { firsatSkoru } from "@/lib/scoring";
import { kullanimArtir, limitKontrol } from "@/lib/subscription";
import { harcamaIzni, platformTavaniUygunMu } from "@/lib/guvenlik";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export const maxDuration = 60;

const Sema = z.object({
  tohum: z.string().min(2).max(120),
  tur: z.enum(["oneri", "iliskili"]).default("oneri"),
});

/** Tohum kelimeden anahtar kelime önerileri üretir. */
export async function POST(istek: Request) {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  const sonuc = Sema.safeParse(await istek.json().catch(() => null));
  if (!sonuc.success) return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });

  const izin = await harcamaIzni(user);
  if (!izin.izinli) {
    return NextResponse.json({ hata: izin.mesaj, kod: izin.kod }, { status: 403 });
  }

  const tavan = await platformTavaniUygunMu();
  if (!tavan.uygun) {
    console.error("[guvenlik] günlük platform harcama tavanı aşıldı", { harcanan: tavan.harcanan });
    return NextResponse.json({ hata: "Sistem şu anda yoğun. Birkaç dakika sonra tekrar deneyin." }, { status: 503 });
  }

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return NextResponse.json({ hata: "Aktif proje bulunamadı." }, { status: 400 });

  const limit = await limitKontrol({ kullaniciId: user.id, metrik: "keyword", adet: 1 });
  if (!limit.uygun) {
    return NextResponse.json(
      {
        hata: `Anahtar kelime hakkınız doldu (${limit.limit}). Paketinizi yükselterek devam edebilirsiniz.`,
        limitAsildi: true,
      },
      { status: 429 },
    );
  }

  try {
    const parametreler = {
      keyword: sonuc.data.tohum.trim(),
      locationCode: proje.location_code ?? 2792,
      languageCode: proje.language_code,
      limit: 150,
    };

    const kelimeler =
      sonuc.data.tur === "iliskili"
        ? await iliskiliKelimeler(parametreler)
        : await kelimeOnerileri(parametreler);

    await kullanimArtir({ kullaniciId: user.id, metrik: "keyword" });
    await olayKaydet({
      olay: "keyword_searched",
      kaynak: "arastirma",
      kullaniciId: user.id,
      projeId: proje.id,
      ozellikler: { tohum: sonuc.data.tohum, sonuc: kelimeler.length },
    });

    const zenginlestirilmis = kelimeler
      .filter((k) => (k.arama_hacmi ?? 0) > 0)
      .map((k) => {
        const skor = firsatSkoru({
          aramaHacmi: k.arama_hacmi,
          zorluk: k.zorluk,
          rekabet: k.rekabet,
          mevcutPozisyon: null,
          amac: k.amac,
        });
        return { ...k, firsat: skor.skor, tahmini_trafik: skor.tahminiTrafik };
      })
      .sort((a, b) => b.firsat - a.firsat);

    return NextResponse.json({ kelimeler: zenginlestirilmis });
  } catch (hata) {
    const mesaj =
      hata instanceof DataForSeoHatasi
        ? hata.kullaniciMesaji
        : "Kelime önerileri alınamadı. Birkaç dakika sonra tekrar deneyin.";

    console.error("[kelime] araştırma hatası", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    return NextResponse.json({ hata: mesaj }, { status: 500 });
  }
}
