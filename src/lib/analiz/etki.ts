import "server-only";

import { USD_TRY } from "@/lib/maliyet";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Etki Takibi.
 *
 * SEO Evi'nin cevaplaması gereken asıl soru şu: "yaptığım iş işe yaradı mı?"
 * Rapor gösteren araç çoktur; yapılan işin sonucunu ölçen azdır.
 *
 * Akış:
 *   1. Kullanıcı bir aksiyonu tamamladığında, o aksiyonun etkilediği
 *      sayfalarda sıralanan kelimelerin o anki durumu dondurulur.
 *   2. Sonraki günlerde aynı kelimeler yeniden ölçülür.
 *   3. Fark, hem sıralama hem de "bu trafiği reklamla almak ne tutardı"
 *      cinsinden gösterilir.
 *
 * Ölçüm, düzenli analizlerde zaten toplanan sıralama verisinden okunur;
 * ek sağlayıcı çağrısı yapılmaz. Bu özelliğin API maliyeti sıfırdır.
 *
 * DÜRÜSTLÜK: Sıralamalar başka nedenlerle de değişir (algoritma
 * güncellemesi, rakip hamlesi, mevsimsellik). Bu yüzden arayüzde
 * nedensellik iddia edilmez; "bu aksiyondan sonra şu oldu" denir.
 */

export type EtkiAyarlari = {
  olcum_baslangic_gun: number;
  olcum_araligi_gun: number;
  olcum_penceresi_gun: number;
  asgari_kelime: number;
};

const VARSAYILAN_AYARLAR: EtkiAyarlari = {
  olcum_baslangic_gun: 3,
  olcum_araligi_gun: 3,
  olcum_penceresi_gun: 45,
  asgari_kelime: 1,
};

async function ayarlar(): Promise<EtkiAyarlari> {
  try {
    const supabase = yoneticiIstemcisi();
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "etki_takibi")
      .maybeSingle();
    return { ...VARSAYILAN_AYARLAR, ...((data?.value as Partial<EtkiAyarlari>) ?? {}) };
  } catch {
    return VARSAYILAN_AYARLAR;
  }
}

export type EtkiKelimesi = {
  keyword_id: string;
  keyword: string;
  pozisyon: number | null;
  etv: number;
  cpc: number | null;
};

export type EtkiOlcumu = {
  kelimeSayisi: number;
  ortalamaPozisyon: number | null;
  etv: number;
  deger: number;
  kelimeler: EtkiKelimesi[];
};

/**
 * Aylık tahmini ziyaretin parasal karşılığı (TL).
 * Kelimenin tıklama başı reklam maliyeti üzerinden hesaplanır.
 * DataForSEO CPC değerlerini USD döndürdüğü için kurla çevrilir.
 */
function trafikDegeri(kelimeler: EtkiKelimesi[]): number {
  const usd = kelimeler.reduce((t, k) => t + k.etv * (k.cpc ?? 0), 0);
  return Math.round(usd * USD_TRY * 100) / 100;
}

function ortalama(sayilar: number[]): number | null {
  if (!sayilar.length) return null;
  return Math.round((sayilar.reduce((t, s) => t + s, 0) / sayilar.length) * 100) / 100;
}

/**
 * Bir aksiyonun etkilediği sayfalarda sıralanan kelimeleri ölçer.
 * Mevcut sıralama verisinden okur; sağlayıcıya gitmez.
 */
async function olcumAl(projeId: string, urller: string[]): Promise<EtkiOlcumu> {
  const supabase = yoneticiIstemcisi();

  if (!urller.length) {
    return { kelimeSayisi: 0, ortalamaPozisyon: null, etv: 0, deger: 0, kelimeler: [] };
  }

  // kelime_ozet görünümü kelimeyi son sıralamasıyla birlikte verir.
  const { data } = await supabase
    .from("kelime_ozet")
    .select("id, keyword, position, etv, cpc, url")
    .eq("project_id", projeId)
    .in("url", urller.slice(0, 50));

  const kelimeler: EtkiKelimesi[] = (data ?? []).map((k) => ({
    keyword_id: k.id,
    keyword: k.keyword,
    pozisyon: k.position,
    etv: Number(k.etv ?? 0),
    cpc: k.cpc === null ? null : Number(k.cpc),
  }));

  const siralananlar = kelimeler
    .map((k) => k.pozisyon)
    .filter((p): p is number => p !== null);

  return {
    kelimeSayisi: kelimeler.length,
    ortalamaPozisyon: ortalama(siralananlar),
    etv: Math.round(kelimeler.reduce((t, k) => t + k.etv, 0) * 100) / 100,
    deger: trafikDegeri(kelimeler),
    kelimeler,
  };
}

