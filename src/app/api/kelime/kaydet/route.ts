import { NextResponse } from "next/server";
import { z } from "zod";

import { aktifProjeGetir } from "@/lib/projects";
import { firsatSkoru } from "@/lib/scoring";
import { takipKelimeLimiti } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";

const Sema = z.object({
  kelimeler: z
    .array(
      z.object({
        keyword: z.string().min(1).max(160),
        arama_hacmi: z.number().nullable(),
        cpc: z.number().nullable(),
        rekabet: z.number().nullable(),
        zorluk: z.number().nullable(),
        amac: z.enum(["bilgi", "ticari", "islem", "gezinme"]).nullable(),
      }),
    )
    .min(1)
    .max(200),
});

/** Seçilen kelimeleri takip listesine ekler. */
export async function POST(istek: Request) {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  const sonuc = Sema.safeParse(await istek.json().catch(() => null));
  if (!sonuc.success) return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return NextResponse.json({ hata: "Aktif proje bulunamadı." }, { status: 400 });

  const yonetici = yoneticiIstemcisi();

  // Takip limiti `anahtar_kelime` alanından gelir; aylık araştırma
  // çalıştırma hakkıyla karıştırılmamalıdır.
  const takip = await takipKelimeLimiti(user.id, proje.id);

  if (takip.mevcut + sonuc.data.kelimeler.length > takip.limit) {
    return NextResponse.json(
      {
        hata: `Paketinizde ${takip.limit} kelime takip edebilirsiniz. Şu anda ${takip.mevcut} kelime takip ediliyor.`,
        limitAsildi: true,
      },
      { status: 429 },
    );
  }

  const kayitlar = sonuc.data.kelimeler.map((k) => ({
    project_id: proje.id,
    keyword: k.keyword,
    search_volume: k.arama_hacmi,
    cpc: k.cpc,
    competition: k.rekabet,
    competition_level:
      k.rekabet === null ? null : k.rekabet < 0.34 ? "dusuk" : k.rekabet < 0.67 ? "orta" : "yuksek",
    difficulty: k.zorluk,
    intent: k.amac,
    is_tracked: true,
    source: "arastirma",
    location_code: proje.location_code,
    language_code: proje.language_code,
    last_refreshed_at: new Date().toISOString(),
  }));

  const { error } = await yonetici
    .from("keywords")
    .upsert(kayitlar as never, { onConflict: "project_id,keyword" });

  if (error) {
    console.error("[kelime] kaydedilemedi", { mesaj: error.message });
    return NextResponse.json({ hata: "Kelimeler kaydedilemedi." }, { status: 500 });
  }

  // Fırsat skorlarını hesapla
  const { data: kayitli } = await yonetici
    .from("keywords")
    .select("id, keyword, search_volume, difficulty, competition, intent")
    .eq("project_id", proje.id)
    .in(
      "keyword",
      sonuc.data.kelimeler.map((k) => k.keyword),
    );

  const firsatlar = (kayitli ?? [])
    .filter((k) => (k.search_volume ?? 0) > 0)
    .map((k) => {
      const skor = firsatSkoru({
        aramaHacmi: k.search_volume,
        zorluk: k.difficulty,
        rekabet: k.competition,
        mevcutPozisyon: null,
        amac: k.intent,
      });
      return {
        project_id: proje.id,
        keyword_id: k.id,
        score: skor.skor,
        potential_traffic: skor.tahminiTrafik,
        current_position: null,
        target_position: skor.hedefPozisyon,
        reason: skor.gerekce,
        signals: skor.sinyaller as never,
        opportunity_type: "genel",
        status: "acik",
      };
    });

  if (firsatlar.length) {
    await yonetici
      .from("keyword_opportunities")
      .upsert(firsatlar as never, { onConflict: "project_id,keyword_id,opportunity_type" });
  }

  return NextResponse.json({ eklenen: kayitlar.length });
}
