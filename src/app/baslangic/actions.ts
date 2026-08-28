"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { ulkeKonumu } from "@/lib/dataforseo/locations";
import { isOlustur } from "@/lib/jobs/runner";
import { AKTIF_PROJE_COOKIE } from "@/lib/projects";
import { harcamaIzni } from "@/lib/guvenlik";
import { projeLimitiUygunMu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { alanAdiNormalize } from "@/lib/utils";
import type { SiteTuru } from "@/types/database";

const SITE_TURLERI = ["eticaret", "kurumsal", "hizmet", "blog", "pazaryeri", "diger"] as const;

const Sema = z.object({
  site: z.string().min(1, "Web sitesi adresi gerekli."),
  siteTuru: z.enum(SITE_TURLERI),
  hedef: z.string().min(1).max(120),
  rakipler: z.array(z.string()).max(3).default([]),
});

export type BaslangicSonucu = { hata?: string };

/**
 * Kurulumu tamamlar: projeyi oluşturur, rakipleri kaydeder ve
 * ilk analizi arka planda başlatır.
 */
export async function baslangiciTamamla(veri: {
  site: string;
  siteTuru: SiteTuru;
  hedef: string;
  rakipler: string[];
}): Promise<BaslangicSonucu> {
  const sonuc = Sema.safeParse(veri);
  if (!sonuc.success) {
    return { hata: "Bilgileri kontrol edip tekrar deneyin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris");

  const izin = await harcamaIzni(user);
  if (!izin.izinli) return { hata: izin.mesaj };

  const adres = alanAdiNormalize(sonuc.data.site);
  if (!adres.gecerli) return { hata: adres.hata };

  const limit = await projeLimitiUygunMu(user.id);
  if (!limit.uygun) {
    return {
      hata: `Paketinizde ${limit.limit} proje hakkı var. Yeni proje eklemek için paketinizi yükseltebilir veya bizimle iletişime geçebilirsiniz.`,
    };
  }

  const yonetici = yoneticiIstemcisi();

  // Aynı alan adı daha önce eklenmiş mi?
  const { data: mevcut } = await yonetici
    .from("projects")
    .select("id")
    .eq("user_id", user.id)
    .eq("domain", adres.domain)
    .eq("is_deleted", false)
    .maybeSingle();

  if (mevcut) {
    await profiliTamamla(user.id);
    await projeyiSec(mevcut.id);
    redirect("/genel-bakis");
  }

  const konum = await ulkeKonumu("TR");

  const { data: proje, error } = await yonetici
    .from("projects")
    .insert({
      user_id: user.id,
      name: adres.domain,
      domain: adres.domain,
      url: adres.url,
      site_type: sonuc.data.siteTuru,
      primary_goal: sonuc.data.hedef,
      country_code: "TR",
      location_code: konum.location_code,
      location_name: konum.location_name,
      language_code: "tr",
      language_name: "Turkish",
    })
    .select("*")
    .single();

  if (error || !proje) {
    console.error("[baslangic] proje oluşturulamadı", { mesaj: error?.message });
    return { hata: "Proje oluşturulamadı. Lütfen tekrar deneyin." };
  }

  await yonetici.from("project_settings").insert({ project_id: proje.id });

  const rakipler = sonuc.data.rakipler
    .map((r) => alanAdiNormalize(r))
    .filter((r) => r.gecerli)
    .map((r) => ({
      project_id: proje.id,
      domain: (r as { domain: string }).domain,
      source: "manuel" as const,
    }));

  if (rakipler.length) {
    await yonetici.from("competitors").insert(rakipler);
  }

  await profiliTamamla(user.id);
  await projeyiSec(proje.id);

  await olayKaydet({
    olay: "project_created",
    kaynak: "baslangic",
    kullaniciId: user.id,
    projeId: proje.id,
    ozellikler: { site_turu: sonuc.data.siteTuru, rakip_sayisi: rakipler.length },
  });
  await olayKaydet({ olay: "onboarding_completed", kullaniciId: user.id, projeId: proje.id });

  const is = await isOlustur({
    projeId: proje.id,
    kullaniciId: user.id,
    tur: "tam_analiz",
  });

  await olayKaydet({
    olay: "audit_started",
    kaynak: "baslangic",
    kullaniciId: user.id,
    projeId: proje.id,
  });

  redirect(`/genel-bakis?analiz=${is.id}`);
}

async function profiliTamamla(kullaniciId: string): Promise<void> {
  const yonetici = yoneticiIstemcisi();
  await yonetici
    .from("profiles")
    .update({ onboarded_at: new Date().toISOString(), onboarding_step: 4 })
    .eq("id", kullaniciId);
}

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

/** Onboarding sırasında rakip önerisi ister. */
export async function rakipOnerisiIste(site: string): Promise<string[]> {
  const adres = alanAdiNormalize(site);
  if (!adres.gecerli) return [];

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { rakipAdaylari } = await import("@/lib/dataforseo/labs");
    const konum = await ulkeKonumu("TR");
    const adaylar = await rakipAdaylari({
      domain: adres.domain,
      locationCode: konum.location_code,
      languageCode: "tr",
      limit: 6,
    });
    return adaylar.map((a) => a.alan_adi).filter((d) => d !== adres.domain);
  } catch (hata) {
    console.warn("[baslangic] rakip önerisi alınamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return [];
  }
}
