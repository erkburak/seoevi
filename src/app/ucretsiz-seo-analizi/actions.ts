"use server";

import { headers } from "next/headers";

import { olayKaydet } from "@/lib/analytics";
import { hizliAnalizYap, type HizliAnalizSonucu } from "@/lib/araclar/hizli-analiz";
import { aracGunlukToplam, kotaOku, kotaTuket, sifirlanmayaKalan } from "@/lib/araclar/kota";
import { istemciAdresi } from "@/lib/ratelimit";
import { SEO_ANALIZ_GUNLUK_TAVAN, SEO_ANALIZ_KOTASI } from "@/config/ucretsiz-araclar";

export type UcretsizAnalizSonucu = {
  hata?: string;
  sonuc?: HizliAnalizSonucu;
  /** Bugün kalan hak — arayüzde gösterilir. */
  kalan?: number;
};

/** Kalan günlük hakkı sorar; sayfa açılışında gösterilir. */
export async function kalanAnalizHakki(parmakIzi: string): Promise<{ kalan: number; limit: number }> {
  if (!parmakIzi || parmakIzi.length < 8) {
    return { kalan: SEO_ANALIZ_KOTASI.parmakIziLimiti, limit: SEO_ANALIZ_KOTASI.parmakIziLimiti };
  }
  const basliklar = await headers();
  const durum = await kotaOku(SEO_ANALIZ_KOTASI, parmakIzi, istemciAdresi(basliklar));
  return { kalan: durum.kalan, limit: durum.limit };
}

/**
 * Herkese açık hızlı SEO analizi.
 * Dış veri sağlayıcısı kullanılmaz; sayfa doğrudan okunur.
 */
export async function ucretsizAnalizYap(
  _onceki: UcretsizAnalizSonucu,
  veri: FormData,
): Promise<UcretsizAnalizSonucu> {
  const site = String(veri.get("site") ?? "").trim();
  const parmakIzi = String(veri.get("parmakIzi") ?? "");
  if (!site) return { hata: "Analiz etmek istediğiniz web sitesinin adresini girin." };

  const basliklar = await headers();
  const adres = istemciAdresi(basliklar);

  // Platform tavanı: kişisel kota aşılsa bile toplam maliyet sınırlı kalır.
  if ((await aracGunlukToplam(SEO_ANALIZ_KOTASI.arac)) >= SEO_ANALIZ_GUNLUK_TAVAN) {
    return { hata: "Bugünkü ücretsiz analiz kapasitesi doldu. Yarın tekrar deneyebilirsiniz." };
  }

  /*
   * Kota cihaz parmak iziyle tutulur; gizli sekme veya çerez temizlemek
   * hakkı sıfırlamaz. Sayaç Türkiye saatiyle her gece 00:00'da yenilenir.
   */
  const kota = await kotaTuket(SEO_ANALIZ_KOTASI, parmakIzi, adres);

  if (!kota.izinli) {
    const kalanSure = sifirlanmayaKalan();
    return {
      hata:
        `Bugünkü ücretsiz analiz hakkınızı kullandınız. Hakkınız ${kalanSure.saat} saat ` +
        `${kalanSure.dakika} dakika sonra yenilenecek — ücretsiz hesap açarak sitenizin ` +
        "tamamını analiz ettirebilirsiniz.",
      kalan: 0,
    };
  }

  const sonuc = await hizliAnalizYap(site);

  if ("hata" in sonuc) return { hata: sonuc.hata };

  await olayKaydet({
    olay: "free_tool_used",
    kaynak: "ucretsiz-seo-analizi",
    ozellikler: { alan_adi: sonuc.alanAdi, skor: sonuc.skor },
  });

  return { sonuc };
}
