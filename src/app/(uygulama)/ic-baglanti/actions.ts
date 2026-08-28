"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

/**
 * Öneri durumunu günceller.
 *
 * Yazma, kullanıcı oturumundaki istemciyle yapılır; satır düzeyi güvenlik
 * kuralı başkasının projesindeki öneriye dokunulmasını engeller.
 */
export async function oneriDurumuGuncelle(
  oneriId: string,
  durum: "yeni" | "uygulandi" | "yoksayildi",
): Promise<{ hata?: string }> {
  const sonuc = z
    .object({
      oneriId: z.string().uuid(),
      durum: z.enum(["yeni", "uygulandi", "yoksayildi"]),
    })
    .safeParse({ oneriId, durum });

  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  // Görüntüleme kipi salt okunurdur; yetkili başkasının hesabında
  // değişiklik yapamaz.
  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) return { hata: yazmaEngeli };


  const { error } = await supabase
    .from("link_suggestions")
    .update({ durum })
    .eq("id", oneriId);

  if (error) {
    console.error("[ic-baglanti] öneri durumu güncellenemedi", { mesaj: error.message });
    return { hata: "Kaydedilemedi. Tekrar deneyin." };
  }

  revalidatePath("/ic-baglanti");
  return {};
}
