"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { ulkeKonumu } from "@/lib/dataforseo/locations";
import { isOlustur, isiIlerlet } from "@/lib/jobs/runner";
import { AKTIF_PROJE_COOKIE, aktifProjeGetir } from "@/lib/projects";
import { harcamaIzni } from "@/lib/guvenlik";
import { projeLimitiUygunMu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { alanAdiNormalize } from "@/lib/utils";
import type { SiteTuru } from "@/types/database";

const SITE_TURLERI = ["eticaret", "kurumsal", "hizmet", "blog", "pazaryeri", "diger"] as const;

export type ProjeSonucu = { hata?: string; basari?: string };

/** Aktif proje çerezini yazar. */
async function projeyiSec(projeId: string): Promise<void> {
  const cerezler = await cookies();
  cerezler.set(AKTIF_PROJE_COOKIE, projeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/**
 * Yeni proje oluşturur ve ilk analizi arka planda başlatır.
 * Plan limiti sunucu tarafında kontrol edilir.
 */
export async function projeOlustur(_onceki: ProjeSonucu, veri: FormData): Promise<ProjeSonucu> {
  const sonuc = z
    .object({
      site: z.string().min(1, "Web sitesi adresi gerekli."),
      siteTuru: z.enum(SITE_TURLERI),
    })
    .safeParse({
      site: veri.get("site"),
      siteTuru: veri.get("siteTuru") ?? "eticaret",
    });

  if (!sonuc.success) return { hata: "Web sitesi adresini ve türünü kontrol edin." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const izin = await harcamaIzni(user);
  if (!izin.izinli) return { hata: izin.mesaj };

  const adres = alanAdiNormalize(sonuc.data.site);
  if (!adres.gecerli) return { hata: adres.hata };

  const yonetici = yoneticiIstemcisi();

  // Zaten eklenmiş bir siteyi tekrar göndermek yeni proje açmaz; bu yüzden
  // limit kontrolünden önce bakılır, aksi hâlde kullanıcı kendi mevcut
  // projesi yüzünden limit hatası alır.
  const { data: mevcut } = await yonetici
    .from("projects")
    .select("id, is_deleted")
    .eq("user_id", user.id)
    .eq("domain", adres.domain)
    .eq("is_deleted", false)
    .maybeSingle();

  if (mevcut) {
    await projeyiSec(mevcut.id);
    redirect("/genel-bakis");
  }

  const limit = await projeLimitiUygunMu(user.id);
  if (!limit.uygun) {
    return {
      hata: `Paketinizde ${limit.limit} proje hakkı bulunuyor ve ${limit.mevcut} tanesini kullanıyorsunuz. Yeni proje eklemek için paketinizi yükseltebilirsiniz.`,
    };
  }

  const konum = await ulkeKonumu("TR");

  const { data: proje, error } = await yonetici
    .from("projects")
    .insert({
      user_id: user.id,
      name: adres.domain,
      domain: adres.domain,
      url: adres.url,
      site_type: sonuc.data.siteTuru as SiteTuru,
      country_code: "TR",
      location_code: konum.location_code,
      location_name: konum.location_name,
      language_code: "tr",
      language_name: "Turkish",
    })
    .select("id")
    .single();

  if (error || !proje) {
    console.error("[proje] oluşturulamadı", { mesaj: error?.message });
    return { hata: "Proje oluşturulamadı. Lütfen tekrar deneyin." };
  }

  await yonetici.from("project_settings").insert({ project_id: proje.id });
  await projeyiSec(proje.id);

  await olayKaydet({
    olay: "project_created",
    kaynak: "projeler",
    kullaniciId: user.id,
    projeId: proje.id,
    ozellikler: { site_turu: sonuc.data.siteTuru },
  });

  const is = await isOlustur({ projeId: proje.id, kullaniciId: user.id, tur: "tam_analiz" });
  await olayKaydet({ olay: "audit_started", kaynak: "projeler", kullaniciId: user.id, projeId: proje.id });

  void isiIlerlet(is.id).catch((hata) => {
    console.error("[proje] ilk analiz başlatılamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  });

  revalidatePath("/projeler");
  redirect(`/genel-bakis?analiz=${is.id}`);
}

/** Proje adını günceller. */
export async function projeAdiGuncelle(projeId: string, ad: string): Promise<ProjeSonucu> {
  const sonuc = z
    .object({ projeId: z.string().uuid(), ad: z.string().trim().min(1).max(80) })
    .safeParse({ projeId, ad });

  if (!sonuc.success) return { hata: "Proje adı 1-80 karakter olmalı." };

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase
    .from("projects")
    .update({ name: sonuc.data.ad })
    .eq("id", sonuc.data.projeId);

  if (error) {
    console.error("[proje] ad güncellenemedi", { mesaj: error.message });
    return { hata: "Proje adı kaydedilemedi." };
  }

  revalidatePath("/projeler");
  revalidatePath("/ayarlar");
  return { basari: "Proje adı güncellendi." };
}

/**
 * Projeyi siler. Veriler geri alınabilsin diye yumuşak silme kullanılır;
 * ilişkili analizler kullanıcıya görünmez olur.
 */
export async function projeSil(projeId: string, onayMetni: string): Promise<ProjeSonucu> {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { data: proje } = await supabase
    .from("projects")
    .select("id, domain")
    .eq("id", projeId)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!proje) return { hata: "Proje bulunamadı." };

  if (onayMetni.trim().toLowerCase() !== proje.domain.toLowerCase()) {
    return { hata: "Onaylamak için alan adını birebir yazın." };
  }

  const { error } = await supabase
    .from("projects")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", projeId);

  if (error) {
    console.error("[proje] silinemedi", { mesaj: error.message });
    return { hata: "Proje silinemedi. Tekrar deneyin." };
  }

  // Devam eden işler iptal edilir; boşuna DataForSEO maliyeti oluşmaz.
  const yonetici = yoneticiIstemcisi();
  await yonetici
    .from("audit_jobs")
    .update({ status: "iptal", completed_at: new Date().toISOString() })
    .eq("project_id", projeId)
    .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"]);

  await olayKaydet({
    olay: "project_deleted",
    kullaniciId: user.id,
    projeId,
    ozellikler: { domain: proje.domain },
  });

  const cerezler = await cookies();
  if (cerezler.get(AKTIF_PROJE_COOKIE)?.value === projeId) {
    cerezler.delete(AKTIF_PROJE_COOKIE);
  }

  const { aktif } = await aktifProjeGetir(user.id);
  revalidatePath("/projeler");

  if (!aktif) redirect("/projeler/yeni");
  return { basari: `${proje.domain} silindi.` };
}

/** Aktif projeyi değiştirip panele döner. */
export async function projeyeGec(veri: FormData): Promise<void> {
  const sonuc = z
    .object({ projeId: z.string().uuid() })
    .safeParse({ projeId: veri.get("projeId") });

  if (!sonuc.success) return;

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/giris");

  const { data: proje } = await supabase
    .from("projects")
    .select("id")
    .eq("id", sonuc.data.projeId)
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!proje) return;

  await projeyiSec(proje.id);
  redirect("/genel-bakis");
}
