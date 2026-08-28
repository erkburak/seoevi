import "server-only";

import type { User } from "@supabase/supabase-js";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { abonelikDurumu } from "@/lib/subscription";

/**
 * Maliyetli işlemler için güvenlik katmanı.
 *
 * Her DataForSEO ve yapay zekâ çağrısının gerçek bir parasal karşılığı var.
 * Plan limitleri tek başına yeterli değil: sahte e-postalarla açılan
 * hesaplar limitleri paralel olarak tüketebilir. Bu modül, harcama
 * yapmadan önce hesabın gerçekten kullanılabilir olduğunu doğrular.
 */

/** Tek kullanımlık / geçici e-posta sağlayıcıları. */
const GECICI_EPOSTA_ALAN_ADLARI = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "getnada.com", "sharklasers.com", "maildrop.cc", "dispostable.com",
  "fakeinbox.com", "mytemp.email", "moakt.com", "emailondeck.com",
  "tempmailo.com", "mohmal.com", "inboxkitten.com", "burnermail.io",
  "spamgourmet.com", "mailnesia.com", "tempr.email", "discard.email",
  "1secmail.com", "minuteinbox.com", "tmpmail.org", "vipmail.pw",
]);

export function geciciEpostaMi(eposta: string): boolean {
  const alanAdi = eposta.split("@")[1]?.toLowerCase().trim();
  if (!alanAdi) return false;
  return GECICI_EPOSTA_ALAN_ADLARI.has(alanAdi);
}

export type HarcamaIzni =
  | { izinli: true }
  | { izinli: false; kod: HarcamaRedKodu; mesaj: string };

export type HarcamaRedKodu =
  | "eposta_dogrulanmadi"
  | "gecici_eposta"
  | "abonelik_yok"
  | "abonelik_pasif"
  | "hesap_kilitli";

/**
 * Kullanıcının maliyetli bir işlem başlatmaya hakkı olup olmadığını döndürür.
 * Arayüze güvenilmez; her maliyetli uç noktanın başında çağrılır.
 */
export async function harcamaIzni(kullanici: User): Promise<HarcamaIzni> {
  // 1. E-posta doğrulaması — sahte hesap üretmenin önündeki ilk engel.
  if (!kullanici.email_confirmed_at) {
    return {
      izinli: false,
      kod: "eposta_dogrulanmadi",
      mesaj:
        "Analiz başlatmak için e-posta adresinizi doğrulamanız gerekiyor. Kayıt sırasında gönderdiğimiz bağlantıya tıklayın.",
    };
  }

  // 2. Tek kullanımlık e-posta sağlayıcıları.
  if (kullanici.email && geciciEpostaMi(kullanici.email)) {
    return {
      izinli: false,
      kod: "gecici_eposta",
      mesaj:
        "Geçici e-posta adresleriyle analiz başlatılamıyor. Kurumsal veya kişisel bir e-posta adresiyle kayıt olun.",
    };
  }

  // 3. Yönetici tarafından kilitlenmiş hesaplar.
  const yonetici = yoneticiIstemcisi();
  const { data: profil } = await yonetici
    .from("profiles")
    .select("is_blocked")
    .eq("id", kullanici.id)
    .maybeSingle();

  if (profil?.is_blocked) {
    return {
      izinli: false,
      kod: "hesap_kilitli",
      mesaj: "Hesabınız geçici olarak kısıtlandı. Destek ekibimizle iletişime geçin.",
    };
  }

  // 4. Abonelik durumu.
  const { abonelik, aktifMi } = await abonelikDurumu(kullanici.id);

  if (!abonelik) {
    return {
      izinli: false,
      kod: "abonelik_yok",
      mesaj: "Hesabınızda aktif bir paket bulunamadı. Destek ekibimizle iletişime geçin.",
    };
  }

  if (!aktifMi) {
    return {
      izinli: false,
      kod: "abonelik_pasif",
      mesaj:
        "Deneme süreniz doldu veya aboneliğiniz aktif değil. Analizlere devam etmek için bir paket seçin.",
    };
  }

  return { izinli: true };
}

/* ------------------------------------------------------------------ */
/* Eşzamanlı iş sınırı                                                 */
/* ------------------------------------------------------------------ */

/**
 * Bir kullanıcının aynı anda çalıştırabileceği azami analiz sayısı.
 * Kuyruğu tek bir hesabın doldurmasını ve maliyetin patlamasını önler.
 */
export const AZAMI_ESZAMANLI_IS = 2;

export async function eszamanliIsUygunMu(
  kullaniciId: string,
): Promise<{ uygun: boolean; calisan: number }> {
  const supabase = yoneticiIstemcisi();
  const { count } = await supabase
    .from("audit_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", kullaniciId)
    .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"]);

  const calisan = count ?? 0;
  return { uygun: calisan < AZAMI_ESZAMANLI_IS, calisan };
}

/* ------------------------------------------------------------------ */
/* Günlük hesap harcama tavanı                                         */
/* ------------------------------------------------------------------ */

/**
 * Tüm platformun günlük DataForSEO harcama tavanı (USD).
 * Plan limitleri kişi bazında koruma sağlar; bu tavan ise bir hata ya da
 * saldırı durumunda toplam zararı sınırlayan son emniyet valfidir.
 */
export const GUNLUK_PLATFORM_TAVANI_USD = Number(
  process.env.GUNLUK_HARCAMA_TAVANI_USD ?? 25,
);

/** Bugünkü toplam sağlayıcı harcamasını döndürür. */
export async function bugunkuHarcama(): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const bugun = new Date();
  bugun.setUTCHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("api_cache")
    .select("cost")
    .gte("created_at", bugun.toISOString())
    .not("cost", "is", null);

  return (data ?? []).reduce((t, k) => t + Number(k.cost ?? 0), 0);
}

/** Platform tavanı aşıldıysa yeni maliyetli işlem başlatılmaz. */
export async function platformTavaniUygunMu(): Promise<{ uygun: boolean; harcanan: number }> {
  const harcanan = await bugunkuHarcama();
  return { uygun: harcanan < GUNLUK_PLATFORM_TAVANI_USD, harcanan };
}
