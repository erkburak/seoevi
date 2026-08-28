import "server-only";

import { createHash } from "node:crypto";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

import { maliyetiOlcerek } from "./client";

/**
 * DataForSEO yanıtları için kalıcı önbellek.
 *
 * Amaç: aynı veriyi tekrar tekrar satın almamak.
 *
 * Akış:
 *   İstek → önbellek anahtarı → taze kayıt var mı?
 *     ├─ var        → kayıttan dön (maliyet: 0)
 *     ├─ uçuşta var → aynı çağrıyı bekle (maliyet: 0)
 *     └─ yok        → sağlayıcıya git → maliyeti ölç → kaydet → dön
 *
 * Önbellek anahtarı kullanıcı veya proje içermez; bu bilinçlidir.
 * "vestel buzdolabı" SERP sonucu kimin sorduğundan bağımsız olarak aynıdır,
 * dolayısıyla tüm kullanıcılar aynı kaydı paylaşır. Popüler sorgularda
 * ikinci kullanıcıdan itibaren maliyet sıfırdır.
 */

/** Varsayılan yaşam süreleri (saniye). Verinin değişme hızına göre. */
const VARSAYILAN_SURELER: Record<string, number> = {
  keyword_data: 604_800, // 7 gün — arama hacimleri aylık güncellenir
  serp: 21_600, // 6 saat — sıralama takibi için taze olmalı
  serp_arac: 86_400, // 24 saat — ücretsiz araçlar için daha uzun
  labs: 259_200, // 3 gün
  onpage: 604_800, // 7 gün
  backlinks: 604_800, // 7 gün
  merchant: 259_200, // 3 gün
  content_analysis: 259_200, // 3 gün
  locations: 2_592_000, // 30 gün — neredeyse hiç değişmez
};

/**
 * Elle yenilemede kabul edilen azami yaş (saniye).
 *
 * Kullanıcı "Yenile" dediğinde önbellek körü körüne atlanmaz: veri bu
 * süreden gençse yine kayıttan verilir. Arka arkaya yenile tıklamaları
 * ve aynı domaini analiz eden farklı kullanıcılar iki kez ödetmez.
 */
const YENILEME_ASGARI_YASI: Record<string, number> = {
  keyword_data: 21_600, // 6 saat
  serp: 1_800, // 30 dakika
  serp_arac: 3_600,
  labs: 21_600, // 6 saat
  onpage: 3_600,
  backlinks: 43_200, // 12 saat
  merchant: 21_600,
  content_analysis: 21_600,
  locations: 604_800,
};

const ayarOnbellegi = new Map<string, { deger: Record<string, number>; zaman: number }>();

/**
 * Sayısal ayar tablosunu app_config üzerinden okur.
 * Süreler kod dağıtmadan değiştirilebilsin diye veritabanından gelir;
 * 5 dakikalık bellek önbelleği her çağrıda sorgu yapılmasını önler.
 */
async function ayarOku(
  anahtar: string,
  varsayilan: Record<string, number>,
): Promise<Record<string, number>> {
  const onbellek = ayarOnbellegi.get(anahtar);
  if (onbellek && Date.now() - onbellek.zaman < 300_000) return onbellek.deger;

  try {
    const supabase = yoneticiIstemcisi();
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", anahtar)
      .maybeSingle();

    const deger = { ...varsayilan, ...((data?.value as Record<string, number>) ?? {}) };
    ayarOnbellegi.set(anahtar, { deger, zaman: Date.now() });
    return deger;
  } catch {
    return varsayilan;
  }
}

const sureler = () => ayarOku("onbellek_sureleri", VARSAYILAN_SURELER);
const yenilemeYaslari = () => ayarOku("yenileme_asgari_yasi", YENILEME_ASGARI_YASI);

/**
 * Deterministik önbellek anahtarı üretir.
 * Anahtar bileşenleri sıralanır, böylece parametre sırası önemsizdir.
 */
export function onbellekAnahtari(endpoint: string, parametreler: Record<string, unknown>): string {
  const sirali = Object.keys(parametreler)
    .sort()
    .map((k) => `${k}=${JSON.stringify(parametreler[k])}`)
    .join("&");
  const ozet = createHash("sha256").update(`${endpoint}?${sirali}`).digest("hex").slice(0, 32);
  return `${endpoint}:${ozet}`;
}

/* ------------------------------------------------------------------ */
/* Uçuştaki istekler                                                   */
/* ------------------------------------------------------------------ */

/**
 * Aynı anda gelen özdeş istekler tek çağrıya indirilir.
 *
 * Örnek: aynı popüler kelimeyi üç kullanıcı aynı saniyede sorguladığında
 * sağlayıcıya bir kez gidilir, üçü de aynı sonucu alır. Süreç belleğinde
 * tutulur; sunucusuz ortamda örnek başına çalışır, yine de eşzamanlı
 * yığılmaların büyük kısmını karşılar.
 */
const ucustakiler = new Map<string, Promise<unknown>>();

/* ------------------------------------------------------------------ */
/* Tazelik politikası                                                  */
/* ------------------------------------------------------------------ */

export type Tazelik =
  /** Süresi dolmadıysa önbellekten ver (varsayılan). */
  | "onbellek"
  /** Kullanıcı yeniledi: kayıt asgari yaştan gençse yine önbellekten ver. */
  | "yenile"
  /** Önbelleği tamamen atla. Yalnızca hata ayıklama ve yönetim için. */
  | "zorla";

