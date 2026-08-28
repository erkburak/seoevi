import "server-only";

import { type RaporBolumu } from "@/lib/analiz/rapor-bolumleri";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Json, Proje } from "@/types/database";

/**
 * Rapor üretimi.
 *
 * Rapor, o andaki verinin dondurulmuş bir kopyasıdır (snapshot).
 * Sonradan veriler değişse bile rapor içeriği değişmez; bu sayede
 * geçmiş raporlar karşılaştırılabilir kalır.
 *
 * PDF dışa aktarımı ileride bu snapshot üzerinden üretilecek şekilde
 * ayrı tutulmuştur; rapor verisi görsel katmandan bağımsızdır.
 */

export type RaporAnlikGorunumu = {
  proje: { ad: string; alan_adi: string; url: string };
  olusturuldu: string;
  genel?: {
    skorlar: Record<string, number | null | undefined>;
    istatistikler: Record<string, number | null | undefined>;
    son_analiz: string | null;
  };
  teknik?: {
    skor: number | null;
    taranan_sayfa: number;
    acik_sorun: number;
    kritik_sorun: number;
    sorunlar: { baslik: string; onem: string; adet: number }[];
  };
  kelime?: {
    toplam: number;
    ilk_uc: number;
    ilk_on: number;
    yukselen: number;
    dusen: number;
    tahmini_trafik: number;
    en_iyi: { keyword: string; pozisyon: number | null; hacim: number | null; degisim: number | null }[];
  };
  rakip?: {
    adet: number;
    liste: { alan_adi: string; organik_kelime: number | null; ortak_kelime: number | null }[];
  };
  eticaret?: {
    urun_sayisi: number;
    kategori_sayisi: number;
    ortalama_urun_skoru: number | null;
    ortalama_kategori_skoru: number | null;
    merchant_skoru: number | null;
  };
  backlink?: {
    toplam: number;
    referans_alan_adi: number;
    yeni: number;
    kaybedilen: number;
  };
  icerik?: {
    analiz_sayisi: number;
    acik_firsat: number;
    firsatlar: { keyword: string; baslik: string | null }[];
  };
  ai?: {
    skor: number | null;
    marka_gorunurlugu: number | null;
    icerik_guvenilirligi: number | null;
    konu_otoritesi: number | null;
    urun_gorunurlugu: number | null;
    soru_kapsamasi: number | null;
  };
  aksiyon?: {
    bekleyen: number;
    devam_eden: number;
    tamamlanan: number;
    oncelikli: { baslik: string; oncelik: string; etki: string; etkilenen: number }[];
  };
};

/**
 * Seçilen bölümler için mevcut proje verisinden anlık görünüm üretir.
 * Yalnızca veritabanı okunur; DataForSEO çağrısı yapılmaz.
 */
