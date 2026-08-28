import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje, Profil } from "@/types/database";

export const AKTIF_PROJE_COOKIE = "seoevi_proje";

/** Oturumdaki kullanıcıyı döndürür; yoksa giriş sayfasına yönlendirir. */
export async function oturumKullanicisi() {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/giris");
  return user;
}

/** Kullanıcı profilini döndürür. */
export async function profilGetir(kullaniciId: string): Promise<Profil | null> {
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase.from("profiles").select("*").eq("id", kullaniciId).maybeSingle();
  return (data ?? null) as Profil | null;
}

/** Kullanıcının silinmemiş projeleri. */
export async function projeleriGetir(kullaniciId: string): Promise<Proje[]> {
  const supabase = await sunucuIstemcisi();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", kullaniciId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[projeler] okunamadı", { mesaj: error.message });
    return [];
  }
  return (data ?? []) as Proje[];
}

/**
 * Aktif projeyi belirler.
 * Sıra: çerezdeki proje → ilk proje. Proje yoksa null döner.
 */
export async function aktifProjeGetir(kullaniciId: string): Promise<{
  aktif: Proje | null;
  tumu: Proje[];
}> {
  const tumu = await projeleriGetir(kullaniciId);
  if (!tumu.length) return { aktif: null, tumu };

  const cerezler = await cookies();
  const secili = cerezler.get(AKTIF_PROJE_COOKIE)?.value;
  const aktif = tumu.find((p) => p.id === secili) ?? tumu[0];

  return { aktif, tumu };
}

/**
 * Uygulama sayfalarının ortak girişi: kullanıcı + aktif proje.
 * Proje yoksa proje oluşturma akışına yönlendirir.
 */
export async function projeBaglami() {
  const kullanici = await oturumKullanicisi();
  const profil = await profilGetir(kullanici.id);

  // Yönlendirme sunucu tarafında olduğu için kullanıcı panel ekranını hiç
  // görmez; nereden geldiğini bildirmek hedef sayfaya bırakılır.
  if (!profil?.onboarded_at) redirect("/baslangic?yonlendirildi=1");

  const { aktif, tumu } = await aktifProjeGetir(kullanici.id);
  if (!aktif) redirect("/projeler/yeni?yonlendirildi=1");

  return { kullanici, profil, proje: aktif, projeler: tumu };
}

/** Belirli bir projeyi sahiplik kontrolüyle döndürür. */
export async function projeGetir(projeId: string, kullaniciId: string): Promise<Proje | null> {
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projeId)
    .eq("user_id", kullaniciId)
    .eq("is_deleted", false)
    .maybeSingle();

  return (data ?? null) as Proje | null;
}

/** Projenin rakip alan adları. */
export async function rakipAlanAdlari(projeId: string): Promise<string[]> {
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase
    .from("competitors")
    .select("domain")
    .eq("project_id", projeId)
    .eq("is_active", true);

  return (data ?? []).map((r) => r.domain);
}

/** Sunucu işleri için sahiplik doğrulaması (servis rolü ile). */
export async function projeSahibiMi(projeId: string, kullaniciId: string): Promise<boolean> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projeId)
    .eq("user_id", kullaniciId)
    .maybeSingle();

  return Boolean(data);
}
