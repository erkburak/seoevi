import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Basit sayaç tabanlı hız sınırlama.
 *
 * Herkese açık uç noktaların kötüye kullanılmasını engeller.
 * Sayaçlar `api_cache` tablosundaki süreli anahtar-değer alanında tutulur;
 * ayrı bir altyapı gerektirmez ve süresi dolan kayıtlar aynı temizlik
 * işiyle silinir.
 */

export type HizSiniriSonucu = {
  izinli: boolean;
  kalan: number;
  sifirlanma: Date;
};

export async function hizSiniriKontrol({
  anahtar,
  limit,
  pencereSaniye,
}: {
  anahtar: string;
  limit: number;
  pencereSaniye: number;
}): Promise<HizSiniriSonucu> {
  const supabase = yoneticiIstemcisi();
  const cacheKey = `ratelimit:${anahtar}`;
  const simdi = Date.now();

  const { data } = await supabase
    .from("api_cache")
    .select("payload, expires_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  const gecerli = data && new Date(data.expires_at).getTime() > simdi;
  const mevcutSayac = gecerli ? Number((data.payload as { sayac?: number })?.sayac ?? 0) : 0;
  const sifirlanma = gecerli ? new Date(data.expires_at) : new Date(simdi + pencereSaniye * 1000);

  if (mevcutSayac >= limit) {
    return { izinli: false, kalan: 0, sifirlanma };
  }

  const { error } = await supabase.from("api_cache").upsert({
    cache_key: cacheKey,
    provider: "ratelimit",
    endpoint: "ratelimit",
    payload: { sayac: mevcutSayac + 1 },
    expires_at: sifirlanma.toISOString(),
  });

  if (error) {
    // Sayaç yazılamazsa istek engellenmez; sınırlama en iyi gayret esasıyla çalışır.
    console.warn("[hizsiniri] sayaç güncellenemedi", { anahtar, mesaj: error.message });
  }

  return { izinli: true, kalan: Math.max(0, limit - mevcutSayac - 1), sifirlanma };
}

/**
 * İstekten istemci IP adresini çıkarır.
 * Vercel arkasında x-forwarded-for ilk değeri gerçek istemcidir.
 */
export function istemciAdresi(basliklar: Headers): string {
  const iletilen = basliklar.get("x-forwarded-for");
  if (iletilen) return iletilen.split(",")[0]!.trim();
  return basliklar.get("x-real-ip") ?? "bilinmiyor";
}