/* ------------------------------------------------------------------ */
/* Başlangıç anlık görüntüsü                                           */
/* ------------------------------------------------------------------ */

/**
 * Aksiyon tamamlandığında çağrılır; o andaki durumu dondurur.
 * Aynı aksiyon için kayıt varsa yeniden oluşturulmaz.
 */
export async function etkiTakibiBaslat(aksiyonId: string): Promise<void> {
  const supabase = yoneticiIstemcisi();

  const { data: aksiyon } = await supabase
    .from("seo_actions")
    .select("id, project_id, source_urls, status")
    .eq("id", aksiyonId)
    .maybeSingle();

  if (!aksiyon || aksiyon.status !== "tamamlandi") return;

  const { data: mevcut } = await supabase
    .from("action_impact")
    .select("id")
    .eq("action_id", aksiyonId)
    .maybeSingle();

  if (mevcut) return;

  const { data: proje } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", aksiyon.project_id)
    .maybeSingle();

  if (!proje) return;

  const urller = (aksiyon.source_urls ?? []) as string[];
  const baz = await olcumAl(aksiyon.project_id, urller);
  const { asgari_kelime } = await ayarlar();

  const { error } = await supabase.from("action_impact").insert({
    action_id: aksiyonId,
    project_id: aksiyon.project_id,
    user_id: proje.user_id,
    completed_at: new Date().toISOString(),
    baz_kelime_sayisi: baz.kelimeSayisi,
    baz_ortalama_pozisyon: baz.ortalamaPozisyon,
    baz_etv: baz.etv,
    baz_deger: baz.deger,
    baz_kelimeler: baz.kelimeler as never,
    durum: baz.kelimeSayisi >= asgari_kelime ? "bekliyor" : "veri_yok",
  });

  if (error) {
    console.error("[etki] başlangıç kaydedilemedi", { aksiyonId, mesaj: error.message });
  }
}

/** Aksiyon tekrar açıldığında ölçüm kaydı kaldırılır. */
export async function etkiTakibiIptal(aksiyonId: string): Promise<void> {
  const supabase = yoneticiIstemcisi();
  await supabase.from("action_impact").delete().eq("action_id", aksiyonId);
}

/* ------------------------------------------------------------------ */
/* Yeniden ölçüm                                                       */
/* ------------------------------------------------------------------ */

/**
 * Ölçüm penceresi içindeki kayıtları yeniden ölçer.
 * Cron tarafından çağrılır; sağlayıcı maliyeti yoktur.
 */
export async function etkileriOlc(azamiKayit = 50): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const ayar = await ayarlar();
  const simdi = Date.now();

  const { data: kayitlar } = await supabase
    .from("action_impact")
    .select("id, action_id, project_id, completed_at, son_olcum_at, olcum_sayisi, durum")
    .in("durum", ["bekliyor", "olculuyor"])
    .limit(azamiKayit);

  let olculen = 0;

  for (const kayit of kayitlar ?? []) {
    const tamamlanma = new Date(kayit.completed_at).getTime();
    const gecenGun = (simdi - tamamlanma) / 86_400_000;

    // Ölçüm penceresi kapandıysa sonuçlandır.
    if (gecenGun > ayar.olcum_penceresi_gun) {
      await supabase
        .from("action_impact")
        .update({ durum: "sonuclandi" })
        .eq("id", kayit.id);
      continue;
    }

    // Henüz erken.
    if (gecenGun < ayar.olcum_baslangic_gun) continue;

    // Son ölçümden bu yana yeterli süre geçmediyse atla.
    if (kayit.son_olcum_at) {
      const gecen = (simdi - new Date(kayit.son_olcum_at).getTime()) / 86_400_000;
      if (gecen < ayar.olcum_araligi_gun) continue;
    }

    const { data: aksiyon } = await supabase
      .from("seo_actions")
      .select("source_urls")
      .eq("id", kayit.action_id)
      .maybeSingle();

    const urller = (aksiyon?.source_urls ?? []) as string[];
    const olcum = await olcumAl(kayit.project_id, urller);

    await supabase
      .from("action_impact")
      .update({
        son_olcum_at: new Date().toISOString(),
        son_ortalama_pozisyon: olcum.ortalamaPozisyon,
        son_etv: olcum.etv,
        son_deger: olcum.deger,
        olcum_sayisi: (kayit.olcum_sayisi ?? 0) + 1,
        durum: "olculuyor",
      })
      .eq("id", kayit.id);

    olculen++;
  }

  return olculen;
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export type EtkiOzeti = {
  actionId: string;
  durum: string;
  tamamlandi: string;
  kelimeSayisi: number;
  /** Negatif = sıra yükseldi (iyi). */
  pozisyonDegisimi: number | null;
  etvDegisimi: number;
  degerDegisimi: number;
  olcumSayisi: number;
  gunGecti: number;
};

