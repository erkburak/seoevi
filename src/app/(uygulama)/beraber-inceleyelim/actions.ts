"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";

const Sema = z.object({
  konu: z.string().trim().min(5, "Konuyu birkaç kelimeyle özetleyin.").max(140),
  mesaj: z
    .string()
    .trim()
    .min(20, "Ne görmek istediğinizi biraz daha anlatın; böylece doğru yanıtı verebiliriz.")
    .max(4000),
  projeId: z.string().uuid().nullable().optional(),
  kaynakSayfa: z.string().max(200).optional(),
});

export type TalepSonucu = { hata?: string; basarili?: boolean };

/** Bir hesabın aynı anda açık tutabileceği talep sayısı. */
const AZAMI_ACIK_TALEP = 5;

/**
 * Destek talebi oluşturur.
 *
 * Ücretsizdir ve pakete bağlı değildir; yalnızca aynı anda açık talep
 * sayısı sınırlanır, böylece kuyruk tek hesap tarafından doldurulamaz.
 */
export async function talepOlustur(veri: {
  konu: string;
  mesaj: string;
  projeId?: string | null;
  kaynakSayfa?: string;
}): Promise<TalepSonucu> {
  const sonuc = Sema.safeParse(veri);
  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { count } = await supabase
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("durum", ["yeni", "inceleniyor"]);

  if ((count ?? 0) >= AZAMI_ACIK_TALEP) {
    return {
      hata: `Aynı anda en fazla ${AZAMI_ACIK_TALEP} açık talebiniz olabilir. Mevcut taleplerinize dönüş yaptığımızda yenisini açabilirsiniz.`,
    };
  }

  const { error } = await supabase.from("support_tickets").insert({
    user_id: user.id,
    project_id: sonuc.data.projeId ?? null,
    konu: sonuc.data.konu,
    mesaj: sonuc.data.mesaj,
    kaynak_sayfa: sonuc.data.kaynakSayfa ?? null,
  });

  if (error) {
    console.error("[destek] talep oluşturulamadı", { mesaj: error.message });
    return { hata: "Talebiniz kaydedilemedi. Kısa süre sonra tekrar deneyin." };
  }

  revalidatePath("/beraber-inceleyelim");
  return { basarili: true };
}

/* ------------------------------------------------------------------ */
/* Yetkili işlemleri                                                   */
/* ------------------------------------------------------------------ */

const YanitSemasi = z.object({
  talepId: z.string().uuid(),
  yanit: z.string().trim().min(1).max(4000),
  durum: z.enum(["inceleniyor", "cevaplandi", "kapandi"]),
});

/**
 * Talebi yanıtlar.
 *
 * Yazma yetkisi satır düzeyi güvenlik kuralıyla yetkiliye sınırlıdır;
 * burada ayrıca kullanıcıya bildirim bırakılır.
 */
export async function talebiYanitla(veri: {
  talepId: string;
  yanit: string;
  durum: "inceleniyor" | "cevaplandi" | "kapandi";
}): Promise<TalepSonucu> {
  const sonuc = YanitSemasi.safeParse(veri);
  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { data: guncel, error } = await supabase
    .from("support_tickets")
    .update({
      yanit: sonuc.data.yanit,
      durum: sonuc.data.durum,
      yanitlayan: user.id,
      yanitlandi_at: new Date().toISOString(),
    })
    .eq("id", sonuc.data.talepId)
    .select("user_id, konu")
    .maybeSingle();

  if (error || !guncel) {
    console.error("[destek] yanıt kaydedilemedi", { mesaj: error?.message });
    return { hata: "Yanıt kaydedilemedi." };
  }

  await yoneticiIstemcisi().from("notifications").insert({
    user_id: guncel.user_id,
    project_id: null,
    type: "destek_yaniti",
    title: "Talebinize yanıt verdik",
    body: guncel.konu,
    href: "/beraber-inceleyelim",
    severity: "bilgi",
  });

  revalidatePath("/yetkili/talepler");
  revalidatePath("/beraber-inceleyelim");
  return { basarili: true };
}
