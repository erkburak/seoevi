import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { SITE } from "@/config/site";

/**
 * Google Search Console istemcisi.
 *
 * Search Console verisi siteye özeldir; API anahtarıyla erişilemez.
 * Yalnızca site sahibinin OAuth onayıyla okunur. Yenileme anahtarı
 * veritabanında tutulur ve hiçbir zaman tarayıcıya gönderilmez.
 */

const YETKI_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const JETON_URL = "https://oauth2.googleapis.com/token";
const API_TABAN = "https://searchconsole.googleapis.com/webmasters/v3";

/** Yalnızca okuma izni istenir; hiçbir şey değiştirilmez. */
const KAPSAM = "https://www.googleapis.com/auth/webmasters.readonly";

export class GscHatasi extends Error {
  readonly kullaniciMesaji: string;

  constructor(teknik: string, kullanici?: string) {
    super(teknik);
    this.name = "GscHatasi";
    this.kullaniciMesaji =
      kullanici ?? "Search Console bağlantısında bir sorun oluştu. Bağlantıyı yenilemeyi deneyin.";
  }
}

export function gscHazirMi(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Google'a bildirilen yönlendirme adresi.
 *
 * `SITE.url` üzerinden gidilir: ortam değişkeni doğrudan okunursa
 * oradaki `http://` hatası buraya sızar ve Google isteği
 * `redirect_uri_mismatch` ile reddeder. Bu adresin Google Cloud
 * Console'daki kayıtla HARFİ HARFİNE aynı olması gerekir.
 */
function yonlendirmeAdresi(): string {
  return `${SITE.url}/api/gsc/callback`;
}

/**
 * Kullanıcıyı Google onay ekranına gönderecek adresi üretir.
 * `state` ile hangi projenin bağlandığı taşınır.
 */
export function yetkilendirmeAdresi(durum: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: yonlendirmeAdresi(),
    response_type: "code",
    scope: KAPSAM,
    // Yenileme anahtarı yalnızca offline erişimde ve onay zorlanınca gelir.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: durum,
  });
  return `${YETKI_URL}?${p.toString()}`;
}

type JetonYaniti = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

/** Onay kodunu jetonla takas eder. */
export async function koduJetonaCevir(kod: string): Promise<{
  erisimJetonu: string;
  yenilemeJetonu: string;
  bitis: Date;
}> {
  const yanit = await fetch(JETON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: kod,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: yonlendirmeAdresi(),
      grant_type: "authorization_code",
    }),
  });

  const veri = (await yanit.json()) as JetonYaniti;

  if (!yanit.ok || !veri.access_token) {
    console.error("[gsc] jeton alınamadı", {
      hata: veri.error,
      aciklama: veri.error_description,
    });
    throw new GscHatasi(
      veri.error_description ?? "jeton alınamadı",
      "Google ile bağlantı kurulamadı. Lütfen tekrar deneyin.",
    );
  }

  if (!veri.refresh_token) {
    // Kullanıcı daha önce onay verdiyse Google yenileme anahtarını
    // tekrar göndermez; prompt=consent bunu zorlar ama yine de kontrol edilir.
    throw new GscHatasi(
      "yenileme anahtarı gelmedi",
      "Google kalıcı erişim izni vermedi. Google Hesap ayarlarından SEO Evi erişimini kaldırıp tekrar bağlanın.",
    );
  }

  return {
    erisimJetonu: veri.access_token,
    yenilemeJetonu: veri.refresh_token,
    bitis: new Date(Date.now() + (veri.expires_in ?? 3600) * 1000),
  };
}

