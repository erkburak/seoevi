import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import {
  AI_KAYNAGI,
  aiCevaplariGetir,
  aiGorunurlukOlc,
  aiSoruAnalizi,
  type AiCevap,
} from "@/lib/dataforseo/ai-optimization";
import { abonelikDurumu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * AI görünürlüğü.
 *
 * Soru şudur: biri yapay zekâya "en iyi buzdolabı hangisi" diye
 * sorduğunda cevapta siz mi görünüyorsunuz, yoksa rakibiniz mi?
 *
 * Ölçüm, modele API'den soru sorarak yapılmaz — bir modelin o an ne
 * diyeceği, kullanıcıların gerçekte ne gördüğünü göstermez. Bunun yerine
 * yapay zekânın gerçekte verdiği cevaplar okunur: sorulan soru, verilen
 * cevap ve cevapta kaynak gösterilen siteler.
 *
 * Ölçülemeyen hiçbir şey uydurulmaz; veri yoksa "veri yok" denir.
 */

export { AI_KAYNAGI };

export type AiKaynakSatiri = {
  alanAdi: string;
  bahis: number;
  aiAramaHacmi: number;
  bizMiyiz: boolean;
};

export type AiCevapSatiri = {
  soru: string;
  cevap: string | null;
  modelAdi: string | null;
  kaynaklar: string[];
  bizdeVarMi: boolean;
  aiAramaHacmi: number;
  webAramali: boolean | null;
};

export type AiTakipSatiri = {
  id: string;
  soru: string;
  gorunuyorMu: boolean | null;
  cevapSayisi: number;
  aiAramaHacmi: number;
  kaynaklar: string[];
  ornekSoru: string | null;
  ornekCevap: string | null;
  olculduAt: string | null;
};

export type AiGorunurlukSonucu = {
  olculdu: boolean;
  bahis: number;
  aiAramaHacmi: number;
  /** Cevaplarda en çok gösterilen siteler — ilk sıradakiler rakipleriniz. */
  kaynaklar: AiKaynakSatiri[];
  cevaplar: AiCevapSatiri[];
  takipler: AiTakipSatiri[];
  /** Takip için kalan hak. */
  takipLimiti: number;
};

/** İki alan adı aynı siteye mi ait? */
function ayniSite(a: string, b: string): boolean {
  const sade = (x: string) => x.toLocaleLowerCase("tr").replace(/^www\./, "").trim();
  const x = sade(a);
  const y = sade(b);
  return x === y || x.endsWith(`.${y}`) || y.endsWith(`.${x}`);
}

/* ------------------------------------------------------------------ */
/* Ölçüm                                                               */
/* ------------------------------------------------------------------ */

export type AiOlcumSonucu = { olculen: number; takipOlculen: number };

/**
 * Yapay zekâ görünürlüğünü ölçer ve saklar.
 *
 * Sağlayıcı çağrısı pahalı olduğu için sonuçlar saklanır; ekran her
 * açıldığında yeniden ölçülmez.
 */
export async function aiGorunurlukAnaliziYap({
  proje,
  tazelik,
}: {
  proje: Proje;
  tazelik?: Tazelik;
}): Promise<AiOlcumSonucu> {
  const supabase = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(proje.user_id);

  if (limitler?.ai_gorunurlugu !== true) {
    return { olculen: 0, takipOlculen: 0 };
  }

  const locationCode = proje.location_code ?? 2792;

  /* ---------------- Genel görünürlük ---------------- */

  const [ozet, cevaplar] = await Promise.all([
    aiGorunurlukOlc({
      domain: proje.domain,
      locationCode,
      languageCode: proje.language_code,
      tazelik,
    }),
    aiCevaplariGetir({
      domain: proje.domain,
      locationCode,
      languageCode: proje.language_code,
      limit: 25,
      tazelik,
    }),
  ]);

  if (cevaplar.length) {
    const kayitlar = cevaplar.map((c) => ({
      project_id: proje.id,
      platform: c.platform,
      model_name: c.modelAdi,
      soru: c.soru,
      cevap: c.cevap,
      kaynaklar: c.kaynaklar as never,
      bizde_var_mi: c.kaynaklar.some((k) => ayniSite(k, proje.domain)),
      ai_arama_hacmi: c.aiAramaHacmi,
      web_aramali: c.webAramali,
      fetched_at: new Date().toISOString(),
    }));

    await supabase
      .from("ai_answers")
      .upsert(kayitlar as never, { onConflict: "project_id,soru,model_name" });
  }

  /* ---------------- Takip edilen sorular ---------------- */

  const takipLimiti =
    typeof limitler.ai_takip_sorusu === "number" ? limitler.ai_takip_sorusu : 0;

  const { data: takipler } = await supabase
    .from("ai_tracked_queries")
    .select("id, soru")
    .eq("project_id", proje.id)
    .order("created_at", { ascending: true })
    .limit(takipLimiti);

  let takipOlculen = 0;

  for (const t of takipler ?? []) {
    try {
      const sonuclar = await aiSoruAnalizi({
        soru: t.soru,
        locationCode,
        languageCode: proje.language_code,
        limit: 10,
        tazelik,
      });

      const ozetSonuc = takipOzeti(sonuclar, proje.domain);

      await supabase
        .from("ai_tracked_queries")
        .update({
          gorunuyor_mu: ozetSonuc.gorunuyorMu,
          cevap_sayisi: ozetSonuc.cevapSayisi,
          ai_arama_hacmi: ozetSonuc.aiAramaHacmi,
          kaynaklar: ozetSonuc.kaynaklar as never,
          ornek_soru: ozetSonuc.ornekSoru,
          ornek_cevap: ozetSonuc.ornekCevap,
          olculdu_at: new Date().toISOString(),
        })
        .eq("id", t.id);

      takipOlculen += 1;
    } catch (hata) {
      // Tek sorunun ölçümü başarısız olursa diğerleri sürer.
      console.error("[ai] takip sorusu ölçülemedi", {
        soru: t.soru,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  /* ---------------- Skor ---------------- */

  /*
   * Skor, cevaplarda kaç kez kaynak gösterildiğimizin hacme göre
   * ağırlıklandırılmış hâlidir. Veri yoksa skor da yoktur — sıfır
   * yazılmaz, çünkü "görünmüyorsunuz" ile "bakılamadı" aynı şey değildir.
   */
  const skor = gorunurlukSkoru(ozet.bahis, ozet.kaynaklar, proje.domain);

  const mevcut = (proje.scores ?? {}) as Record<string, number | null | undefined>;
  await supabase
    .from("projects")
    .update({ scores: { ...mevcut, ai: skor } as never })
    .eq("id", proje.id);

  return { olculen: cevaplar.length, takipOlculen };
}

/** Bir takip sorusunun ölçüm özeti. */
function takipOzeti(sonuclar: AiCevap[], bizimAlanAdi: string) {
  const kaynakSayaci = new Map<string, number>();
  let hacim = 0;
  let gorunen = 0;

  for (const s of sonuclar) {
    hacim = Math.max(hacim, s.aiAramaHacmi);
    if (s.kaynaklar.some((k) => ayniSite(k, bizimAlanAdi))) gorunen += 1;
    for (const k of s.kaynaklar) {
      kaynakSayaci.set(k, (kaynakSayaci.get(k) ?? 0) + 1);
    }
  }

  const kaynaklar = [...kaynakSayaci.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([alanAdi]) => alanAdi);

  const ornek = sonuclar[0] ?? null;

  return {
    // Hiç cevap bulunamadıysa "görünmüyorsunuz" denemez; bilinmiyordur.
    gorunuyorMu: sonuclar.length === 0 ? null : gorunen > 0,
    cevapSayisi: sonuclar.length,
    aiAramaHacmi: hacim,
    kaynaklar,
    ornekSoru: ornek?.soru ?? null,
    ornekCevap: ornek?.cevap ?? null,
  };
}

/**
 * Görünürlük skoru (0-100).
 *
 * Kendi bahsimizin, aynı cevaplarda gösterilen en güçlü siteye oranı.
 * Mutlak bahis sayısı tek başına anlamsızdır: beş bahis küçük bir
 * kategoride iyi, büyük bir kategoride görünmemek demektir.
 */
export function gorunurlukSkoru(
  bahis: number,
  kaynaklar: { alanAdi: string; bahis: number }[],
  bizimAlanAdi: string,
): number {
  if (bahis <= 0 || !kaynaklar.length) return 0;

  const rakipler = kaynaklar.filter((k) => !ayniSite(k.alanAdi, bizimAlanAdi));
  const enGuclu = Math.max(bahis, ...rakipler.map((r) => r.bahis));

  return Math.round(Math.min(100, (bahis / enGuclu) * 100));
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export async function aiGorunurlukOzeti(proje: Proje): Promise<AiGorunurlukSonucu> {
  const supabase = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(proje.user_id);

  const takipLimiti =
    limitler?.ai_gorunurlugu === true && typeof limitler.ai_takip_sorusu === "number"
      ? limitler.ai_takip_sorusu
      : 0;

  const [{ data: cevapVerisi }, { data: takipVerisi }] = await Promise.all([
    supabase
      .from("ai_answers")
      .select("*")
      .eq("project_id", proje.id)
      .order("ai_arama_hacmi", { ascending: false })
      .limit(50),
    supabase
      .from("ai_tracked_queries")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: true }),
  ]);

  const cevaplar = (cevapVerisi ?? []).map((c) => ({
    soru: c.soru,
    cevap: c.cevap,
    modelAdi: c.model_name,
    kaynaklar: (c.kaynaklar ?? []) as string[],
    bizdeVarMi: c.bizde_var_mi,
    aiAramaHacmi: c.ai_arama_hacmi,
    webAramali: c.web_aramali,
  }));

  /*
   * Kaynak sıralaması saklanan cevaplardan yeniden çıkarılır; böylece
   * "bu cevaplarda sizin yerinize kim gösteriliyor" sorusu ek sağlayıcı
   * çağrısı olmadan cevaplanır.
   */
  const sayac = new Map<string, { bahis: number; hacim: number }>();
  for (const c of cevaplar) {
    for (const k of c.kaynaklar) {
      const mevcut = sayac.get(k) ?? { bahis: 0, hacim: 0 };
      mevcut.bahis += 1;
      mevcut.hacim += c.aiAramaHacmi;
      sayac.set(k, mevcut);
    }
  }

  const kaynaklar = [...sayac.entries()]
    .map(([alanAdi, v]) => ({
      alanAdi,
      bahis: v.bahis,
      aiAramaHacmi: v.hacim,
      bizMiyiz: ayniSite(alanAdi, proje.domain),
    }))
    .sort((a, b) => b.bahis - a.bahis)
    .slice(0, 15);

  return {
    olculdu: cevaplar.length > 0,
    bahis: cevaplar.filter((c) => c.bizdeVarMi).length,
    aiAramaHacmi: cevaplar.reduce((t, c) => t + c.aiAramaHacmi, 0),
    kaynaklar,
    cevaplar,
    takipler: (takipVerisi ?? []).map((t) => ({
      id: t.id,
      soru: t.soru,
      gorunuyorMu: t.gorunuyor_mu,
      cevapSayisi: t.cevap_sayisi,
      aiAramaHacmi: t.ai_arama_hacmi,
      kaynaklar: (t.kaynaklar ?? []) as string[],
      ornekSoru: t.ornek_soru,
      ornekCevap: t.ornek_cevap,
      olculduAt: t.olculdu_at,
    })),
    takipLimiti,
  };
}
