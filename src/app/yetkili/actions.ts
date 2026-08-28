"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { GORUNTULEME_COOKIE, yetkiliMi, yonetimKaydi } from "@/lib/yetkili";

export type YetkiliSonucu = { hata?: string; basari?: string };

/** Her eylemin başında çalışır; arayüze güvenilmez. */
async function izin(): Promise<{ tamam: true; kullaniciId: string } | { tamam: false; hata: string }> {
  const { yetkili, kullaniciId } = await yetkiliMi();
  if (!yetkili || !kullaniciId) {
    return { tamam: false, hata: "Bu işlem için yetkiniz yok." };
  }
  return { tamam: true, kullaniciId };
}

/* ------------------------------------------------------------------ */
/* Abonelik ve paket                                                   */
/* ------------------------------------------------------------------ */

const PaketSemasi = z.object({
  kullaniciId: z.string().uuid(),
  planId: z.string().min(1).max(40),
  durum: z.enum(["deneme", "aktif", "gecikmis", "iptal", "sona_erdi"]),
  /** Dönem bitişi — boş bırakılırsa bir ay sonrası. */
  donemBitisi: z.string().optional(),
});

/** Bir kullanıcının paketini ve abonelik durumunu değiştirir. */
export async function paketDegistir(
  _onceki: YetkiliSonucu,
  veri: FormData,
): Promise<YetkiliSonucu> {
  const yetki = await izin();
  if (!yetki.tamam) return { hata: yetki.hata };

  const sonuc = PaketSemasi.safeParse({
    kullaniciId: veri.get("kullaniciId"),
    planId: veri.get("planId"),
    durum: veri.get("durum"),
    donemBitisi: veri.get("donemBitisi") || undefined,
  });

  if (!sonuc.success) return { hata: "Geçersiz istek. Alanları kontrol edin." };

  const supabase = yoneticiIstemcisi();

  const { data: plan } = await supabase
    .from("plans")
    .select("id, name")
    .eq("id", sonuc.data.planId)
    .maybeSingle();

  if (!plan) return { hata: "Seçilen paket bulunamadı." };

  const { data: mevcut } = await supabase
    .from("subscriptions")
    .select("plan_id, status")
    .eq("user_id", sonuc.data.kullaniciId)
    .maybeSingle();

  const bitis = sonuc.data.donemBitisi
    ? new Date(sonuc.data.donemBitisi).toISOString()
    : new Date(Date.now() + 30 * 86_400_000).toISOString();

  const guncelleme = {
    plan_id: sonuc.data.planId,
    status: sonuc.data.durum,
    current_period_start: new Date().toISOString(),
    current_period_end: bitis,
    trial_ends_at: sonuc.data.durum === "deneme" ? bitis : null,
  };

  const { error } = mevcut
    ? await supabase.from("subscriptions").update(guncelleme).eq("user_id", sonuc.data.kullaniciId)
    : await supabase
        .from("subscriptions")
        .insert({ user_id: sonuc.data.kullaniciId, ...guncelleme });

  if (error) {
    console.error("[yetkili] paket değiştirilemedi", { mesaj: error.message });
    return { hata: "Paket değiştirilemedi. Tekrar deneyin." };
  }

  await yonetimKaydi({
    yetkiliId: yetki.kullaniciId,
    islem: "paket_degistir",
    hedefId: sonuc.data.kullaniciId,
    detay: {
      onceki_plan: mevcut?.plan_id ?? null,
      yeni_plan: sonuc.data.planId,
      durum: sonuc.data.durum,
    },
  });

  revalidatePath("/yetkili/kullanicilar");
  return { basari: `Paket ${plan.name} olarak güncellendi.` };
}

/** Kullanıcının maliyetli işlem yapmasını durdurur veya yeniden açar. */
export async function kullaniciKisitla(
  kullaniciId: string,
  kisitli: boolean,
): Promise<YetkiliSonucu> {
  const yetki = await izin();
  if (!yetki.tamam) return { hata: yetki.hata };

  const sonuc = z.string().uuid().safeParse(kullaniciId);
  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const { error } = await yoneticiIstemcisi()
    .from("profiles")
    .update({ is_blocked: kisitli })
    .eq("id", sonuc.data);

  if (error) {
    console.error("[yetkili] kısıtlama değiştirilemedi", { mesaj: error.message });
    return { hata: "İşlem tamamlanamadı." };
  }

  await yonetimKaydi({
    yetkiliId: yetki.kullaniciId,
    islem: kisitli ? "kullanici_kisitla" : "kullanici_ac",
    hedefId: sonuc.data,
  });

  revalidatePath("/yetkili/kullanicilar");
  return { basari: kisitli ? "Hesap kısıtlandı." : "Kısıtlama kaldırıldı." };
}

