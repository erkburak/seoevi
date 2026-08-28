import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { icerikBahisleri, markaBahisOzeti } from "@/lib/dataforseo/content";
import { aiGorunurlukSkoru, type AiKirilimi } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * AI görünürlüğü analizi.
 *
 * Yapay zekâ destekli arama cevapları; marka bahsedilmeleri, yapısal veri,
 * konu otoritesi ve soru kapsaması gibi sinyallerden beslenir.
 * Bu modül o sinyalleri toplayıp ölçülebilir bir skora çevirir.
 */

export type AiAnaliziSonucu = {
  skor: number;
  kirilim: AiKirilimi;
  markaBahsi: number;
  bahsedenAlanAdi: number;
};

/**
 * Marka bahsi araması için kullanılacak ifade.
 *
 * Alan adının ilk parçasını kullanmak yanıltıcıdır: "gursoy.com" için
 * "gursoy" aranınca Türkçe web'deki on binlerce SOYADI geçişi marka bahsi
 * sanılır ve görünürlük olduğundan çok yüksek ölçülür.
 *
 * Alan adının tamamı ("gursoy.com") bu belirsizliği taşımaz; bir sayfada
 * geçiyorsa gerçekten bu siteden söz ediliyordur.
 */
function markaIfadesi(proje: Proje): string {
  return proje.domain;
}

export async function aiGorunurlukAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<AiAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const marka = markaIfadesi(proje);

  /* ---------------- Marka bahsedilmeleri ---------------- */

  let markaBahsi = 0;
  let bahsedenAlanAdi = 0;
  let markaOlculdu = false;
  let bahisler: Awaited<ReturnType<typeof icerikBahisleri>> = [];

  try {
    const ozet = await markaBahisOzeti({ ifade: marka, tazelik });
    markaBahsi = ozet.toplam_bahis;
    bahsedenAlanAdi = ozet.bahseden_alan_adi;
    bahisler = await icerikBahisleri({ ifade: marka, limit: 20, tazelik });
    markaOlculdu = true;
  } catch (hata) {
    console.warn("[ai] marka bahisleri alınamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  }

  /* ---------------- Site sinyalleri ---------------- */

  const [
    { count: toplamSayfa },
    { count: schemaliSayfa },
    { count: toplamKelime },
    { count: ilkOnKelime },
    { data: ozellikler },
    { data: sonMerchant },
    { count: toplamUrun },
  ] = await Promise.all([
    supabase.from("pages").select("id", { count: "exact", head: true }).eq("project_id", proje.id),
    supabase
      .from("pages")
      .select("id", { count: "exact", head: true })
      .eq("project_id", proje.id)
      .eq("has_schema", true),
    supabase.from("keywords").select("id", { count: "exact", head: true }).eq("project_id", proje.id),
    supabase
      .from("keyword_rankings")
      .select("id", { count: "exact", head: true })
      .eq("project_id", proje.id)
      .eq("is_competitor", false)
      .lte("position", 10),
    supabase
      .from("serp_features")
      .select("feature_type, owned")
      .eq("project_id", proje.id)
      .limit(1000),
    supabase
      .from("merchant_audits")
      .select("data")
      .eq("project_id", proje.id)
      .is("product_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("project_id", proje.id),
  ]);

  const ozellikListesi = ozellikler ?? [];
  const snippetSayisi = ozellikListesi.filter(
    (o) => o.owned && (o.feature_type === "featured_snippet" || o.feature_type === "answer_box"),
  ).length;

  const soruOzellikleri = ozellikListesi.filter((o) => o.feature_type === "people_also_ask");
  const cevaplananSoru = soruOzellikleri.filter((o) => o.owned).length;

  const merchantVerisi = (sonMerchant?.data ?? {}) as { gorunur_urun?: number };

  const { data: backlink } = await supabase
    .from("projects")
    .select("scores")
    .eq("id", proje.id)
    .maybeSingle();

  const otorite = ((backlink?.scores ?? {}) as { otorite?: number }).otorite ?? 0;

  const { skor, kirilim, olculenSinyal } = aiGorunurlukSkoru({
    markaBahsi,
    markaOlculdu,
    toplamSayfa: toplamSayfa ?? 0,
    bahsedenAlanAdi,
    snippetSayisi,
    cevaplananSoru,
    toplamSoru: soruOzellikleri.length,
    ilkOnKelime: ilkOnKelime ?? 0,
    toplamKelime: toplamKelime ?? 0,
    alisverisGorunur: merchantVerisi.gorunur_urun ?? 0,
    toplamUrun: toplamUrun ?? 0,
    schemaKapsamasi:
      toplamSayfa && toplamSayfa > 0 ? Math.round(((schemaliSayfa ?? 0) / toplamSayfa) * 100) : 0,
    otorite,
  });

  /* ---------------- Kaydet ---------------- */

  /*
   * Aynı gün için tek kayıt tutulur. Her çalıştırmada yeni satır eklemek
   * geçmiş grafiğini aynı değerin tekrarıyla dolduruyordu.
   */
  const bugun = new Date();
  bugun.setUTCHours(0, 0, 0, 0);
  await supabase
    .from("ai_visibility")
    .delete()
    .eq("project_id", proje.id)
    .gte("created_at", bugun.toISOString());

  await supabase.from("ai_visibility").insert({
    project_id: proje.id,
    score: skor,
    brand_visibility: kirilim.marka_gorunurlugu,
    content_trust: kirilim.icerik_guvenilirligi,
    topic_authority: kirilim.konu_otoritesi,
    product_visibility: kirilim.urun_gorunurlugu,
    question_coverage: kirilim.soru_kapsamasi,
    breakdown: {
      marka_bahsi: markaBahsi,
      bahseden_alan_adi: bahsedenAlanAdi,
      snippet_sayisi: snippetSayisi,
      cevaplanan_soru: cevaplananSoru,
      toplam_soru: soruOzellikleri.length,
      schema_kapsamasi:
        toplamSayfa && toplamSayfa > 0 ? Math.round(((schemaliSayfa ?? 0) / toplamSayfa) * 100) : 0,
      olculen_sinyal: olculenSinyal,
      marka_ifadesi: marka,
    } as never,
  });

  if (bahisler.length) {
    await supabase.from("ai_mentions").insert(
      bahisler.slice(0, 20).map((b) => ({
        project_id: proje.id,
        query: marka,
        mention_type: "marka",
        is_mentioned: true,
        source: b.alan_adi,
        context: b.baslik ?? b.ozet,
        competitors_mentioned: [] as never,
      })) as never,
    );
  }

  const mevcut = (proje.scores ?? {}) as Record<string, number | undefined>;
  await supabase
    .from("projects")
    .update({ scores: { ...mevcut, ai: skor } as never })
    .eq("id", proje.id);

  return { skor, kirilim, markaBahsi, bahsedenAlanAdi };
}
