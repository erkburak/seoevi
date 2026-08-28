"use server";

import { headers } from "next/headers";

import { olayKaydet } from "@/lib/analytics";
import { hizliAnalizYap, type HizliAnalizSonucu } from "@/lib/araclar/hizli-analiz";
import { hizSiniriKontrol, istemciAdresi } from "@/lib/ratelimit";

export type UcretsizAnalizSonucu = {
  hata?: string;
  sonuc?: HizliAnalizSonucu;
};

/** Aynı IP adresinin saatlik analiz hakkı. */
const SAATLIK_LIMIT = 8;

/**
 * Herkese açık hızlı SEO analizi.
 * Dış veri sağlayıcısı kullanılmaz; sayfa doğrudan okunur.
 */
export async function ucretsizAnalizYap(
  _onceki: UcretsizAnalizSonucu,
  veri: FormData,
): Promise<UcretsizAnalizSonucu> {
  const site = String(veri.get("site") ?? "").trim();
  if (!site) return { hata: "Analiz etmek istediğiniz web sitesinin adresini girin." };

  const basliklar = await headers();
  const adres = istemciAdresi(basliklar);

  const sinir = await hizSiniriKontrol({
    anahtar: `ucretsiz-analiz:${adres}`,
    limit: SAATLIK_LIMIT,
    pencereSaniye: 3600,
  });

  if (!sinir.izinli) {
    return {
      hata: "Saatlik ücretsiz analiz hakkınızı kullandınız. Sınırsız analiz için ücretsiz hesap oluşturabilirsiniz.",
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
