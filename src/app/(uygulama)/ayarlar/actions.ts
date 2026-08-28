"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { aktifProjeGetir } from "@/lib/projects";
import { abonelikDurumu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export type AyarSonucu = { hata?: string; basari?: string };

const Sema = z.object({
  cihaz: z.enum(["desktop", "mobile"]),
  otomatikTarama: z.boolean(),
  taramaSikligi: z.enum(["gunluk", "haftalik", "aylik", "manuel"]),
  maksSayfa: z.coerce.number().int().min(10).max(10_000),
  urunDeseni: z.string().trim().max(200),
  kategoriDeseni: z.string().trim().max(200),
  epostaBildirimi: z.boolean(),
  uygulamaBildirimi: z.boolean(),
});

/**
 * Aktif projenin analiz ayarlarını kaydeder.
 * Tarama sayfa limiti plana göre sunucu tarafında sınırlanır.
 */
export async function ayarlariKaydet(_onceki: AyarSonucu, veri: FormData): Promise<AyarSonucu> {
  const sonuc = Sema.safeParse({
    cihaz: veri.get("cihaz"),
    otomatikTarama: veri.get("otomatikTarama") === "on",
    taramaSikligi: veri.get("taramaSikligi"),
    maksSayfa: veri.get("maksSayfa"),
    urunDeseni: veri.get("urunDeseni") ?? "",
    kategoriDeseni: veri.get("kategoriDeseni") ?? "",
    epostaBildirimi: veri.get("epostaBildirimi") === "on",
    uygulamaBildirimi: veri.get("uygulamaBildirimi") === "on",
  });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Ayarları kontrol edip tekrar deneyin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  // Görüntüleme kipi salt okunurdur; yetkili başkasının hesabında
  // değişiklik yapamaz.
  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) return { hata: yazmaEngeli };


  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return { hata: "Aktif proje bulunamadı." };

  // Plan limitinin üzerinde bir tarama boyutu kabul edilmez.
  const { limitler } = await abonelikDurumu(user.id);
  const planLimiti = limitler?.tarama_sayfa ?? 200;
  const maksSayfa = Math.min(sonuc.data.maksSayfa, planLimiti);

  const { error } = await supabase
    .from("project_settings")
    .upsert({
      project_id: proje.id,
      device: sonuc.data.cihaz,
      auto_audit: sonuc.data.otomatikTarama,
      audit_frequency: sonuc.data.taramaSikligi,
      max_crawl_pages: maksSayfa,
      product_url_pattern: sonuc.data.urunDeseni || null,
      category_url_pattern: sonuc.data.kategoriDeseni || null,
      notification_prefs: {
        email: sonuc.data.epostaBildirimi,
        uygulama: sonuc.data.uygulamaBildirimi,
      },
    });

  if (error) {
    console.error("[ayarlar] kaydedilemedi", { mesaj: error.message });
    return { hata: "Ayarlar kaydedilemedi. Tekrar deneyin." };
  }

  revalidatePath("/ayarlar");

  if (maksSayfa < sonuc.data.maksSayfa) {
    return {
      basari: `Ayarlar kaydedildi. Paketiniz tarama başına en fazla ${planLimiti} sayfaya izin verdiği için bu değer uygulandı.`,
    };
  }

  return { basari: "Ayarlar kaydedildi." };
}
