"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { etkiTakibiBaslat, etkiTakibiIptal } from "@/lib/analiz/etki";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";
import type { AksiyonDurumu } from "@/types/database";

const Sema = z.object({
  aksiyonId: z.string().uuid(),
  durum: z.enum(["bekliyor", "devam_ediyor", "tamamlandi", "yoksayildi"]),
});

/** Aksiyon durumunu günceller. RLS sahiplik kontrolünü yapar. */
export async function aksiyonDurumuGuncelle(
  aksiyonId: string,
  durum: AksiyonDurumu,
): Promise<{ hata?: string }> {
  const sonuc = Sema.safeParse({ aksiyonId, durum });
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
    .from("seo_actions")
    .update({
      status: durum,
      completed_at: durum === "tamamlandi" ? new Date().toISOString() : null,
    })
    .eq("id", aksiyonId);

  if (error) {
    console.error("[aksiyon] durum güncellenemedi", { mesaj: error.message });
    return { hata: "Durum güncellenemedi. Tekrar deneyin." };
  }

  // Etki takibi: aksiyon tamamlandığında o anki sıralama durumu dondurulur,
  // sonraki günlerde ne olduğu ölçülür. Tekrar açılırsa ölçüm iptal edilir.
  if (durum === "tamamlandi") {
    await etkiTakibiBaslat(aksiyonId);
  } else {
    await etkiTakibiIptal(aksiyonId);
  }

  revalidatePath("/aksiyon-merkezi");
  revalidatePath("/genel-bakis");
  return {};
}