export async function raporAnlikGorunumuUret({
  proje,
  bolumler,
}: {
  proje: Proje;
  bolumler: RaporBolumu[];
}): Promise<RaporAnlikGorunumu> {
  const supabase = yoneticiIstemcisi();
  const secili = new Set(bolumler);

  const gorunum: RaporAnlikGorunumu = {
    proje: { ad: proje.name, alan_adi: proje.domain, url: proje.url },
    olusturuldu: new Date().toISOString(),
  };

  if (secili.has("genel")) {
    gorunum.genel = {
      skorlar: { ...proje.scores },
      // Rapor yalnızca sayısal istatistikleri taşır; tarama sınırına
      // takılma gibi ürün içi bayraklar müşteri belgesine girmez.
      istatistikler: Object.fromEntries(
        Object.entries(proje.stats ?? {}).filter(([, deger]) => typeof deger === "number"),
      ) as Record<string, number>,
      son_analiz: proje.last_audit_at,
    };
  }

  if (secili.has("teknik")) {
    const [{ count: sayfaSayisi }, { data: sorunlar }] = await Promise.all([
      supabase
        .from("pages")
        .select("id", { count: "exact", head: true })
        .eq("project_id", proje.id),
      supabase
        .from("technical_issues")
        .select("title, severity")
        .eq("project_id", proje.id)
        .eq("status", "acik"),
    ]);

    const gruplar = new Map<string, { baslik: string; onem: string; adet: number }>();
    for (const s of sorunlar ?? []) {
      const anahtar = `${s.severity}:${s.title}`;
      const mevcut = gruplar.get(anahtar);
      if (mevcut) mevcut.adet += 1;
      else gruplar.set(anahtar, { baslik: s.title, onem: s.severity, adet: 1 });
    }

    gorunum.teknik = {
      skor: proje.scores?.teknik ?? null,
      taranan_sayfa: sayfaSayisi ?? 0,
      acik_sorun: sorunlar?.length ?? 0,
      kritik_sorun: (sorunlar ?? []).filter((s) => s.severity === "kritik").length,
      sorunlar: [...gruplar.values()].sort((a, b) => b.adet - a.adet).slice(0, 12),
    };
  }

  if (secili.has("kelime")) {
    const { data: kelimeler } = await supabase
      .from("kelime_ozet")
      .select("keyword, position, previous_position, search_volume, etv")
      .eq("project_id", proje.id)
      .limit(1000);

    const liste = kelimeler ?? [];
    const siralananlar = liste.filter((k) => k.position !== null);

    const degisim = (k: (typeof liste)[number]) =>
      k.position !== null && k.previous_position !== null ? k.previous_position - k.position : null;

    gorunum.kelime = {
      toplam: siralananlar.length,
      ilk_uc: siralananlar.filter((k) => (k.position ?? 99) <= 3).length,
      ilk_on: siralananlar.filter((k) => (k.position ?? 99) <= 10).length,
      yukselen: liste.filter((k) => (degisim(k) ?? 0) > 0).length,
      dusen: liste.filter((k) => (degisim(k) ?? 0) < 0).length,
      tahmini_trafik: Math.round(liste.reduce((t, k) => t + (k.etv ?? 0), 0)),
      en_iyi: siralananlar
        .sort((a, b) => (a.position ?? 99) - (b.position ?? 99))
        .slice(0, 15)
        .map((k) => ({
          keyword: k.keyword,
          pozisyon: k.position,
          hacim: k.search_volume,
          degisim: degisim(k),
        })),
    };
  }

  if (secili.has("rakip")) {
    const { data: rakipler } = await supabase
      .from("competitors")
      .select("domain, metrics")
      .eq("project_id", proje.id)
      .eq("is_active", true);

    gorunum.rakip = {
      adet: rakipler?.length ?? 0,
      liste: (rakipler ?? []).map((r) => {
        const m = (r.metrics ?? {}) as { organik_kelime?: number; ortak_kelime?: number };
        return {
          alan_adi: r.domain,
          organik_kelime: m.organik_kelime ?? null,
          ortak_kelime: m.ortak_kelime ?? null,
        };
      }),
    };
  }

  if (secili.has("eticaret")) {
    const [{ data: urunler }, { data: kategoriler }] = await Promise.all([
      supabase.from("products").select("seo_score").eq("project_id", proje.id),
      supabase.from("categories").select("seo_score").eq("project_id", proje.id),
    ]);

    const ortalama = (kayitlar: { seo_score: number | null }[] | null) => {
      const skorlar = (kayitlar ?? [])
        .map((k) => k.seo_score)
        .filter((s): s is number => typeof s === "number");
      if (!skorlar.length) return null;
      return Math.round(skorlar.reduce((t, s) => t + s, 0) / skorlar.length);
    };

    gorunum.eticaret = {
      urun_sayisi: urunler?.length ?? 0,
      kategori_sayisi: kategoriler?.length ?? 0,
      ortalama_urun_skoru: ortalama(urunler),
      ortalama_kategori_skoru: ortalama(kategoriler),
      merchant_skoru: proje.scores?.merchant ?? null,
    };
  }

  if (secili.has("backlink")) {
    const [{ count: toplam }, { data: alanAdlari }, { count: yeni }, { count: kaybedilen }] =
      await Promise.all([
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", proje.id)
          .eq("is_lost", false),
        supabase
          .from("referring_domains")
          .select("id")
          .eq("project_id", proje.id)
          .eq("is_competitor", false)
          .eq("is_lost", false),
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", proje.id)
          .eq("is_new", true),
        supabase
          .from("backlinks")
          .select("id", { count: "exact", head: true })
          .eq("project_id", proje.id)
          .eq("is_lost", true),
      ]);

    gorunum.backlink = {
      toplam: toplam ?? 0,
      referans_alan_adi: alanAdlari?.length ?? 0,
      yeni: yeni ?? 0,
      kaybedilen: kaybedilen ?? 0,
    };
  }

  if (secili.has("icerik")) {
    const [{ count: analizSayisi }, { data: firsatlar }] = await Promise.all([
      supabase
        .from("content_analysis")
        .select("id", { count: "exact", head: true })
        .eq("project_id", proje.id),
      supabase
        .from("content_opportunities")
        .select("keyword, title_suggestion")
        .eq("project_id", proje.id)
        .eq("status", "acik")
        .limit(15),
    ]);

    gorunum.icerik = {
      analiz_sayisi: analizSayisi ?? 0,
      acik_firsat: firsatlar?.length ?? 0,
      firsatlar: (firsatlar ?? []).map((f) => ({
        keyword: f.keyword,
        baslik: f.title_suggestion,
      })),
    };
  }

  if (secili.has("ai")) {
    const { data: ai } = await supabase
      .from("ai_visibility")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    gorunum.ai = {
      skor: ai?.score ?? null,
      marka_gorunurlugu: ai?.brand_visibility ?? null,
      icerik_guvenilirligi: ai?.content_trust ?? null,
      konu_otoritesi: ai?.topic_authority ?? null,
      urun_gorunurlugu: ai?.product_visibility ?? null,
      soru_kapsamasi: ai?.question_coverage ?? null,
    };
  }

  if (secili.has("aksiyon")) {
    const { data: aksiyonlar } = await supabase
      .from("seo_actions")
      .select("title, priority, impact, status, affected_count")
      .eq("project_id", proje.id);

    const liste = aksiyonlar ?? [];
    const ONCELIK_SIRASI: Record<string, number> = { kritik: 0, yuksek: 1, orta: 2, dusuk: 3 };

    gorunum.aksiyon = {
      bekleyen: liste.filter((a) => a.status === "bekliyor").length,
      devam_eden: liste.filter((a) => a.status === "devam_ediyor").length,
      tamamlanan: liste.filter((a) => a.status === "tamamlandi").length,
      oncelikli: liste
        .filter((a) => a.status !== "tamamlandi" && a.status !== "yoksayildi")
        .sort((a, b) => (ONCELIK_SIRASI[a.priority] ?? 9) - (ONCELIK_SIRASI[b.priority] ?? 9))
        .slice(0, 12)
        .map((a) => ({
          baslik: a.title,
          oncelik: a.priority,
          etki: a.impact,
          etkilenen: a.affected_count,
        })),
    };
  }

  return gorunum;
}

