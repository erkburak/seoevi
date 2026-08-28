"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { SIRA_BULUCU_GUNLUK_TAVAN, SIRA_BULUCU_KOTASI } from "@/config/ucretsiz-araclar";
import { aracGunlukToplam, kotaOku, kotaTuket, sifirlanmayaKalan } from "@/lib/araclar/kota";
import { siraBul, type SiraSonucu } from "@/lib/araclar/sira-bulucu";
import { DataForSeoHatasi } from "@/lib/dataforseo/client";
import { istemciAdresi } from "@/lib/ratelimit";

/**
 * Google Sıra Bulucu — herkese açık, günde 3 hak.
 * Kota Türkiye saatiyle her gece 00.00'da sıfırlanır.
 *
 * Ayarlar config/ucretsiz-araclar.ts içinde tutulur; "use server"
 * dosyaları sabit dışa aktaramaz.
 */
const KOTA = SIRA_BULUCU_KOTASI;
const GUNLUK_TOPLAM_TAVAN = SIRA_BULUCU_GUNLUK_TAVAN;

export type SiraBulucuSonucu = {
  hata?: string;
  sonuc?: SiraSonucu;
  kalanHak?: number;
  sifirlanma?: { saat: number; dakika: number };
};

const Sema = z.object({
  site: z.string().trim().min(3, "Web sitesi adresini girin.").max(255),
  keyword: z.string().trim().min(2, "Anahtar kelimeyi girin.").max(120),
  cihaz: z.enum(["desktop", "mobile"]).default("desktop"),
  parmakIzi: z.string().trim().min(8).max(128),
});

/** Sayfa açılışında kalan hakkı döndürür (sayaç artırmaz). */
export async function kalanHakSor(parmakIzi: string): Promise<{ kalan: number; limit: number }> {
  if (!parmakIzi || parmakIzi.length < 8) {
    return { kalan: KOTA.parmakIziLimiti, limit: KOTA.parmakIziLimiti };
  }
  const basliklar = await headers();
  const durum = await kotaOku(KOTA, parmakIzi, istemciAdresi(basliklar));
  return { kalan: durum.kalan, limit: durum.limit };
}

export async function siraSorgula(
  _onceki: SiraBulucuSonucu,
  veri: FormData,
): Promise<SiraBulucuSonucu> {
  const sonuc = Sema.safeParse({
    site: veri.get("site"),
    keyword: veri.get("keyword"),
    cihaz: veri.get("cihaz") ?? "desktop",
    parmakIzi: veri.get("parmakIzi"),
  });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const basliklar = await headers();
  const ip = istemciAdresi(basliklar);
  const sifirlanma = sifirlanmayaKalan();

  // 1. Aracın günlük toplam tavanı — bütçenin son emniyet valfi.
  const toplam = await aracGunlukToplam(KOTA.arac);
  if (toplam >= GUNLUK_TOPLAM_TAVAN) {
    return {
      hata: "Bugünkü ücretsiz sorgu hakkının tamamı kullanıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açarak sınırsız sorgulayabilirsiniz.",
      sifirlanma,
    };
  }

  // 2. Kişisel kota — parmak izi ve IP ayrı ayrı.
  const kota = await kotaTuket(KOTA, sonuc.data.parmakIzi, ip);
  if (!kota.izinli) {
    return {
      hata:
        kota.engel === "ip"
          ? "Bu ağdan bugün çok sayıda sorgu yapıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açabilirsiniz."
          : `Günlük ${KOTA.parmakIziLimiti} ücretsiz sorgu hakkınızı kullandınız. Hakkınız gece 00.00'da yenilenecek.`,
      kalanHak: 0,
      sifirlanma,
    };
  }

  // 3. Sorgu.
  try {
    const cevap = await siraBul({
      site: sonuc.data.site,
      keyword: sonuc.data.keyword,
      cihaz: sonuc.data.cihaz,
    });

    if ("hata" in cevap) {
      return { hata: cevap.hata, kalanHak: kota.kalan, sifirlanma };
    }

    await olayKaydet({
      olay: "free_tool_used",
      kaynak: "google-sira-bulucu",
      ozellikler: {
        alan_adi: cevap.alanAdi,
        pozisyon: cevap.pozisyon,
        cihaz: cevap.cihaz,
      },
    });

    return { sonuc: cevap, kalanHak: kota.kalan, sifirlanma };
  } catch (hata) {
    const mesaj =
      hata instanceof DataForSeoHatasi
        ? hata.kullaniciMesaji
        : "Sorgu tamamlanamadı. Birkaç dakika sonra tekrar deneyin.";

    console.error("[sira-bulucu] sorgu başarısız", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    return { hata: mesaj, kalanHak: kota.kalan, sifirlanma };
  }
}
