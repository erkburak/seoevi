"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { URUN_SAYFASI_GUNLUK_TAVAN, URUN_SAYFASI_KOTASI } from "@/config/ucretsiz-araclar";
import { olayKaydet } from "@/lib/analytics";
import { aracGunlukToplam, kotaOku, kotaTuket, sifirlanmayaKalan } from "@/lib/araclar/kota";
import { urunSayfasiDenetle, type UrunSayfasiSonucu } from "@/lib/araclar/urun-sayfasi";
import { istemciAdresi } from "@/lib/ratelimit";

/**
 * Ürün Sayfası SEO Testi — herkese açık, günde 3 kontrol.
 *
 * Sayfayı doğrudan okuduğu için sağlayıcı maliyeti yoktur; kota kötüye
 * kullanımı ve kendi sunucu yükümüzü sınırlar. Kota Türkiye saatiyle her
 * gece 00.00'da sıfırlanır.
 */
const KOTA = URUN_SAYFASI_KOTASI;
const GUNLUK_TOPLAM_TAVAN = URUN_SAYFASI_GUNLUK_TAVAN;

export type UrunSayfasiAracSonucu = {
  hata?: string;
  sonuc?: UrunSayfasiSonucu;
  kalanHak?: number;
  sifirlanma?: { saat: number; dakika: number };
};

const Sema = z.object({
  adres: z.string().trim().min(3, "Ürün sayfasının adresini girin.").max(500),
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

export async function urunuDenetle(
  _onceki: UrunSayfasiAracSonucu,
  veri: FormData,
): Promise<UrunSayfasiAracSonucu> {
  const sonuc = Sema.safeParse({
    adres: veri.get("adres"),
    parmakIzi: veri.get("parmakIzi"),
  });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Bilgileri kontrol edin." };
  }

  const basliklar = await headers();
  const ip = istemciAdresi(basliklar);
  const sifirlanma = sifirlanmayaKalan();

  const toplam = await aracGunlukToplam(KOTA.arac);
  if (toplam >= GUNLUK_TOPLAM_TAVAN) {
    return {
      hata: "Bugünkü ücretsiz kontrol hakkının tamamı kullanıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açabilirsiniz.",
      sifirlanma,
    };
  }

  const kota = await kotaTuket(KOTA, sonuc.data.parmakIzi, ip);
  if (!kota.izinli) {
    return {
      hata:
        kota.engel === "ip"
          ? "Bu ağdan bugün çok sayıda kontrol yapıldı. Yarın tekrar deneyebilir veya ücretsiz hesap açabilirsiniz."
          : `Günlük ${KOTA.parmakIziLimiti} ücretsiz kontrol hakkınızı kullandınız. Hakkınız gece 00.00'da yenilenecek.`,
      kalanHak: 0,
      sifirlanma,
    };
  }

  try {
    const cevap = await urunSayfasiDenetle(sonuc.data.adres);

    if ("hata" in cevap) {
      return { hata: cevap.hata, kalanHak: kota.kalan, sifirlanma };
    }

    await olayKaydet({
      olay: "free_tool_used",
      kaynak: "urun-sayfasi-seo-testi",
      ozellikler: {
        alan_adi: cevap.alanAdi,
        skor: cevap.skor,
        urun_semasi: cevap.urunSemasiVar,
      },
    });

    return { sonuc: cevap, kalanHak: kota.kalan, sifirlanma };
  } catch (hata) {
    console.error("[urun-sayfasi] kontrol başarısız", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return {
      hata: "Kontrol tamamlanamadı. Birkaç dakika sonra tekrar deneyin.",
      kalanHak: kota.kalan,
      sifirlanma,
    };
  }
}
