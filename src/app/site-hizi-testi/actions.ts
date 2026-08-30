"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { SITE_HIZI_GUNLUK_TAVAN, SITE_HIZI_KOTASI } from "@/config/ucretsiz-araclar";
import { olayKaydet } from "@/lib/analytics";
import { aracGunlukToplam, kotaOku, kotaTuket, sifirlanmayaKalan } from "@/lib/araclar/kota";
import { siteHiziOlc, type SiteHiziSonucu } from "@/lib/araclar/site-hizi";
import { DataForSeoHatasi } from "@/lib/dataforseo/client";
import { istemciAdresi } from "@/lib/ratelimit";

/**
 * Site Hızı Testi — herkese açık, günde 2 ölçüm.
 * Kota Türkiye saatiyle her gece 00.00'da sıfırlanır.
 *
 * Ayarlar config/ucretsiz-araclar.ts içinde tutulur; "use server"
 * dosyaları sabit dışa aktaramaz.
 */
const KOTA = SITE_HIZI_KOTASI;
const GUNLUK_TOPLAM_TAVAN = SITE_HIZI_GUNLUK_TAVAN;

export type SiteHiziAracSonucu = {
  hata?: string;
  sonuc?: SiteHiziSonucu;
  kalanHak?: number;
  sifirlanma?: { saat: number; dakika: number };
};

const Sema = z.object({
  adres: z.string().trim().min(3, "Ölçmek istediğiniz sayfanın adresini girin.").max(500),
  cihaz: z.enum(["mobil", "masaustu"]).default("mobil"),
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

export async function hiziOlc(
  _onceki: SiteHiziAracSonucu,
  veri: FormData,
): Promise<SiteHiziAracSonucu> {
  const sonuc = Sema.safeParse({
    adres: veri.get("adres"),
    cihaz: veri.get("cihaz") ?? "mobil",
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
      hata: "Bugünkü ücretsiz ölçüm hakkının tamamı kullanıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açabilirsiniz.",
      sifirlanma,
    };
  }

  // 2. Kişisel kota — parmak izi ve IP ayrı ayrı.
  const kota = await kotaTuket(KOTA, sonuc.data.parmakIzi, ip);
  if (!kota.izinli) {
    return {
      hata:
        kota.engel === "ip"
          ? "Bu ağdan bugün çok sayıda ölçüm yapıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açabilirsiniz."
          : `Günlük ${KOTA.parmakIziLimiti} ücretsiz ölçüm hakkınızı kullandınız. Hakkınız gece 00.00'da yenilenecek.`,
      kalanHak: 0,
      sifirlanma,
    };
  }

  // 3. Ölçüm.
  try {
    const cevap = await siteHiziOlc({
      url: sonuc.data.adres,
      mobil: sonuc.data.cihaz === "mobil",
    });

    if ("hata" in cevap) {
      return { hata: cevap.hata, kalanHak: kota.kalan, sifirlanma };
    }

    await olayKaydet({
      olay: "free_tool_used",
      kaynak: "site-hizi-testi",
      ozellikler: {
        alan_adi: cevap.alanAdi,
        performans: cevap.performans,
        mobil: cevap.mobil,
      },
    });

    return { sonuc: cevap, kalanHak: kota.kalan, sifirlanma };
  } catch (hata) {
    const mesaj =
      hata instanceof DataForSeoHatasi
        ? hata.kullaniciMesaji
        : "Ölçüm tamamlanamadı. Birkaç dakika sonra tekrar deneyin.";

    console.error("[site-hizi] ölçüm başarısız", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    return { hata: mesaj, kalanHak: kota.kalan, sifirlanma };
  }
}
