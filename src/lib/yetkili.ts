import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";

/**
 * Yetkili alanı erişim denetimi.
 *
 * Ayrı bir yönetim uygulaması yoktur; /yetkili aynı uygulamanın içinde,
 * yalnızca profiles.role = 'yetkili' olan kullanıcılara açık bir bölümdür.
 * Arayüzde gizlemek yeterli değildir: her sunucu eylemi bu kontrolü
 * kendi başına yapar.
 */

export type YetkiliKullanici = {
  id: string;
  eposta: string;
  adSoyad: string;
};

/** Yetkili değilse yönlendirir; sayfa gövdesi hiç çalışmaz. */
export async function yetkiliGerekli(): Promise<YetkiliKullanici> {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris?devam=%2Fyetkili");

  const { data: profil } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profil?.role !== "yetkili") {
    // Yetkisiz kullanıcıya alanın varlığı sezdirilmez.
    redirect("/genel-bakis");
  }

  return {
    id: user.id,
    eposta: user.email ?? "",
    adSoyad: profil.full_name?.trim() || (user.email ?? "Yetkili").split("@")[0],
  };
}

/** Sunucu eylemlerinde kullanılır; yönlendirmek yerine sonuç döndürür. */
export async function yetkiliMi(): Promise<{ yetkili: boolean; kullaniciId: string | null }> {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { yetkili: false, kullaniciId: null };

  const { data: profil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return { yetkili: profil?.role === "yetkili", kullaniciId: user.id };
}

/** Yönetim işlemlerini kaydeder; kim ne zaman ne yaptı görülebilsin. */
export async function yonetimKaydi({
  yetkiliId,
  islem,
  hedefId,
  detay = {},
}: {
  yetkiliId: string;
  islem: string;
  hedefId?: string;
  detay?: Record<string, unknown>;
}): Promise<void> {
  try {
    await yoneticiIstemcisi().from("admin_log").insert({
      yetkili_id: yetkiliId,
      islem,
      hedef_id: hedefId ?? null,
      detay: detay as never,
    });
  } catch (hata) {
    // Kayıt tutulamaması işlemi bozmaz.
    console.warn("[yetkili] işlem kaydedilemedi", {
      islem,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  }
}

/* ------------------------------------------------------------------ */
/* Kullanıcı olarak görüntüleme                                        */
/* ------------------------------------------------------------------ */

/**
 * Görüntüleme kipini taşıyan çerez.
 *
 * Yalnızca sunucudan okunur ve tek başına hiçbir yetki vermez: her
 * istekte gerçek kullanıcının yetkili olup olmadığı yeniden doğrulanır.
 * Çerezin kendisi güvenilir kabul edilseydi, çerezi elle yazan biri
 * başkasının verisini görebilirdi.
 */
export const GORUNTULEME_COOKIE = "seoevi_goruntuleme";

export type GoruntulemeDurumu = {
  /** Verilerine bakılan kullanıcı; görüntüleme yoksa null. */
  hedefKullaniciId: string | null;
  /** Görüntüleme kipinde her yazma işlemi reddedilir. */
  saltOkunur: boolean;
  hedefEposta: string | null;
};

const KAPALI: GoruntulemeDurumu = {
  hedefKullaniciId: null,
  saltOkunur: false,
  hedefEposta: null,
};

/**
 * Görüntüleme kipinin durumu.
 *
 * Kip yalnızca gerçek kullanıcı yetkiliyse açıktır. Yetki kaybedilirse
 * çerez dursa bile kip kapanır.
 */
export async function goruntulemeDurumu(): Promise<GoruntulemeDurumu> {
  const cerezler = await cookies();
  const hedef = cerezler.get(GORUNTULEME_COOKIE)?.value;
  if (!hedef) return KAPALI;

  const { yetkili, kullaniciId } = await yetkiliMi();
  if (!yetkili || !kullaniciId) return KAPALI;

  // Yetkilinin kendi hesabını "görüntülemesi" anlamsızdır.
  if (hedef === kullaniciId) return KAPALI;

  const { data: profil } = await yoneticiIstemcisi()
    .from("profiles")
    .select("email")
    .eq("id", hedef)
    .maybeSingle();

  if (!profil) return KAPALI;

  return { hedefKullaniciId: hedef, saltOkunur: true, hedefEposta: profil.email };
}

/**
 * Yazma işlemlerinde çağrılır.
 *
 * Görüntüleme kipi salt okunurdur: yetkili başkasının hesabında değişiklik
 * yapamaz. Bu kontrol arayüzde gizlemeye bırakılmaz, her sunucu eyleminde
 * yapılır.
 */
export async function yazmaEngeliVarMi(): Promise<string | null> {
  const durum = await goruntulemeDurumu();
  if (!durum.saltOkunur) return null;
  return "Kullanıcı görüntüleme kipindesiniz; bu kipte değişiklik yapılamaz. Önce görüntülemeden çıkın.";
}