/* ------------------------------------------------------------------ */
/* Marka                                                               */
/* ------------------------------------------------------------------ */

const IZINLI_TURLER = ["image/svg+xml", "image/png", "image/jpeg", "image/webp", "image/x-icon"];
const AZAMI_BOYUT = 2 * 1024 * 1024; // 2 MB

/** Logo veya favicon yükler. */
export async function markaGorseliYukle(
  _onceki: YetkiliSonucu,
  veri: FormData,
): Promise<YetkiliSonucu> {
  const yetki = await izin();
  if (!yetki.tamam) return { hata: yetki.hata };

  const tur = String(veri.get("tur") ?? "");
  if (tur !== "logo" && tur !== "favicon") return { hata: "Geçersiz görsel türü." };

  const dosya = veri.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) {
    return { hata: "Bir dosya seçin." };
  }

  if (!IZINLI_TURLER.includes(dosya.type)) {
    return { hata: "Yalnızca SVG, PNG, JPEG, WebP veya ICO dosyası yükleyebilirsiniz." };
  }

  if (dosya.size > AZAMI_BOYUT) {
    return { hata: "Dosya boyutu en fazla 2 MB olabilir." };
  }

  const supabase = yoneticiIstemcisi();

  // Uzantı dosya türünden türetilir; kullanıcı adına güvenilmez.
  const uzanti =
    dosya.type === "image/svg+xml" ? "svg"
    : dosya.type === "image/png" ? "png"
    : dosya.type === "image/webp" ? "webp"
    : dosya.type === "image/x-icon" ? "ico"
    : "jpg";

  // Tarayıcı önbelleğini kırmak için ada zaman damgası eklenir.
  const yol = `${tur}-${Date.now()}.${uzanti}`;

  const { error: yuklemeHatasi } = await supabase.storage
    .from("marka")
    .upload(yol, await dosya.arrayBuffer(), {
      contentType: dosya.type,
      upsert: true,
      cacheControl: "31536000",
    });

  if (yuklemeHatasi) {
    console.error("[yetkili] görsel yüklenemedi", { tur, mesaj: yuklemeHatasi.message });
    return { hata: "Dosya yüklenemedi. Tekrar deneyin." };
  }

  const { data: genelUrl } = supabase.storage.from("marka").getPublicUrl(yol);

  const { data: mevcut } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "marka")
    .maybeSingle();

  const deger = { ...((mevcut?.value as Record<string, unknown>) ?? {}) };
  deger[tur === "logo" ? "logo_url" : "favicon_url"] = genelUrl.publicUrl;

  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "marka", value: deger as never }, { onConflict: "key" });

  if (error) {
    console.error("[yetkili] marka ayarı kaydedilemedi", { mesaj: error.message });
    return { hata: "Ayar kaydedilemedi." };
  }

  await yonetimKaydi({
    yetkiliId: yetki.kullaniciId,
    islem: "marka_gorseli_yukle",
    detay: { tur, yol },
  });

  // Marka her sayfada göründüğü için tüm yollar tazelenir.
  revalidatePath("/", "layout");
  return { basari: tur === "logo" ? "Logo güncellendi." : "Favicon güncellendi." };
}

/** Yüklenen görseli kaldırır; koddaki varsayılan sembole dönülür. */
export async function markaGorseliSil(tur: "logo" | "favicon"): Promise<YetkiliSonucu> {
  const yetki = await izin();
  if (!yetki.tamam) return { hata: yetki.hata };

  const supabase = yoneticiIstemcisi();
  const { data: mevcut } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "marka")
    .maybeSingle();

  const deger = { ...((mevcut?.value as Record<string, unknown>) ?? {}) };
  deger[tur === "logo" ? "logo_url" : "favicon_url"] = null;

  await supabase.from("app_config").upsert({ key: "marka", value: deger as never }, { onConflict: "key" });

  await yonetimKaydi({ yetkiliId: yetki.kullaniciId, islem: "marka_gorseli_sil", detay: { tur } });

  revalidatePath("/", "layout");
  return { basari: "Varsayılan görsele dönüldü." };
}