/** Süresi dolmuş erişim jetonunu yeniler. */
async function jetonYenile(yenilemeJetonu: string): Promise<{ jeton: string; bitis: Date }> {
  const yanit = await fetch(JETON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: yenilemeJetonu,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      grant_type: "refresh_token",
    }),
  });

  const veri = (await yanit.json()) as JetonYaniti;

  if (!yanit.ok || !veri.access_token) {
    console.error("[gsc] jeton yenilenemedi", { hata: veri.error });
    throw new GscHatasi(
      veri.error ?? "yenileme başarısız",
      "Search Console erişimi sona ermiş. Ayarlar sayfasından yeniden bağlanın.",
    );
  }

  return {
    jeton: veri.access_token,
    bitis: new Date(Date.now() + (veri.expires_in ?? 3600) * 1000),
  };
}

/**
 * Proje için geçerli bir erişim jetonu döndürür.
 * Süresi dolmuşsa sessizce yeniler ve kaydeder.
 */
export async function gecerliJeton(projeId: string): Promise<{ jeton: string; property: string }> {
  const supabase = yoneticiIstemcisi();

  const { data: baglanti } = await supabase
    .from("gsc_connections")
    .select("*")
    .eq("project_id", projeId)
    .maybeSingle();

  if (!baglanti) {
    throw new GscHatasi("bağlantı yok", "Bu proje için Search Console bağlı değil.");
  }

  // Bir dakikalık pay bırakılır; sınırda kalan jeton yenilenir.
  const gecerli =
    baglanti.access_token &&
    baglanti.expires_at &&
    new Date(baglanti.expires_at).getTime() > Date.now() + 60_000;

  if (gecerli) {
    return { jeton: baglanti.access_token!, property: baglanti.property };
  }

  const { jeton, bitis } = await jetonYenile(baglanti.refresh_token);

  await supabase
    .from("gsc_connections")
    .update({ access_token: jeton, expires_at: bitis.toISOString(), last_error: null })
    .eq("project_id", projeId);

  return { jeton, property: baglanti.property };
}

/* ------------------------------------------------------------------ */
/* API çağrıları                                                       */
/* ------------------------------------------------------------------ */

export type GscMulk = { siteUrl: string; permissionLevel: string };

/** Kullanıcının erişebildiği Search Console mülklerini listeler. */
export async function mulkleriListele(erisimJetonu: string): Promise<GscMulk[]> {
  const yanit = await fetch(`${API_TABAN}/sites`, {
    headers: { Authorization: `Bearer ${erisimJetonu}` },
  });

  if (!yanit.ok) {
    const govde = await yanit.text();
    console.error("[gsc] mülkler alınamadı", { durum: yanit.status, govde: govde.slice(0, 200) });
    throw new GscHatasi(
      `mülk listesi ${yanit.status}`,
      "Search Console mülkleriniz okunamadı. Google hesabınızda doğrulanmış bir site olduğundan emin olun.",
    );
  }

  const veri = (await yanit.json()) as { siteEntry?: GscMulk[] };
  return veri.siteEntry ?? [];
}

export type GscSatiri = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

/**
 * Arama performansı sorgusu.
 * `boyut` "query" veya "page" olabilir.
 */
export async function performansSorgusu({
  jeton,
  property,
  baslangic,
  bitis,
  boyut,
  limit = 1000,
}: {
  jeton: string;
  property: string;
  baslangic: string;
  bitis: string;
  boyut: "query" | "page";
  limit?: number;
}): Promise<GscSatiri[]> {
  const yanit = await fetch(
    `${API_TABAN}/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jeton}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: baslangic,
        endDate: bitis,
        dimensions: [boyut],
        rowLimit: limit,
        // Türkiye pazarına odaklanılır; başka ülkeler gürültü yaratır.
        dimensionFilterGroups: [
          {
            filters: [{ dimension: "country", operator: "equals", expression: "tur" }],
          },
        ],
      }),
    },
  );

  if (!yanit.ok) {
    const govde = await yanit.text();
    console.error("[gsc] performans sorgusu başarısız", {
      durum: yanit.status,
      boyut,
      govde: govde.slice(0, 200),
    });
    throw new GscHatasi(`performans ${yanit.status}`);
  }

  const veri = (await yanit.json()) as { rows?: GscSatiri[] };
  return veri.rows ?? [];
}
