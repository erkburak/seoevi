import { NextResponse } from "next/server";
import { z } from "zod";

import { DataForSeoHatasi } from "@/lib/dataforseo/client";
import { serpGetir } from "@/lib/dataforseo/serp";
import { harcamaIzni, platformTavaniUygunMu } from "@/lib/guvenlik";
import { aktifProjeGetir, rakipAlanAdlari } from "@/lib/projects";
import { firsatSkoru } from "@/lib/scoring";
import { kullanimArtir, limitKontrol } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export const maxDuration = 60;

const Sema = z.object({
  keywordId: z.string().uuid().optional(),
  keyword: z.string().min(1).max(160).optional(),
  cihaz: z.enum(["desktop", "mobile"]).default("desktop"),
  zorla: z.boolean().default(false),
});

/**
 * Bir anahtar kelime için canlı SERP verisi çeker,
 * kaydeder ve fırsat skorunu SERP yapısıyla birlikte yeniler.
 */
export async function POST(istek: Request) {
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
  if (!sonuc.success || (!sonuc.data.keywordId && !sonuc.data.keyword)) {
    return NextResponse.json({ hata: "Geçersiz istek." }, { status: 400 });
  }

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

  const limit = await limitKontrol({ kullaniciId: user.id, metrik: "serp" });
  if (!limit.uygun) {
    return NextResponse.json(
      {
        hata: `Günlük ${limit.limit} SERP analizi hakkınızı kullandınız. Paketinizi yükselterek devam edebilirsiniz.`,
        limitAsildi: true,
      },
      { status: 429 },
    );
  }

  const yonetici = yoneticiIstemcisi();

  let keyword = sonuc.data.keyword ?? "";
  let keywordId = sonuc.data.keywordId ?? null;
  let zorluk: number | null = null;
  let hacim: number | null = null;
  let amac: "bilgi" | "ticari" | "islem" | "gezinme" | null = null;

  if (keywordId) {
    const { data: kelime } = await yonetici
      .from("keywords")
      .select("keyword, difficulty, search_volume, intent")
      .eq("id", keywordId)
      .eq("project_id", proje.id)
      .maybeSingle();

    if (!kelime) return NextResponse.json({ hata: "Anahtar kelime bulunamadı." }, { status: 404 });

    keyword = kelime.keyword;
    zorluk = kelime.difficulty;
    hacim = kelime.search_volume;
    amac = kelime.intent;
  }

  try {
    const rakipler = await rakipAlanAdlari(proje.id);

    const serp = await serpGetir({
      keyword,
      locationCode: proje.location_code ?? 2792,
      languageCode: proje.language_code,
      device: sonuc.data.cihaz,
      bizimAlanAdi: proje.domain,
      rakipler,
      tazelik: sonuc.data.zorla ? "yenile" : "onbellek",
    });

    if (!serp.onbellekten) {
      await kullanimArtir({ kullaniciId: user.id, metrik: "serp" });
    }

    // Kelime kaydı yoksa oluştur.
    if (!keywordId) {
      const { data: yeni } = await yonetici
        .from("keywords")
        .upsert(
          {
            project_id: proje.id,
            keyword,
            location_code: proje.location_code,
            language_code: proje.language_code,
            source: "arastirma",
          },
          { onConflict: "project_id,keyword" },
        )
        .select("id")
        .single();
      keywordId = yeni?.id ?? null;
    }

    const { data: serpKaydi } = await yonetici
      .from("serp_results")
      .insert({
        project_id: proje.id,
        keyword_id: keywordId,
        keyword,
        device: sonuc.data.cihaz,
        location_code: proje.location_code,
        language_code: proje.language_code,
        se_results_count: serp.toplam_sonuc,
        items: serp.ogeler as never,
      })
      .select("id")
      .single();

    if (serpKaydi && serp.ozellikler.length) {
      await yonetici.from("serp_features").insert(
        serp.ozellikler.map((o) => ({
          serp_id: serpKaydi.id,
          project_id: proje.id,
          feature_type: o.tur,
          position: o.pozisyon,
          owned: o.bizde_mi,
        })) as never,
      );
    }

    // Sıralama kaydı
    if (keywordId) {
      const { data: onceki } = await yonetici
        .from("keyword_rankings")
        .select("position")
        .eq("keyword_id", keywordId)
        .eq("is_competitor", false)
        .order("checked_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      await yonetici.from("keyword_rankings").insert({
        project_id: proje.id,
        keyword_id: keywordId,
        domain: proje.domain,
        is_competitor: false,
        position: serp.bizim_pozisyon,
        previous_position: onceki?.position ?? null,
        url: serp.bizim_url,
        device: sonuc.data.cihaz,
      });

      // Fırsat skorunu SERP sinyalleriyle yenile
      const yeniSkor = firsatSkoru({
        aramaHacmi: hacim,
        zorluk,
        rekabet: null,
        mevcutPozisyon: serp.bizim_pozisyon,
        amac,
        serpOzellikSayisi: serp.ozellikler.length,
        alisverisVar: serp.alisveris_var,
        rakipSayisi: serp.rakip_pozisyonlari.filter((r) => r.pozisyon <= 10).length,
      });

      await yonetici.from("keyword_opportunities").upsert(
        {
          project_id: proje.id,
          keyword_id: keywordId,
          score: yeniSkor.skor,
          potential_traffic: yeniSkor.tahminiTrafik,
          current_position: serp.bizim_pozisyon,
          target_position: yeniSkor.hedefPozisyon,
          reason: yeniSkor.gerekce,
          signals: yeniSkor.sinyaller as never,
          opportunity_type: "genel",
          status: "acik",
        } as never,
        { onConflict: "project_id,keyword_id,opportunity_type" },
      );
    }

    return NextResponse.json({ veri: serp });
  } catch (hata) {
    const mesaj =
      hata instanceof DataForSeoHatasi
        ? hata.kullaniciMesaji
        : "Arama sonuçları alınamadı. Birkaç dakika sonra tekrar deneyin.";

    console.error("[serp] hata", {
      keyword,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    return NextResponse.json({ hata: mesaj }, { status: 500 });
  }
}