/* ------------------------------------------------------------------ */
/* Sayfa üst verileri                                                  */
/* ------------------------------------------------------------------ */

const UstVeriSemasi = z.object({
  path: z.string().trim().min(1).max(120).regex(/^\//, "Yol / ile başlamalı."),
  title: z.string().trim().max(120),
  description: z.string().trim().max(320),
  noindex: z.boolean(),
});

/** Bir sayfanın başlık ve açıklamasını kaydeder. */
export async function sayfaUstVerisiKaydet(
  _onceki: YetkiliSonucu,
  veri: FormData,
): Promise<YetkiliSonucu> {
  const yetki = await izin();
  if (!yetki.tamam) return { hata: yetki.hata };

  const sonuc = UstVeriSemasi.safeParse({
    path: veri.get("path"),
    title: veri.get("title") ?? "",
    description: veri.get("description") ?? "",
    noindex: veri.get("noindex") === "on",
  });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const supabase = yoneticiIstemcisi();

  const { error } = await supabase.from("page_meta").upsert(
    {
      path: sonuc.data.path,
      // Boş bırakılan alan varsayılana döner.
      title: sonuc.data.title || null,
      description: sonuc.data.description || null,
      noindex: sonuc.data.noindex,
      updated_by: yetki.kullaniciId,
    },
    { onConflict: "path" },
  );

  if (error) {
    console.error("[yetkili] sayfa üst verisi kaydedilemedi", { mesaj: error.message });
    return { hata: "Kaydedilemedi. Tekrar deneyin." };
  }

  await yonetimKaydi({
    yetkiliId: yetki.kullaniciId,
    islem: "sayfa_ust_verisi",
    detay: { path: sonuc.data.path },
  });

  revalidatePath(sonuc.data.path);
  revalidatePath("/yetkili/sayfa-bilgileri");
  return { basari: `${sonuc.data.path} güncellendi.` };
}


/* ------------------------------------------------------------------ */
/* Kullanıcı olarak görüntüleme                                        */
/* ------------------------------------------------------------------ */

/**
 * Bir kullanıcının panelini salt okunur görüntülemeye başlar.
 *
 * Çerez tek başına yetki vermez: her istekte gerçek kullanıcının yetkili
 * olduğu yeniden doğrulanır. Kipte hiçbir yazma işlemi yapılamaz.
 */
export async function goruntulemeyeBasla(hedefKullaniciId: string): Promise<YetkiliSonucu> {
  const sonuc = z.string().uuid().safeParse(hedefKullaniciId);
  if (!sonuc.success) return { hata: "Geçersiz kullanıcı." };

  const { yetkili, kullaniciId } = await yetkiliMi();
  if (!yetkili || !kullaniciId) return { hata: "Bu işlem için yetkiniz yok." };
  if (sonuc.data === kullaniciId) return { hata: "Kendi hesabınızı görüntüleyemezsiniz." };

  const { data: hedef } = await yoneticiIstemcisi()
    .from("profiles")
    .select("id, email")
    .eq("id", sonuc.data)
    .maybeSingle();

  if (!hedef) return { hata: "Kullanıcı bulunamadı." };

  const cerezler = await cookies();
  cerezler.set(GORUNTULEME_COOKIE, sonuc.data, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Kip kalıcı olmamalı: unutulan bir görüntüleme oturumu risklidir.
    maxAge: 60 * 60,
  });

  await yonetimKaydi({
    yetkiliId: kullaniciId,
    islem: "goruntulemeye_basladi",
    hedefId: sonuc.data,
    detay: { eposta: hedef.email },
  });

  return { basari: `${hedef.email ?? "Kullanıcı"} olarak görüntüleniyor.` };
}

/** Görüntüleme kipinden çıkar. */
export async function goruntulemeyiBitir(): Promise<YetkiliSonucu> {
  const cerezler = await cookies();
  const hedef = cerezler.get(GORUNTULEME_COOKIE)?.value;
  cerezler.delete(GORUNTULEME_COOKIE);

  const { yetkili, kullaniciId } = await yetkiliMi();
  if (yetkili && kullaniciId && hedef) {
    await yonetimKaydi({ yetkiliId: kullaniciId, islem: "goruntulemeyi_bitirdi", hedefId: hedef });
  }

  return { basari: "Görüntüleme sonlandırıldı." };
}
