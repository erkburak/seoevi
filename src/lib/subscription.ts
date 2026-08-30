import "server-only";

import {
  METRIK_ADLARI,
  METRIK_LIMITI,
  METRIK_PERIYODU,
  planGetir,
  planlariGetir,
} from "@/lib/plans";
import { turkiyeGunu } from "@/lib/araclar/kota";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { buAy } from "@/lib/utils";
import type { Abonelik, Plan, PlanLimitleri } from "@/types/database";

export type AbonelikDurumu = {
  abonelik: Abonelik | null;
  plan: Plan | null;
  limitler: PlanLimitleri | null;
  denemeBitisi: Date | null;
  denemeGunKaldi: number | null;
  aktifMi: boolean;
};

/** Kullanıcının aboneliğini, planını ve geçerli limitlerini döndürür. */
export async function abonelikDurumu(kullaniciId: string): Promise<AbonelikDurumu> {
  const supabase = yoneticiIstemcisi();

  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", kullaniciId)
    .maybeSingle();

  const abonelik = (data ?? null) as Abonelik | null;

  if (!abonelik) {
    return { abonelik: null, plan: null, limitler: null, denemeBitisi: null, denemeGunKaldi: null, aktifMi: false };
  }

  const plan = await planGetir(abonelik.plan_id);
  const limitler = plan
    ? ({ ...plan.limits, ...abonelik.limit_overrides } as PlanLimitleri)
    : null;

  const denemeBitisi = abonelik.trial_ends_at ? new Date(abonelik.trial_ends_at) : null;
  const denemeGunKaldi = denemeBitisi
    ? Math.max(0, Math.ceil((denemeBitisi.getTime() - Date.now()) / 86_400_000))
    : null;

  const aktifMi =
    abonelik.status === "aktif" ||
    (abonelik.status === "deneme" && denemeBitisi !== null && denemeBitisi.getTime() > Date.now());

  return { abonelik, plan, limitler, denemeBitisi, denemeGunKaldi, aktifMi };
}

export type KullanimOzeti = {
  metrik: string;
  ad: string;
  kullanilan: number;
  limit: number;
  oran: number;
};

/** Bu ayki kullanım sayaçlarını limitlerle birlikte döndürür. */
export async function kullanimOzeti(kullaniciId: string): Promise<KullanimOzeti[]> {
  const supabase = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(kullaniciId);
  if (!limitler) return [];

  // Her metrik kendi dönemindeki sayacıyla okunur.
  const { data } = await supabase
    .from("usage")
    .select("metric, used, period")
    .eq("user_id", kullaniciId)
    .in("period", [buAy(), turkiyeGunu()]);

  const kullanimlar = new Map(
    (data ?? [])
      .filter((k) => k.period === metrikDonemi(k.metric))
      .map((k) => [k.metric, k.used]),
  );

  return Object.keys(METRIK_LIMITI).map((metrik) => {
    const limitAnahtari = METRIK_LIMITI[metrik];
    const limitDegeri = limitler[limitAnahtari];
    const limit = typeof limitDegeri === "number" ? limitDegeri : 0;
    const kullanilan = kullanimlar.get(metrik) ?? 0;

    return {
      metrik,
      ad: METRIK_ADLARI[metrik] ?? metrik,
      kullanilan,
      limit,
      oran: limit > 0 ? Math.min(100, Math.round((kullanilan / limit) * 100)) : 0,
    };
  });
}

/**
 * Metriğin içinde bulunduğu sayaç dönemi.
 *
 * Günlük metriklerde Türkiye günü kullanılır; böylece sayaç her gece
 * 00:00'da kendiliğinden sıfırlanır.
 */
export function metrikDonemi(metrik: string): string {
  return METRIK_PERIYODU[metrik] === "gun" ? turkiyeGunu() : buAy();
}

export class LimitAsildiHatasi extends Error {
  readonly metrik: string;
  readonly limit: number;

  constructor(metrik: string, limit: number) {
    super(`Limit aşıldı: ${metrik} (${limit})`);
    this.name = "LimitAsildiHatasi";
    this.metrik = metrik;
    this.limit = limit;
  }
}

/**
 * Bir işlemin plan limitine sığıp sığmadığını sunucu tarafında kontrol eder.
 * Arayüze güvenilmez; her maliyetli işlem öncesi çağrılır.
 */
export async function limitKontrol({
  kullaniciId,
  metrik,
  adet = 1,
}: {
  kullaniciId: string;
  metrik: keyof typeof METRIK_LIMITI;
  adet?: number;
}): Promise<{ uygun: boolean; kullanilan: number; limit: number }> {
  const supabase = yoneticiIstemcisi();
  const { limitler, aktifMi } = await abonelikDurumu(kullaniciId);

  if (!limitler || !aktifMi) {
    return { uygun: false, kullanilan: 0, limit: 0 };
  }

  const limitAnahtari = METRIK_LIMITI[metrik];
  const limitDegeri = limitler[limitAnahtari];
  const limit = typeof limitDegeri === "number" ? limitDegeri : 0;

  const { data } = await supabase
    .from("usage")
    .select("used")
    .eq("user_id", kullaniciId)
    .eq("period", metrikDonemi(metrik))
    .eq("metric", metrik)
    .maybeSingle();

  const kullanilan = data?.used ?? 0;
  return { uygun: kullanilan + adet <= limit, kullanilan, limit };
}

