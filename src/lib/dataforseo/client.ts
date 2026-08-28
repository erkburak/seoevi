import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

/**
 * DataForSEO HTTP istemcisi.
 *
 * Kimlik bilgileri yalnızca sunucu ortam değişkenlerinden okunur ve
 * hiçbir zaman yanıt gövdesine, log satırına veya istemciye taşınmaz.
 */

const TABAN_URL = "https://api.dataforseo.com/v3";
const SANDBOX_URL = "https://sandbox.dataforseo.com/v3";

/** Eşzamanlı istek sınırı — sağlayıcı limitlerine takılmamak için. */
const ESZAMANLI_SINIR = 6;

let aktifIstek = 0;
const kuyruk: (() => void)[] = [];

async function slotAl(): Promise<void> {
  if (aktifIstek < ESZAMANLI_SINIR) {
    aktifIstek++;
    return;
  }
  await new Promise<void>((resolve) => kuyruk.push(resolve));
  aktifIstek++;
}

function slotBirak(): void {
  aktifIstek--;
  const sonraki = kuyruk.shift();
  if (sonraki) sonraki();
}

/* ------------------------------------------------------------------ */
/* Maliyet ölçümü                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sağlayıcı her yanıtta o çağrının maliyetini döndürür. Bu maliyeti
 * önbellek katmanına taşımak için eşzamanlılığa dayanıklı bir bağlam
 * kullanılır; modül düzeyinde bir değişken paralel isteklerde karışırdı.
 */
const maliyetBaglami = new AsyncLocalStorage<{ toplam: number }>();

/** Verilen işi çalıştırır ve bu sırada oluşan sağlayıcı maliyetini döndürür. */
export async function maliyetiOlcerek<T>(
  is: () => Promise<T>,
): Promise<{ sonuc: T; maliyet: number }> {
  const kutu = { toplam: 0 };
  const sonuc = await maliyetBaglami.run(kutu, is);
  return { sonuc, maliyet: kutu.toplam };
}

/** Ölçüm bağlamı varsa maliyeti ekler. */
function maliyetEkle(tutar: number): void {
  const kutu = maliyetBaglami.getStore();
  if (kutu) kutu.toplam += tutar || 0;
}

export class DataForSeoHatasi extends Error {
  readonly kod: number;
  readonly kullaniciMesaji: string;
  readonly kalici: boolean;

  constructor(kod: number, teknikMesaj: string) {
    super(`DataForSEO ${kod}: ${teknikMesaj}`);
    this.name = "DataForSeoHatasi";
    this.kod = kod;
    this.kalici = KALICI_HATALAR.has(kod);
    this.kullaniciMesaji = kullaniciMesajiUret(kod);
  }
}

/**
 * Yeniden denemenin fayda etmeyeceği hata kodları.
 *
 * 40104 = sağlayıcı hesabı henüz doğrulanmamış. Yeniden denemek durumu
 * değiştirmez; hesap doğrulanana kadar her çağrı aynı yanıtı döndürür.
 */
const KALICI_HATALAR = new Set([401, 402, 403, 404, 40100, 40104, 40200, 40400, 40501]);

/** Yapılandırma kaynaklı olduğu için yöneticinin görmesi gereken hatalar. */
export const YAPILANDIRMA_HATALARI = new Set([401, 40100, 40104]);

function kullaniciMesajiUret(kod: number): string {
  if (kod === 40104) {
    return "Veri sağlayıcı hesabı henüz etkinleştirilmedi. Ekibimiz bilgilendirildi; kısa süre içinde çözülecek.";
  }
  if (kod === 401 || kod === 40100) {
    return "Veri sağlayıcısına bağlanılamadı. Ekibimiz bilgilendirildi; kısa süre içinde çözülecek.";
  }
  if (kod === 402 || kod === 40200) {
    return "Analiz kotası şu anda kullanılamıyor. Ekibimiz durumu inceliyor, kısa süre içinde tekrar deneyin.";
  }
  if (kod === 404 || kod === 40400) {
    return "Bu adres için veri bulunamadı. Adresi kontrol edip tekrar deneyebilirsiniz.";
  }
  if (kod === 429) {
    return "Şu anda yoğunluk var. Birkaç dakika sonra tekrar deneyin.";
  }
  return "Verileri alırken geçici bir sorun oluştu. Birkaç dakika sonra tekrar deneyebilirsiniz.";
}

function kimlik(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoHatasi(401, "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD tanımlı değil.");
  }
  return Buffer.from(`${login}:${password}`).toString("base64");
}

function tabanUrl(): string {
  return process.env.DATAFORSEO_MODE === "sandbox" ? SANDBOX_URL : TABAN_URL;
}

export type DfsGorev<T> = {
  id: string;
  status_code: number;
  status_message: string;
  cost: number;
  result: T[] | null;
  result_count: number;
};

