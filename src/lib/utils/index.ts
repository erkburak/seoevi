import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind sınıflarını çakışmasız birleştirir. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------------ */
/* Biçimlendirme — Türkçe yerel ayar                                   */
/* ------------------------------------------------------------------ */

const sayiBicimi = new Intl.NumberFormat("tr-TR");
const paraBicimi = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});
const ondalikBicim = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

export function sayi(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return sayiBicimi.format(Math.round(value));
}

export function ondalik(value: number | null | undefined, basamak = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: basamak }).format(value);
}

export function para(value: number | null | undefined, currency = "TRY"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  if (currency === "TRY") return paraBicimi.format(value);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function yuzde(value: number | null | undefined, basamak = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `%${ondalikBicim.format(Number(value.toFixed(basamak)))}`;
}

/** Büyük sayıları kısaltır: 12.400 -> 12,4 B */
export function kisaSayi(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${ondalikBicim.format(value / 1_000_000)} Mn`;
  if (abs >= 1_000) return `${ondalikBicim.format(value / 1_000)} B`;
  return sayiBicimi.format(value);
}

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const tarihSaatBicimi = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function tarih(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return tarihBicimi.format(d);
}

export function tarihSaat(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return tarihSaatBicimi.format(d);
}

/** "3 gün önce" biçiminde göreli zaman. */
export function goreliZaman(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";

  const fark = Date.now() - d.getTime();
  const saniye = Math.round(fark / 1000);
  if (saniye < 60) return "az önce";
  const dakika = Math.round(saniye / 60);
  if (dakika < 60) return `${dakika} dakika önce`;
  const saat = Math.round(dakika / 60);
  if (saat < 24) return `${saat} saat önce`;
  const gun = Math.round(saat / 24);
  if (gun < 30) return `${gun} gün önce`;
  const ay = Math.round(gun / 30);
  if (ay < 12) return `${ay} ay önce`;
  return `${Math.round(ay / 12)} yıl önce`;
}

/* ------------------------------------------------------------------ */
/* Metin                                                               */
/* ------------------------------------------------------------------ */

const TR_HARITA: Record<string, string> = {
  ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
  ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
};

/** Türkçe karakterleri sadeleştirerek URL uyumlu slug üretir. */
export function slugify(metin: string): string {
  return metin
    .split("")
    .map((c) => TR_HARITA[c] ?? c)
    .join("")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function kirp(metin: string | null | undefined, uzunluk: number): string {
  if (!metin) return "";
  return metin.length <= uzunluk ? metin : `${metin.slice(0, uzunluk - 1)}…`;
}

/** Türkçe çoğul/tekil sayı ifadesi: "3 ürün", "1 ürün" */
export function adet(sayisi: number, ad: string): string {
  return `${sayi(sayisi)} ${ad}`;
}

/* ------------------------------------------------------------------ */
/* Alan adı                                                            */
/* ------------------------------------------------------------------ */

export type AlanAdiSonucu =
  | { gecerli: true; domain: string; url: string; kokAd: string }
  | { gecerli: false; hata: string };

/**
 * Kullanıcıdan gelen adresi normalize eder.
 * - protokol tamamlanır
 * - www kaldırılır
 * - sondaki eğik çizgi temizlenir
 */
export function alanAdiNormalize(girdi: string): AlanAdiSonucu {
  const ham = (girdi ?? "").trim();
  if (!ham) return { gecerli: false, hata: "Web sitesi adresi boş olamaz." };

  let aday = ham;
  if (!/^https?:\/\//i.test(aday)) aday = `https://${aday}`;

  let u: URL;
  try {
    u = new URL(aday);
  } catch {
    return { gecerli: false, hata: "Geçerli bir web sitesi adresi girin. Örnek: magazam.com" };
  }

  const yerel = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(u.hostname);
  let host = u.hostname.toLowerCase();
  if (host.startsWith("www.")) host = host.slice(4);

  if (!yerel && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host)) {
    return { gecerli: false, hata: "Geçerli bir web sitesi adresi girin. Örnek: magazam.com" };
  }

  if (!yerel && host.split(".").pop()!.length < 2) {
    return { gecerli: false, hata: "Web sitesi uzantısı geçersiz görünüyor." };
  }

  const parcalar = host.split(".");
  const kokAd = parcalar.length > 2 ? parcalar.slice(-3).join(".") : host;

  return {
    gecerli: true,
    domain: host,
    url: `${u.protocol}//${host}`,
    kokAd: kokAd.split(".")[0],
  };
}

/** URL'den yalnızca yolu döndürür. */
export function urlYolu(url: string | null | undefined): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    return `${u.pathname}${u.search}` || "/";
  } catch {
    return url;
  }
}

export function alanAdiCikar(url: string | null | undefined): string {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------ */
/* Diğer                                                               */
/* ------------------------------------------------------------------ */

export function arasinda(deger: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, deger));
}

export function buAy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function bekle(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
