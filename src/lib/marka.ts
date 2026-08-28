import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Marka ayarları ve sayfa üst verileri.
 *
 * İkisi de yetkili tarafından düzenlenebilir. Veritabanında kayıt yoksa
 * koddaki varsayılan kullanılır; böylece boş bir kurulumda da site
 * doğru çalışır.
 */

export type MarkaAyarlari = {
  logoUrl: string | null;
  faviconUrl: string | null;
  logoYukseklik: number;
};

const VARSAYILAN_MARKA: MarkaAyarlari = {
  logoUrl: null,
  faviconUrl: null,
  logoYukseklik: 28,
};

export async function markaAyarlari(): Promise<MarkaAyarlari> {
  try {
    const { data } = await yoneticiIstemcisi()
      .from("app_config")
      .select("value")
      .eq("key", "marka")
      .maybeSingle();

    const v = (data?.value ?? {}) as {
      logo_url?: string | null;
      favicon_url?: string | null;
      logo_yukseklik?: number;
    };

    return {
      logoUrl: v.logo_url ?? null,
      faviconUrl: v.favicon_url ?? null,
      logoYukseklik: v.logo_yukseklik ?? VARSAYILAN_MARKA.logoYukseklik,
    };
  } catch {
    return VARSAYILAN_MARKA;
  }
}

/* ------------------------------------------------------------------ */
/* Sayfa üst verileri                                                  */
/* ------------------------------------------------------------------ */

export type SayfaUstVerisi = {
  title: string | null;
  description: string | null;
  noindex: boolean;
};

/**
 * Bir yolun yetkili tarafından tanımlanmış üst verisini döndürür.
 * Kayıt yoksa null döner ve çağıran taraf kendi varsayılanını kullanır.
 */
export async function sayfaUstVerisi(yol: string): Promise<SayfaUstVerisi | null> {
  try {
    const { data } = await yoneticiIstemcisi()
      .from("page_meta")
      .select("title, description, noindex")
      .eq("path", yol)
      .maybeSingle();

    if (!data) return null;
    return {
      title: data.title,
      description: data.description,
      noindex: data.noindex ?? false,
    };
  } catch {
    return null;
  }
}

/** Tüm tanımlı üst verileri döndürür (yetkili ekranı için). */
export async function tumSayfaUstVerileri(): Promise<Map<string, SayfaUstVerisi>> {
  const harita = new Map<string, SayfaUstVerisi>();
  try {
    const { data } = await yoneticiIstemcisi()
      .from("page_meta")
      .select("path, title, description, noindex");

    for (const s of data ?? []) {
      harita.set(s.path, {
        title: s.title,
        description: s.description,
        noindex: s.noindex ?? false,
      });
    }
  } catch {
    // Boş harita döner; sayfalar varsayılanlarını kullanır.
  }
  return harita;
}

/**
 * Varsayılan üst veriyi veritabanındaki değerle birleştirir.
 * Yalnızca dolu alanlar ezilir; boş bırakılan alan varsayılanda kalır.
 */
export async function ustVeriBirlestir(
  yol: string,
  varsayilan: { title: string; description: string },
): Promise<{ title: string; description: string; noindex: boolean }> {
  const kayit = await sayfaUstVerisi(yol);

  return {
    title: kayit?.title?.trim() || varsayilan.title,
    description: kayit?.description?.trim() || varsayilan.description,
    noindex: kayit?.noindex ?? false,
  };
}
