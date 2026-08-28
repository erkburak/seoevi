"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sunucuIstemcisi } from "@/lib/supabase/server";

export type HesapSonucu = { hata?: string; basari?: string };

/** Profil bilgilerini günceller. E-posta değişikliği bu akışta yapılmaz. */
export async function profiliGuncelle(_onceki: HesapSonucu, veri: FormData): Promise<HesapSonucu> {
  const sonuc = z
    .object({
      adSoyad: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(80),
      sirket: z.string().trim().max(120).optional().or(z.literal("")),
      telefon: z
        .string()
        .trim()
        .max(24)
        .regex(/^[0-9+()\s-]*$/, "Telefon numarası yalnızca rakam ve + ( ) - içerebilir.")
        .optional()
        .or(z.literal("")),
      pazarlama: z.union([z.literal("on"), z.null()]).transform((v) => v === "on"),
    })
    .safeParse({
      adSoyad: veri.get("adSoyad"),
      sirket: veri.get("sirket"),
      telefon: veri.get("telefon"),
      pazarlama: veri.get("pazarlama"),
    });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: sonuc.data.adSoyad,
      company: sonuc.data.sirket || null,
      phone: sonuc.data.telefon || null,
      marketing_opt_in: sonuc.data.pazarlama,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[hesap] profil güncellenemedi", { mesaj: error.message });
    return { hata: "Bilgileriniz kaydedilemedi. Tekrar deneyin." };
  }

  revalidatePath("/hesabim");
  return { basari: "Bilgileriniz güncellendi." };
}

/** Şifre değiştirir. Mevcut oturum üzerinden yapılır. */
export async function sifreDegistir(_onceki: HesapSonucu, veri: FormData): Promise<HesapSonucu> {
  const sonuc = z
    .object({
      yeni: z.string().min(8, "Şifre en az 8 karakter olmalı."),
      tekrar: z.string(),
    })
    .refine((d) => d.yeni === d.tekrar, { message: "Şifreler eşleşmiyor." })
    .safeParse({ yeni: veri.get("yeni"), tekrar: veri.get("tekrar") });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Şifreyi kontrol edin." };
  }

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase.auth.updateUser({ password: sonuc.data.yeni });

  if (error) {
    console.error("[hesap] şifre değiştirilemedi", { mesaj: error.message });
    return { hata: "Şifreniz güncellenemedi. Lütfen tekrar deneyin." };
  }

  return { basari: "Şifreniz güncellendi." };
}