/** Kullanım sayacını atomik olarak artırır. */
export async function kullanimArtir({
  kullaniciId,
  metrik,
  adet = 1,
}: {
  kullaniciId: string;
  metrik: string;
  adet?: number;
}): Promise<void> {
  const supabase = yoneticiIstemcisi();
  const { error } = await supabase.rpc("increment_usage", {
    p_user_id: kullaniciId,
    p_metric: metrik,
    p_amount: adet,
    p_period: metrikDonemi(metrik),
  });

  if (error) {
    console.error("[kullanim] sayaç artırılamadı", { metrik, mesaj: error.message });
  }
}

/**
 * Kullanım sayacını geri alır.
 *
 * Site taraması hakkı, tarama sağlayıcıya gönderildiği anda düşülür;
 * maliyet o anda doğar. Analiz sonradan başarısız olursa kullanıcı hiçbir
 * sonuç almadan hakkını kaybetmemelidir. Sayaç sıfırın altına inmez.
 */
export async function kullanimAzalt({
  kullaniciId,
  metrik,
  adet = 1,
}: {
  kullaniciId: string;
  metrik: string;
  adet?: number;
}): Promise<void> {
  const supabase = yoneticiIstemcisi();
  const { error } = await supabase.rpc("decrement_usage", {
    p_user_id: kullaniciId,
    p_metric: metrik,
    p_amount: adet,
    p_period: metrikDonemi(metrik),
  });

  if (error) {
    console.error("[kullanim] sayaç geri alınamadı", { metrik, mesaj: error.message });
  }
}

/**
 * Bir özelliğin plana dahil olup olmadığını kontrol eder.
 * Örnek: özellikVarMi(kullaniciId, "merchant")
 */
export async function ozellikVarMi(
  kullaniciId: string,
  ozellik: "geri_baglanti" | "merchant" | "ai_gorunurlugu" | "sayfa_hizi" | "satici_karsilastirma" | "isletme_yorumlari",
): Promise<boolean> {
  const { limitler, aktifMi } = await abonelikDurumu(kullaniciId);
  return Boolean(aktifMi && limitler?.[ozellik]);
}

/**
 * Takip edilebilecek anahtar kelime sayısı.
 *
 * Bu limit `anahtar_kelime` alanından gelir. Aylık araştırma çalıştırma
 * hakkı (`aylik_kelime_arastirmasi`) ile karıştırılmamalıdır: biri kaç
 * kelimenin sürekli izlendiğini, diğeri ayda kaç kez araştırma
 * çalıştırılabildiğini belirler.
 */
export async function takipKelimeLimiti(
  kullaniciId: string,
  projeId: string,
): Promise<{ limit: number; mevcut: number; kalan: number }> {
  const supabase = yoneticiIstemcisi();
  const { limitler, aktifMi } = await abonelikDurumu(kullaniciId);

  const limit =
    aktifMi && typeof limitler?.anahtar_kelime === "number" ? limitler.anahtar_kelime : 0;

  const { count } = await supabase
    .from("keywords")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projeId)
    .eq("is_tracked", true);

  const mevcut = count ?? 0;
  return { limit, mevcut, kalan: Math.max(0, limit - mevcut) };
}

/**
 * Her analizde sırası canlı doğrulanacak kelime sayısı.
 *
 * `anahtar_kelime` saklanan kelime sayısıdır ve maliyeti yoktur; bu ise
 * her biri ayrı bir SERP görevi olduğu için maliyeti doğrudan belirler.
 */
export async function dogrulanacakKelimeLimiti(kullaniciId: string): Promise<number> {
  const { limitler, aktifMi } = await abonelikDurumu(kullaniciId);
  if (!aktifMi) return 0;
  return typeof limitler?.dogrulanan_kelime === "number" ? limitler.dogrulanan_kelime : 0;
}

/** Proje sayısı limitini kontrol eder. */
export async function projeLimitiUygunMu(
  kullaniciId: string,
): Promise<{ uygun: boolean; mevcut: number; limit: number }> {
  const supabase = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(kullaniciId);
  const limit = limitler?.projeler ?? 0;

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", kullaniciId)
    .eq("is_deleted", false);

  const mevcut = count ?? 0;
  return { uygun: mevcut < limit, mevcut, limit };
}

/**
 * Yükseltme önerisi için bir sonraki planı bulur.
 *
 * Mevcut plan, deneme paketi gibi listelenmeyen bir paket olabilir; bu
 * yüzden mevcut plan tüm paketler arasından aranır, öneri ise yalnızca
 * herkese açık paketlerden seçilir.
 */
export async function sonrakiPlan(mevcutPlanId: string): Promise<Plan | null> {
  const [mevcut, planlar] = await Promise.all([planGetir(mevcutPlanId), planlariGetir()]);
  if (!mevcut) return null;
  return (
    planlar.find((p) => p.sort_order > mevcut.sort_order && !p.is_custom) ??
    planlar.find((p) => p.is_custom) ??
    null
  );
}
