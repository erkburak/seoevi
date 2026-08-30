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

/**
 * Site Hızı Testi — günde 2 ölçüm.
 *
 * Ölçüm başına sağlayıcı maliyeti $0.005 (ölçülen değer). Sıra bulucudan
 * pahalı olduğu için kişisel hak daha dar tutulur; ölçüm de saniyeler
 * sürdüğü için zaten sık tekrarlanacak bir araç değildir.
 */
export const SITE_HIZI_KOTASI: KotaAyari = {
  arac: "site-hizi-testi",
  parmakIziLimiti: 2,
  // Paylaşımlı ağlar tek IP arkasında çok kullanıcı barındırır.
  ipLimiti: 8,
};

/**
 * Günlük toplam tavan.
 * 200 ölçüm × $0.005 = günde en fazla $1 — bütçenin son emniyet valfi.
 */
export const SITE_HIZI_GUNLUK_TAVAN = Number(process.env.SITE_HIZI_GUNLUK_TAVAN ?? 200);

/**
 * Ürün Sayfası SEO Testi — günde 3 kontrol.
 *
 * Sayfayı doğrudan okuduğu için sağlayıcı maliyeti YOKTUR; hak yalnızca
 * kötüye kullanımı ve kendi sunucu yükümüzü sınırlamak için vardır.
 */
export const URUN_SAYFASI_KOTASI: KotaAyari = {
  arac: "urun-sayfasi-seo-testi",
  parmakIziLimiti: 3,
  ipLimiti: 15,
};

/** Sağlayıcı maliyeti olmadığı için tavan yalnızca kaba bir kötüye kullanım freni. */
export const URUN_SAYFASI_GUNLUK_TAVAN = Number(process.env.URUN_SAYFASI_GUNLUK_TAVAN ?? 1500);
