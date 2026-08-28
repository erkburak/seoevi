import type { KotaAyari } from "@/lib/araclar/kota";

/**
 * Herkese açık ücretsiz araçların kota ayarları.
 *
 * Bu değerler sunucu eylemlerinden ayrı tutulur: "use server" dosyaları
 * yalnızca async fonksiyon dışa aktarabilir, sabit dışa aktaramaz.
 */

/** Google Sıra Bulucu — günde 3 sorgu. */
export const SIRA_BULUCU_KOTASI: KotaAyari = {
  arac: "google-sira-bulucu",
  parmakIziLimiti: 3,
  // Paylaşımlı ağlar (mobil operatör, ofis, kafe) tek IP arkasında çok
  // kullanıcı barındırır; IP limiti bu yüzden daha geniş tutulur.
  ipLimiti: 12,
};

/**
 * Aracın günlük toplam sorgu tavanı.
 * VPN veya cihaz değiştirerek kişisel kota aşılabilir; bu tavan toplam
 * sağlayıcı maliyetini her koşulda sınırlar.
 */
export const SIRA_BULUCU_GUNLUK_TAVAN = Number(process.env.SIRA_BULUCU_GUNLUK_TAVAN ?? 400);

/**
 * Ücretsiz SEO Analiz Aracı — günde 1 tarama.
 *
 * Sıra bulucudan daha dar tutulur: bu araç sayfayı gerçekten indirip
 * çözümlediği için kişi başına maliyeti daha yüksektir ve amacı ürünü
 * tanıtmaktır, sürekli kullanılmak değil.
 */
export const SEO_ANALIZ_KOTASI: KotaAyari = {
  arac: "seo-analiz-araci",
  parmakIziLimiti: 1,
  // Paylaşımlı ağlarda tek IP arkasında çok kullanıcı bulunur.
  ipLimiti: 6,
};

/** Aracın günlük toplam tavanı — sağlayıcı maliyetini her koşulda sınırlar. */
export const SEO_ANALIZ_GUNLUK_TAVAN = Number(process.env.SEO_ANALIZ_GUNLUK_TAVAN ?? 300);