export type OnbellekSecenekleri = {
  endpoint: string;
  parametreler: Record<string, unknown>;
  grup: keyof typeof VARSAYILAN_SURELER | string;
  tazelik?: Tazelik;
  /**
   * Geriye dönük uyumluluk: true → "yenile".
   * Körü körüne atlama yerine asgari yaş kuralı uygulanır.
   */
  zorla?: boolean;
};

export type OnbellekSonucu<T> = {
  veri: T;
  onbellekten: boolean;
  /** Bu çağrıda sağlayıcıya ödenen tutar (USD). Önbellekten geldiyse 0. */
  maliyet: number;
};

/**
 * Önbellekten okur; yoksa üretici fonksiyonu çalıştırıp sonucu saklar.
 * Gerçekleşen sağlayıcı maliyeti ölçülür ve kayda yazılır.
 */
export async function onbellekli<T>(
  secenekler: OnbellekSecenekleri,
  uretici: () => Promise<T>,
): Promise<OnbellekSonucu<T>> {
  const { endpoint, parametreler, grup } = secenekler;
  const tazelik: Tazelik = secenekler.tazelik ?? (secenekler.zorla ? "yenile" : "onbellek");

  const anahtar = onbellekAnahtari(endpoint, parametreler);
  const supabase = yoneticiIstemcisi();

  /* --- 1. Önbellek okuması --- */
  if (tazelik !== "zorla") {
    const { data } = await supabase
      .from("api_cache")
      .select("payload, expires_at, created_at, hit_count")
      .eq("cache_key", anahtar)
      .maybeSingle();

    if (data) {
      const yas = (Date.now() - new Date(data.created_at).getTime()) / 1000;
      const suresiGecerli = new Date(data.expires_at).getTime() > Date.now();

      const asgariYas = tazelik === "yenile" ? ((await yenilemeYaslari())[grup] ?? 1_800) : 0;
      const kullanilabilir = tazelik === "onbellek" ? suresiGecerli : yas < asgariYas;

      if (kullanilabilir) {
        void supabase
          .from("api_cache")
          .update({ hit_count: (data.hit_count ?? 0) + 1 })
          .eq("cache_key", anahtar)
          .then(() => undefined);

        return { veri: data.payload as T, onbellekten: true, maliyet: 0 };
      }
    }
  }

  /* --- 2. Uçuştaki özdeş istek --- */
  const mevcut = ucustakiler.get(anahtar);
  if (mevcut && tazelik !== "zorla") {
    const veri = (await mevcut) as T;
    return { veri, onbellekten: true, maliyet: 0 };
  }

  /* --- 3. Sağlayıcı çağrısı --- */
  const calisma = (async () => {
    const { sonuc, maliyet } = await maliyetiOlcerek(uretici);

    const tumSureler = await sureler();
    const sure = tumSureler[grup] ?? 3600;

    const { error } = await supabase.from("api_cache").upsert(
      {
        cache_key: anahtar,
        endpoint,
        provider: "dataforseo",
        payload: sonuc as never,
        cost: maliyet,
        expires_at: new Date(Date.now() + sure * 1000).toISOString(),
        hit_count: 0,
        created_at: new Date().toISOString(),
      },
      { onConflict: "cache_key" },
    );

    if (error) {
      // Önbelleğe yazılamaması isteği bozmaz, yalnızca tasarrufu düşürür.
      console.warn("[onbellek] kayıt yazılamadı", { endpoint, mesaj: error.message });
    }

    return { sonuc, maliyet };
  })();

  ucustakiler.set(
    anahtar,
    calisma.then((r) => r.sonuc),
  );

  try {
    const { sonuc, maliyet } = await calisma;
    return { veri: sonuc, onbellekten: false, maliyet };
  } finally {
    ucustakiler.delete(anahtar);
  }
}

/** Süresi dolmuş kayıtları temizler. */
export async function onbellegiTemizle(): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase.rpc("purge_expired_cache");
  return (data as number) ?? 0;
}

/* ------------------------------------------------------------------ */
/* Ölçüm                                                               */
/* ------------------------------------------------------------------ */

export type OnbellekIstatistigi = {
  kayitSayisi: number;
  toplamIsabet: number;
  harcanan: number;
  /** Önbellek olmasaydı ödenecek ek tutar. */
  tasarruf: number;
  isabetOrani: number;
};

/**
 * Önbellek etkisini ölçer.
 *
 * Tasarruf = her kaydın isabet sayısı × o kaydın gerçek maliyeti.
 * Yani "bu veriyi tekrar satın alsaydık ne öderdik" sorusunun cevabı.
 */
export async function onbellekIstatistigi(gunSayisi = 30): Promise<OnbellekIstatistigi> {
  const supabase = yoneticiIstemcisi();
  const baslangic = new Date(Date.now() - gunSayisi * 86_400_000).toISOString();

  const { data } = await supabase
    .from("api_cache")
    .select("cost, hit_count")
    .gte("created_at", baslangic);

  const kayitlar = data ?? [];
  const harcanan = kayitlar.reduce((t, k) => t + Number(k.cost ?? 0), 0);
  const toplamIsabet = kayitlar.reduce((t, k) => t + Number(k.hit_count ?? 0), 0);
  const tasarruf = kayitlar.reduce(
    (t, k) => t + Number(k.cost ?? 0) * Number(k.hit_count ?? 0),
    0,
  );

  const toplamIstek = kayitlar.length + toplamIsabet;

  return {
    kayitSayisi: kayitlar.length,
    toplamIsabet,
    harcanan,
    tasarruf,
    isabetOrani: toplamIstek > 0 ? Math.round((toplamIsabet / toplamIstek) * 100) : 0,
  };
}