export type DfsYanit<T> = {
  status_code: number;
  status_message: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DfsGorev<T>[];
};

/**
 * Ham istek. Başarılı olduğunda tüm görevleri döndürür.
 * Hatalar DataForSeoHatasi olarak yükseltilir; teknik detay log'a düşer.
 */
export async function dfsIstek<T>(
  endpoint: string,
  gövde?: unknown,
  method: "GET" | "POST" = "POST",
): Promise<DfsYanit<T>> {
  await slotAl();
  const baslangic = Date.now();

  try {
    const yanit = await fetch(`${tabanUrl()}${endpoint}`, {
      method,
      headers: {
        Authorization: `Basic ${kimlik()}`,
        "Content-Type": "application/json",
      },
      body: method === "POST" && gövde !== undefined ? JSON.stringify(gövde) : undefined,
      cache: "no-store",
    });

    const sure = Date.now() - baslangic;

    if (!yanit.ok) {
      // Sağlayıcı hata gövdesinde asıl nedeni döndürür (örneğin 40104 =
      // hesap doğrulanmamış). HTTP kodunu kullanmak bu ayrımı kaybettirir.
      const govde = (await yanit.json().catch(() => null)) as {
        status_code?: number;
        status_message?: string;
      } | null;

      const kod = govde?.status_code ?? yanit.status;
      const mesaj = govde?.status_message ?? `HTTP ${yanit.status}`;

      console.error("[dataforseo] http hatası", {
        endpoint,
        http: yanit.status,
        status_code: kod,
        status_message: mesaj,
        sure,
      });

      if (YAPILANDIRMA_HATALARI.has(kod)) {
        console.error(
          "[dataforseo] YAPILANDIRMA GEREKİYOR — sağlayıcı hesabı kullanılamıyor. " +
            "Analizler bu sorun giderilene kadar çalışmaz.",
          { status_code: kod, status_message: mesaj },
        );
      }

      throw new DataForSeoHatasi(kod, mesaj);
    }

    const veri = (await yanit.json()) as DfsYanit<T>;

    if (veri.status_code !== 20000) {
      console.error("[dataforseo] api hatası", {
        endpoint,
        status_code: veri.status_code,
        status_message: veri.status_message,
        sure,
      });
      throw new DataForSeoHatasi(veri.status_code, veri.status_message);
    }

    const hataliGorev = veri.tasks?.find((t) => t.status_code >= 40000);
    if (hataliGorev && veri.tasks.every((t) => t.status_code >= 40000)) {
      console.error("[dataforseo] görev hatası", {
        endpoint,
        status_code: hataliGorev.status_code,
        status_message: hataliGorev.status_message,
        sure,
      });
      throw new DataForSeoHatasi(hataliGorev.status_code, hataliGorev.status_message);
    }

    maliyetEkle(veri.cost);

    console.info("[dataforseo] istek", {
      endpoint,
      sure_ms: sure,
      maliyet: veri.cost,
      gorev: veri.tasks_count,
    });

    return veri;
  } catch (hata) {
    if (hata instanceof DataForSeoHatasi) throw hata;
    console.error("[dataforseo] bağlantı hatası", {
      endpoint,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    throw new DataForSeoHatasi(0, hata instanceof Error ? hata.message : "Bilinmeyen hata");
  } finally {
    slotBirak();
  }
}

/** İlk görevin ilk sonucunu döndürür. */
export async function dfsTekSonuc<T>(endpoint: string, gövde?: unknown, method: "GET" | "POST" = "POST"): Promise<T | null> {
  const yanit = await dfsIstek<T>(endpoint, gövde, method);
  return yanit.tasks?.[0]?.result?.[0] ?? null;
}

/** Tüm görevlerin sonuçlarını düzleştirir. */
export async function dfsTumSonuclar<T>(endpoint: string, gövde?: unknown, method: "GET" | "POST" = "POST"): Promise<T[]> {
  const yanit = await dfsIstek<T>(endpoint, gövde, method);
  return (yanit.tasks ?? []).flatMap((t) => t.result ?? []);
}

/** Üstel geri çekilme ile yeniden deneme. */
export async function yenidenDene<T>(
  islem: () => Promise<T>,
  { deneme = 3, bekleme = 800 }: { deneme?: number; bekleme?: number } = {},
): Promise<T> {
  let sonHata: unknown;

  for (let i = 0; i < deneme; i++) {
    try {
      return await islem();
    } catch (hata) {
      sonHata = hata;
      if (hata instanceof DataForSeoHatasi && hata.kalici) throw hata;
      if (i === deneme - 1) break;
      await new Promise((r) => setTimeout(r, bekleme * 2 ** i));
    }
  }

  throw sonHata;
}

/** Yapılandırmanın eksiksiz olup olmadığını bildirir. */
export function dfsHazirMi(): boolean {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}
