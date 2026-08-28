import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { koduJetonaCevir, mulkleriListele } from "@/lib/gsc/client";
import { gscSenkronize } from "@/lib/gsc/senkron";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { alanAdiCikar } from "@/lib/utils";

/** Ayarlar sayfasına sonuç mesajıyla döner. */
function ayarlaraDon(istek: NextRequest, anahtar: string) {
  const url = new URL("/ayarlar", istek.nextUrl.origin);
  url.searchParams.set("gsc", anahtar);
  return NextResponse.redirect(url);
}

/**
 * Google'ın onay sonrası döndüğü adres.
 * Jetonu alır, kullanıcının mülkünü eşleştirir ve ilk senkronu başlatır.
 */
export async function GET(istek: NextRequest) {
  const kod = istek.nextUrl.searchParams.get("code");
  const durum = istek.nextUrl.searchParams.get("state");
  const hata = istek.nextUrl.searchParams.get("error");

  if (hata) {
    // Kullanıcı onayı reddetti — hata değil, tercih.
    return ayarlaraDon(istek, "iptal");
  }
  if (!kod || !durum) return ayarlaraDon(istek, "eksik");

  /* --- CSRF kontrolü --- */
  const cerezler = await cookies();
  const saklanan = cerezler.get("gsc_state")?.value;
  cerezler.delete("gsc_state");

  if (!saklanan) return ayarlaraDon(istek, "sure_doldu");

  const [beklenenDurum, projeId] = saklanan.split(":");
  if (beklenenDurum !== durum || !projeId) return ayarlaraDon(istek, "gecersiz");

  /* --- Oturum ve sahiplik --- */
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/giris", istek.nextUrl.origin));

  const yonetici = yoneticiIstemcisi();
  const { data: proje } = await yonetici
    .from("projects")
    .select("id, domain, user_id")
    .eq("id", projeId)
    .maybeSingle();

  if (!proje || proje.user_id !== user.id) return ayarlaraDon(istek, "yetkisiz");

  try {
    const { erisimJetonu, yenilemeJetonu, bitis } = await koduJetonaCevir(kod);
    const mulkler = await mulkleriListele(erisimJetonu);

    if (!mulkler.length) return ayarlaraDon(istek, "mulk_yok");

    /* --- Projenin alan adıyla eşleşen mülkü seç --- */
    // Search Console iki biçim kullanır: "sc-domain:magazam.com" ve
    // "https://magazam.com/". İkisi de denenir.
    const eslesen =
      mulkler.find((m) => m.siteUrl === `sc-domain:${proje.domain}`) ??
      mulkler.find((m) => alanAdiCikar(m.siteUrl) === proje.domain) ??
      null;

    if (!eslesen) return ayarlaraDon(istek, "eslesme_yok");

    const { error } = await yonetici.from("gsc_connections").upsert(
      {
        project_id: proje.id,
        user_id: user.id,
        property: eslesen.siteUrl,
        refresh_token: yenilemeJetonu,
        access_token: erisimJetonu,
        expires_at: bitis.toISOString(),
        last_error: null,
      },
      { onConflict: "project_id" },
    );

    if (error) {
      console.error("[gsc] bağlantı kaydedilemedi", { mesaj: error.message });
      return ayarlaraDon(istek, "kayit_hatasi");
    }

    // İlk veri çekimi arka planda; kullanıcı beklemez.
    void gscSenkronize(proje.id).catch((h) => {
      console.error("[gsc] ilk senkron başarısız", {
        mesaj: h instanceof Error ? h.message : String(h),
      });
    });

    return ayarlaraDon(istek, "basarili");
  } catch (h) {
    console.error("[gsc] bağlantı hatası", {
      mesaj: h instanceof Error ? h.message : String(h),
    });
    return ayarlaraDon(istek, "hata");
  }
}
