import "server-only";

import { createHash } from "node:crypto";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Herkese açık ücretsiz araçların günlük kotası.
 *
 * Oturum olmadığı için kota cihaz ve ağ imzasına bağlanır. Tek bir imzaya
 * güvenilmez:
 *
 *   parmak izi → gizli sekme ve çerez temizliğini aşar (donanım + tarayıcı
 *                özelliklerinden türetilir, çerezden bağımsızdır)
 *   IP         → aynı cihazda farklı tarayıcı kullanımını yakalar
 *
 * İkisi ayrı ayrı sayılır ve katı olan kazanır. IP limiti daha yüksek
 * tutulur, çünkü Türkiye'de mobil operatörler ve kurumsal ağlar çok sayıda
 * kullanıcıyı tek IP arkasında toplar (CGNAT); düşük bir IP limiti gerçek
 * kullanıcıları haksız yere engellerdi.
 *
 * Kesin koruma bu katmanlarda değil, aracın toplam günlük tavanındadır:
 * VPN ve farklı cihazlarla kotayı aşmak teknik olarak mümkündür, ancak
 * toplam harcama her koşulda tavanla sınırlıdır.
 */

/** Kota günü Türkiye saatine göre belirlenir; 00.00'da sıfırlanır. */
export function turkiyeGunu(tarih = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(tarih);
}

/** Bir sonraki sıfırlanmaya kalan süreyi saat:dakika olarak döndürür. */
export function sifirlanmayaKalan(tarih = new Date()): { saat: number; dakika: number } {
  const bicim = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(tarih);

  const saat = Number(bicim.find((p) => p.type === "hour")?.value ?? 0);
  const dakika = Number(bicim.find((p) => p.type === "minute")?.value ?? 0);

  const kalanDakika = (24 * 60 - (saat * 60 + dakika)) % (24 * 60);
  return { saat: Math.floor(kalanDakika / 60), dakika: kalanDakika % 60 };
}

/** Kimlik verilerini geri döndürülemez biçimde özetler. */
function ozetle(deger: string): string {
  const tuz = process.env.CRON_SECRET ?? "seoevi";
  return createHash("sha256").update(`${tuz}:${deger}`).digest("hex").slice(0, 40);
}

export type KotaAyari = {
  arac: string;
  /** Parmak izi başına günlük hak. */
  parmakIziLimiti: number;
  /** IP başına günlük hak — paylaşımlı ağlar için daha yüksek tutulur. */
  ipLimiti: number;
};

export type KotaDurumu = {
  izinli: boolean;
  kalan: number;
  limit: number;
  /** Hangi katman engelledi? */
  engel: "parmak_izi" | "ip" | null;
};

/** Sayaçları artırmadan mevcut hakkı okur. */
export async function kotaOku(
  ayar: KotaAyari,
  parmakIzi: string,
  ip: string,
): Promise<KotaDurumu> {
  const supabase = yoneticiIstemcisi();
  const gun = turkiyeGunu();

  const [pi, ipSayac] = await Promise.all([
    supabase.rpc("free_tool_quota_oku", {
      p_tool: ayar.arac,
      p_scope: "parmak_izi",
      p_anahtar: ozetle(parmakIzi),
      p_gun: gun,
    }),
    supabase.rpc("free_tool_quota_oku", {
      p_tool: ayar.arac,
      p_scope: "ip",
      p_anahtar: ozetle(ip),
      p_gun: gun,
    }),
  ]);

  const kullanilanPi = Number(pi.data ?? 0);
  const kullanilanIp = Number(ipSayac.data ?? 0);

  const kalanPi = Math.max(0, ayar.parmakIziLimiti - kullanilanPi);
  const kalanIp = Math.max(0, ayar.ipLimiti - kullanilanIp);

  return {
    izinli: kalanPi > 0 && kalanIp > 0,
    kalan: Math.min(kalanPi, kalanIp),
    limit: ayar.parmakIziLimiti,
    engel: kalanPi === 0 ? "parmak_izi" : kalanIp === 0 ? "ip" : null,
  };
}

/**
 * Bir hak tüketir. Her iki sayaç da atomik olarak artırılır;
 * biri limite takılırsa işlem reddedilir.
 */
export async function kotaTuket(
  ayar: KotaAyari,
  parmakIzi: string,
  ip: string,
): Promise<KotaDurumu> {
  const supabase = yoneticiIstemcisi();
  const gun = turkiyeGunu();

  // Önce parmak izi: cihaz bazlı kötüye kullanımın asıl engeli budur.
  const { data: piVeri, error: piHata } = await supabase.rpc("free_tool_quota_arttir", {
    p_tool: ayar.arac,
    p_scope: "parmak_izi",
    p_anahtar: ozetle(parmakIzi),
    p_gun: gun,
    p_limit: ayar.parmakIziLimiti,
  });

  if (piHata) {
    console.error("[kota] parmak izi sayacı artırılamadı", { mesaj: piHata.message });
    // Sayaç çalışmıyorsa hak verilmez; aksi hâlde sınırsız kullanım oluşur.
    return { izinli: false, kalan: 0, limit: ayar.parmakIziLimiti, engel: "parmak_izi" };
  }

  const pi = Array.isArray(piVeri) ? piVeri[0] : piVeri;
  if (!pi?.izinli) {
    return { izinli: false, kalan: 0, limit: ayar.parmakIziLimiti, engel: "parmak_izi" };
  }

  const { data: ipVeri, error: ipHata } = await supabase.rpc("free_tool_quota_arttir", {
    p_tool: ayar.arac,
    p_scope: "ip",
    p_anahtar: ozetle(ip),
    p_gun: gun,
    p_limit: ayar.ipLimiti,
  });

  if (ipHata) {
    console.error("[kota] ip sayacı artırılamadı", { mesaj: ipHata.message });
    return { izinli: false, kalan: 0, limit: ayar.parmakIziLimiti, engel: "ip" };
  }

  const ipSonuc = Array.isArray(ipVeri) ? ipVeri[0] : ipVeri;
  if (!ipSonuc?.izinli) {
    return { izinli: false, kalan: 0, limit: ayar.parmakIziLimiti, engel: "ip" };
  }

  return {
    izinli: true,
    kalan: Math.max(0, ayar.parmakIziLimiti - Number(pi.yeni_adet ?? 0)),
    limit: ayar.parmakIziLimiti,
    engel: null,
  };
}

/** Aracın bugün toplam kaç kez kullanıldığı — platform tavanı için. */
export async function aracGunlukToplam(arac: string): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase
    .from("free_tool_quota")
    .select("adet")
    .eq("tool", arac)
    .eq("scope", "parmak_izi")
    .eq("gun", turkiyeGunu());

  return (data ?? []).reduce((t, k) => t + Number(k.adet ?? 0), 0);
}