/** Rapor kaydını oluşturur ve anlık görünümü saklar. */
export async function raporOlustur({
  proje,
  kullaniciId,
  baslik,
  bolumler,
  donemBaslangici,
}: {
  proje: Proje;
  kullaniciId: string;
  baslik: string;
  bolumler: RaporBolumu[];
  donemBaslangici: Date | null;
}): Promise<{ id: string } | { hata: string }> {
  const supabase = yoneticiIstemcisi();

  let gorunum: RaporAnlikGorunumu;
  try {
    gorunum = await raporAnlikGorunumuUret({ proje, bolumler });
  } catch (hata) {
    console.error("[rapor] anlık görünüm üretilemedi", {
      projeId: proje.id,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return { hata: "Rapor verileri hazırlanamadı. Kısa süre sonra tekrar deneyin." };
  }

  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: proje.id,
      user_id: kullaniciId,
      title: baslik,
      period_start: donemBaslangici?.toISOString() ?? null,
      period_end: new Date().toISOString(),
      sections: bolumler as never,
      snapshot: gorunum as unknown as Json,
      status: "hazir",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[rapor] kaydedilemedi", { mesaj: error?.message });
    return { hata: "Rapor kaydedilemedi. Tekrar deneyin." };
  }

  return { id: data.id };
}