function ozetle(k: {
  action_id: string;
  durum: string;
  completed_at: string;
  baz_kelime_sayisi: number;
  baz_ortalama_pozisyon: number | null;
  baz_etv: number | string;
  baz_deger: number | string;
  son_ortalama_pozisyon: number | null;
  son_etv: number | string | null;
  son_deger: number | string | null;
  olcum_sayisi: number;
}): EtkiOzeti {
  const bazPoz = k.baz_ortalama_pozisyon;
  const sonPoz = k.son_ortalama_pozisyon;

  return {
    actionId: k.action_id,
    durum: k.durum,
    tamamlandi: k.completed_at,
    kelimeSayisi: k.baz_kelime_sayisi,
    pozisyonDegisimi:
      bazPoz !== null && sonPoz !== null ? Math.round((sonPoz - bazPoz) * 100) / 100 : null,
    etvDegisimi: Math.round((Number(k.son_etv ?? 0) - Number(k.baz_etv)) * 100) / 100,
    degerDegisimi: Math.round((Number(k.son_deger ?? 0) - Number(k.baz_deger)) * 100) / 100,
    olcumSayisi: k.olcum_sayisi,
    gunGecti: Math.floor((Date.now() - new Date(k.completed_at).getTime()) / 86_400_000),
  };
}

/** Bir projedeki tüm aksiyonların etki özetleri. */
export async function projeEtkileri(projeId: string): Promise<Map<string, EtkiOzeti>> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase
    .from("action_impact")
    .select("*")
    .eq("project_id", projeId)
    .order("completed_at", { ascending: false });

  const harita = new Map<string, EtkiOzeti>();
  for (const k of data ?? []) harita.set(k.action_id, ozetle(k));
  return harita;
}

export type KazancOzeti = {
  olculenAksiyon: number;
  sonuclananAksiyon: number;
  /** Sıralaması yükselen aksiyon sayısı. */
  yukselenAksiyon: number;
  toplamEtvDegisimi: number;
  toplamDegerDegisimi: number;
  ortalamaPozisyonDegisimi: number | null;
  /** Ölçümü süren ama henüz sonuç oluşmamış aksiyonlar. */
  bekleyenAksiyon: number;
};

/**
 * Projenin toplam kazanç özeti.
 * "Yaptığınız işler ne getirdi?" sorusunun tek ekranlık cevabı.
 */
export async function kazancOzeti(projeId: string): Promise<KazancOzeti> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase
    .from("action_impact")
    .select(
      "durum, baz_ortalama_pozisyon, son_ortalama_pozisyon, baz_etv, son_etv, baz_deger, son_deger, olcum_sayisi",
    )
    .eq("project_id", projeId)
    .neq("durum", "veri_yok");

  const kayitlar = data ?? [];
  const olculenler = kayitlar.filter((k) => k.olcum_sayisi > 0);

  const pozisyonFarklari = olculenler
    .filter((k) => k.baz_ortalama_pozisyon !== null && k.son_ortalama_pozisyon !== null)
    .map((k) => Number(k.son_ortalama_pozisyon) - Number(k.baz_ortalama_pozisyon));

  return {
    olculenAksiyon: olculenler.length,
    sonuclananAksiyon: kayitlar.filter((k) => k.durum === "sonuclandi").length,
    yukselenAksiyon: pozisyonFarklari.filter((f) => f < 0).length,
    toplamEtvDegisimi:
      Math.round(
        olculenler.reduce((t, k) => t + (Number(k.son_etv ?? 0) - Number(k.baz_etv)), 0) * 100,
      ) / 100,
    toplamDegerDegisimi:
      Math.round(
        olculenler.reduce((t, k) => t + (Number(k.son_deger ?? 0) - Number(k.baz_deger)), 0) * 100,
      ) / 100,
    ortalamaPozisyonDegisimi: ortalama(pozisyonFarklari),
    bekleyenAksiyon: kayitlar.filter((k) => k.olcum_sayisi === 0 && k.durum === "bekliyor").length,
  };
}
