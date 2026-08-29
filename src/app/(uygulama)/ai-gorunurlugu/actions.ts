"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { abonelikDurumu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export type TakipSonucu = { hata?: string; basarili?: boolean };

const SoruSemasi = z
  .string()
  .trim()
  .min(5, "Soruyu biraz daha açık yazın.")
  .max(160, "Soru en fazla 160 karakter olabilir.");

/**
 * Takip edilecek yapay zekâ sorusu ekler.
 *
 * Her soru ayrı bir sağlayıcı çağrısı demek olduğu için sayı pakete
 * bağlıdır; sınır sunucuda uygulanır.
 */
export async function takipSorusuEkle(projeId: string, soru: string): Promise<TakipSonucu> {
  const sonuc = z
    .object({ projeId: z.string().uuid(), soru: SoruSemasi })
    .safeParse({ projeId, soru });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Geçersiz istek." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) return { hata: yazmaEngeli };

  const { limitler } = await abonelikDurumu(user.id);

  if (limitler?.ai_gorunurlugu !== true) {
    return { hata: "AI görünürlüğü takibi paketinizde bulunmuyor." };
  }

  const limit = typeof limitler.ai_takip_sorusu === "number" ? limitler.ai_takip_sorusu : 0;

  const { count } = await supabase
    .from("ai_tracked_queries")
    .select("id", { count: "exact", head: true })
    .eq("project_id", sonuc.data.projeId);

  if ((count ?? 0) >= limit) {
    return {
      hata: `Paketinizde ${limit} soru takip edebilirsiniz. Yeni soru eklemek için birini silin ya da paketinizi yükseltin.`,
    };
  }

  const { error } = await supabase.from("ai_tracked_queries").insert({
    project_id: sonuc.data.projeId,
    soru: sonuc.data.soru,
  });

  if (error) {
    // Aynı soru zaten takipteyse kullanıcıya bunu söyle.
    if (error.code === "23505") return { hata: "Bu soru zaten takip ediliyor." };
    console.error("[ai] takip sorusu eklenemedi", { mesaj: error.message });
    return { hata: "Soru eklenemedi. Tekrar deneyin." };
  }

  revalidatePath("/ai-gorunurlugu");
  return { basarili: true };
}

/** Takip edilen soruyu kaldırır. */
export async function takipSorusuSil(soruId: string): Promise<TakipSonucu> {
  const sonuc = z.string().uuid().safeParse(soruId);
  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) return { hata: yazmaEngeli };

  // Satır düzeyi güvenlik başkasının sorusuna dokunulmasını engeller.
  const { error } = await supabase.from("ai_tracked_queries").delete().eq("id", sonuc.data);

  if (error) {
    console.error("[ai] takip sorusu silinemedi", { mesaj: error.message });
    return { hata: "Soru silinemedi. Tekrar deneyin." };
  }

  revalidatePath("/ai-gorunurlugu");
  return { basarili: true };
}
