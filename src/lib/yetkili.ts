import "server-only";

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
