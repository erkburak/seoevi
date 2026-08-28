import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Plan, PlanLimitleri } from "@/types/database";

/**
 * Paketler ve limitler.
 * Fiyatlar ve limitler veritabanından yönetilir; kodda sabit tutulmaz.
 */

export const LIMIT_ADLARI: Record<keyof PlanLimitleri, string> = {
  projeler: "Proje (mağaza)",
  anahtar_kelime: "Takip edilen anahtar kelime",
  aylik_kelime_arastirmasi: "Aylık anahtar kelime araştırması",
  gunluk_serp: "Günlük SERP analizi",
  aylik_site_taramasi: "Aylık site taraması",
  tarama_sayfa: "Tarama başına sayfa",
  rakip: "Rakip alan adı",
  aylik_rapor: "Aylık rapor",
  aylik_ai: "Aylık AI analizi",
  geri_baglanti: "Geri bağlantı analizi",
  merchant: "Merchant analizi",
  ai_gorunurlugu: "AI görünürlüğü",
};

/** Kullanım sayaçlarının okunabilir adları. */
export const METRIK_ADLARI: Record<string, string> = {
  serp: "SERP analizi",
  site_taramasi: "Site taraması",
  keyword: "Anahtar kelime araştırması",
  ai: "AI analizi",
  rapor: "Rapor",
};

/** Kullanım metriğinin hangi plan limitine karşılık geldiği. */
export const METRIK_LIMITI: Record<string, keyof PlanLimitleri> = {
  serp: "gunluk_serp",
  site_taramasi: "aylik_site_taramasi",
  keyword: "aylik_kelime_arastirmasi",
  ai: "aylik_ai",
  rapor: "aylik_rapor",
};

let onbellek: { planlar: Plan[]; zaman: number } | null = null;

/**
 * Gizli paketler dahil tüm paketler.
 *
 * Deneme paketi fiyat sayfasında görünmemesi için `is_public = false`
 * işaretlidir; ancak kayıt olan her kullanıcıya bu paket atandığı için
 * limitlerinin okunabilmesi şarttır. Sorguyu herkese açık paketlerle
 * sınırlamak, yeni kullanıcının hiçbir hakkı yokmuş gibi görünmesine
 * yol açar.
 */
export async function tumPaketler(): Promise<Plan[]> {
  if (onbellek && Date.now() - onbellek.zaman < 60_000) return onbellek.planlar;

  const supabase = yoneticiIstemcisi();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[planlar] okunamadı", { mesaj: error.message });
    return [];
  }

  const planlar = (data ?? []) as Plan[];
  onbellek = { planlar, zaman: Date.now() };
  return planlar;
}

/** Herkese açık paketleri sıralı biçimde döndürür. */
export async function planlariGetir(): Promise<Plan[]> {
  return (await tumPaketler()).filter((p) => p.is_public);
}

/** Kimliğine göre paket. Listelenmeyen paketleri de bulur. */
export async function planGetir(id: string): Promise<Plan | null> {
  return (await tumPaketler()).find((p) => p.id === id) ?? null;
}

/** Limitin sınırsız sayılacağı eşik. */
export const SINIRSIZ_ESIGI = 100_000;

export function limitMetni(deger: number | boolean): string {
  if (typeof deger === "boolean") return deger ? "Dahil" : "Yok";
  if (deger >= SINIRSIZ_ESIGI) return "Sınırsız";
  return new Intl.NumberFormat("tr-TR").format(deger);
}
