"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { SITE } from "@/config/site";

export type FormDurumu = {
  hata?: string;
  alanHatalari?: Record<string, string>;
  basari?: string;
};

const eposta = z
  .string()
  .trim()
  .min(1, "E-posta adresi gerekli.")
  .email("Geçerli bir e-posta adresi girin.");

const sifre = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı.")
  .max(72, "Şifre en fazla 72 karakter olabilir.");

const KayitSemasi = z
  .object({
    adSoyad: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı.").max(80),
    eposta,
    sifre,
    sifreTekrar: z.string(),
  })
  .refine((d) => d.sifre === d.sifreTekrar, {
    message: "Şifreler eşleşmiyor.",
    path: ["sifreTekrar"],
  });

const GirisSemasi = z.object({
  eposta,
  sifre: z.string().min(1, "Şifre gerekli."),
});

function alanHatalari(hata: z.ZodError): Record<string, string> {
  const sonuc: Record<string, string> = {};
  for (const sorun of hata.issues) {
    const alan = String(sorun.path[0] ?? "genel");
    if (!sonuc[alan]) sonuc[alan] = sorun.message;
  }
  return sonuc;
}

/** Supabase hata mesajlarını Türkçeleştirir. */
function hataMetni(mesaj: string): string {
  const m = mesaj.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("email not confirmed")) return "E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu kontrol edin.";
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "Bu e-posta adresi zaten kayıtlı. Giriş yapmayı deneyin.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.";
  }
  if (m.includes("password")) return "Şifre gereksinimleri karşılanmıyor.";
  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

/* ------------------------------------------------------------------ */
/* Kayıt                                                               */
/* ------------------------------------------------------------------ */

export async function kayitOl(_onceki: FormDurumu, veri: FormData): Promise<FormDurumu> {
  const sonuc = KayitSemasi.safeParse({
    adSoyad: veri.get("adSoyad"),
    eposta: veri.get("eposta"),
    sifre: veri.get("sifre"),
    sifreTekrar: veri.get("sifreTekrar"),
  });

  if (!sonuc.success) {
    return { alanHatalari: alanHatalari(sonuc.error) };
  }

  const supabase = await sunucuIstemcisi();
  const { data, error } = await supabase.auth.signUp({
    email: sonuc.data.eposta,
    password: sonuc.data.sifre,
    options: {
      data: { full_name: sonuc.data.adSoyad },
      emailRedirectTo: `${SITE.url}/auth/callback`,
    },
  });

  if (error) {
    console.error("[auth] kayıt hatası", { mesaj: error.message });
    return { hata: hataMetni(error.message) };
  }

  // E-posta doğrulaması açıksa oturum oluşmaz.
  if (!data.session) {
    return {
      basari:
        "Hesabınız oluşturuldu. E-posta adresinize gönderdiğimiz doğrulama bağlantısına tıklayarak girişi tamamlayın.",
    };
  }

  await olayKaydet({ olay: "signup_completed", kaynak: "eposta", kullaniciId: data.user?.id });

  const site = String(veri.get("site") ?? "").trim();
  redirect(site ? `/baslangic?site=${encodeURIComponent(site)}` : "/baslangic");
}

/* ------------------------------------------------------------------ */
/* Giriş                                                               */
/* ------------------------------------------------------------------ */

export async function girisYap(_onceki: FormDurumu, veri: FormData): Promise<FormDurumu> {
  const sonuc = GirisSemasi.safeParse({
    eposta: veri.get("eposta"),
    sifre: veri.get("sifre"),
  });

  if (!sonuc.success) {
    return { alanHatalari: alanHatalari(sonuc.error) };
  }

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase.auth.signInWithPassword({
    email: sonuc.data.eposta,
    password: sonuc.data.sifre,
  });

  if (error) {
    console.error("[auth] giriş hatası", { mesaj: error.message });
    return { hata: hataMetni(error.message) };
  }

  const devam = String(veri.get("devam") ?? "").trim();
  redirect(devam && devam.startsWith("/") ? devam : "/genel-bakis");
}

/* ------------------------------------------------------------------ */
/* Şifre sıfırlama                                                     */
/* ------------------------------------------------------------------ */

export async function sifreSifirlamaGonder(_onceki: FormDurumu, veri: FormData): Promise<FormDurumu> {
  const sonuc = z.object({ eposta }).safeParse({ eposta: veri.get("eposta") });

  if (!sonuc.success) {
    return { alanHatalari: alanHatalari(sonuc.error) };
  }

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase.auth.resetPasswordForEmail(sonuc.data.eposta, {
    redirectTo: `${SITE.url}/auth/callback?devam=/sifre-yenile`,
  });

  if (error) {
    console.error("[auth] şifre sıfırlama hatası", { mesaj: error.message });
  }

  // Hesabın var olup olmadığını açık etmemek için her durumda aynı yanıt.
  return {
    basari:
      "Bu adrese kayıtlı bir hesap varsa şifre yenileme bağlantısını gönderdik. Gelen kutunuzu kontrol edin.",
  };
}

export async function sifreyiYenile(_onceki: FormDurumu, veri: FormData): Promise<FormDurumu> {
  const sonuc = z
    .object({ sifre, sifreTekrar: z.string() })
    .refine((d) => d.sifre === d.sifreTekrar, { message: "Şifreler eşleşmiyor.", path: ["sifreTekrar"] })
    .safeParse({ sifre: veri.get("sifre"), sifreTekrar: veri.get("sifreTekrar") });

  if (!sonuc.success) {
    return { alanHatalari: alanHatalari(sonuc.error) };
  }

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase.auth.updateUser({ password: sonuc.data.sifre });

  if (error) {
    console.error("[auth] şifre güncelleme hatası", { mesaj: error.message });
    return { hata: hataMetni(error.message) };
  }

  redirect("/genel-bakis");
}

/* ------------------------------------------------------------------ */
/* Çıkış                                                               */
/* ------------------------------------------------------------------ */

export async function cikisYap(): Promise<void> {
  const supabase = await sunucuIstemcisi();
  await supabase.auth.signOut();
  redirect("/giris");
}
