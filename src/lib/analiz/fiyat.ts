import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { MerchantDenetimi } from "@/types/database";

/**
 * Fiyat konumu.
 *
 * SEO'nun tek başına yetmediği yer burasıdır: Google Alışveriş'te ilk
 * sırada olsanız bile, aynı ürünü satan sekiz satıcı arasında en pahalı
 * üçüncüyseniz tıklama başkasına gider. Sıralama kazanıp satış
 * kaybetmek e-ticarette çok yaygındır.
 *
 * Bu modül Merchant analizinde zaten toplanan satıcı ve fiyat verisini
 * okuyup "bu üründe fiyatım nerede duruyor" sorusunu cevaplar.
 * Ek sağlayıcı çağrısı yapılmaz.
 */

export type FiyatKonumu = {
  urunId: string | null;
  urunAdi: string | null;
  url: string | null;
  bizimFiyat: number | null;
  enUcuz: number | null;
  enPahali: number | null;
  ortalama: number | null;
  saticiSayisi: number;
  /** 1 = en ucuz. */
  sira: number | null;
  /** En ucuza göre fark (TL). */
  fark: number | null;
  /** En ucuza göre fark (%). */
  farkYuzde: number | null;
  /** Alışveriş sonuçlarında görünüyor muyuz? */
  gorunur: boolean;
  durum: "en_ucuz" | "rekabetci" | "pahali" | "cok_pahali" | "bilinmiyor";
};

export type FiyatOzeti = {
  incelenenUrun: number;
  pahaliUrun: number;
  enUcuzUrun: number;
  /** En ucuza göre ortalama fark yüzdesi. */
  ortalamaFarkYuzde: number | null;
  satirlar: FiyatKonumu[];
};

function durumBelirle(farkYuzde: number | null): FiyatKonumu["durum"] {
  if (farkYuzde === null) return "bilinmiyor";
  if (farkYuzde <= 0) return "en_ucuz";
  if (farkYuzde <= 5) return "rekabetci";
  if (farkYuzde <= 15) return "pahali";
  return "cok_pahali";
}

export const DURUM_ADI: Record<FiyatKonumu["durum"], string> = {
  en_ucuz: "En ucuz",
  rekabetci: "Rekabetçi",
  pahali: "Pahalı",
  cok_pahali: "Çok pahalı",
  bilinmiyor: "Veri yok",
};

/**
 * Merchant denetimlerinden fiyat konumunu çıkarır.
 */
export async function fiyatKonumlari(projeId: string, limit = 100): Promise<FiyatOzeti> {
  const supabase = yoneticiIstemcisi();

  const { data: denetimler } = await supabase
    .from("merchant_audits")
    .select("*, products(id, name, url, price)")
    .eq("project_id", projeId)
    .order("created_at", { ascending: false })
    .limit(limit * 2);

  if (!denetimler?.length) {
    return {
      incelenenUrun: 0,
      pahaliUrun: 0,
      enUcuzUrun: 0,
      ortalamaFarkYuzde: null,
      satirlar: [],
    };
  }

  // Ürün başına yalnızca en yeni denetim.
  const enYeni = new Map<string, (typeof denetimler)[number]>();
  for (const d of denetimler) {
    const anahtar = d.product_id ?? d.id;
    if (!enYeni.has(anahtar)) enYeni.set(anahtar, d);
  }

  const satirlar: FiyatKonumu[] = [];

  for (const d of enYeni.values()) {
    const denetim = d as unknown as MerchantDenetimi;
    const urun = Array.isArray(d.products) ? d.products[0] : d.products;

    const rakipler = (denetim.competitors ?? []).filter(
      (r): r is { alan_adi: string; fiyat: number; baslik: string | null } =>
        r.fiyat !== null && r.fiyat > 0,
    );

    const bizimFiyat = urun?.price === null || urun?.price === undefined ? null : Number(urun.price);

    // Kendi fiyatımız da dahil tüm fiyatlar
    const tumFiyatlar = [...rakipler.map((r) => r.fiyat), ...(bizimFiyat ? [bizimFiyat] : [])].sort(
      (a, b) => a - b,
    );

    if (!tumFiyatlar.length) continue;

    const enUcuz = tumFiyatlar[0];
    const enPahali = tumFiyatlar[tumFiyatlar.length - 1];
    const ortalama =
      Math.round((tumFiyatlar.reduce((t, f) => t + f, 0) / tumFiyatlar.length) * 100) / 100;

    const sira = bizimFiyat !== null ? tumFiyatlar.indexOf(bizimFiyat) + 1 : null;
    const fark = bizimFiyat !== null ? Math.round((bizimFiyat - enUcuz) * 100) / 100 : null;
    const farkYuzde =
      bizimFiyat !== null && enUcuz > 0
        ? Math.round(((bizimFiyat - enUcuz) / enUcuz) * 1000) / 10
        : null;

    satirlar.push({
      urunId: urun?.id ?? null,
      urunAdi: urun?.name ?? null,
      url: urun?.url ?? null,
      bizimFiyat,
      enUcuz,
      enPahali,
      ortalama,
      saticiSayisi: denetim.seller_count ?? tumFiyatlar.length,
      sira,
      fark,
      farkYuzde,
      gorunur: denetim.shopping_visible ?? false,
      durum: durumBelirle(farkYuzde),
    });
  }

  // En pahalı olanlar önce: en çok kaybettirenler.
  satirlar.sort((a, b) => (b.farkYuzde ?? -1) - (a.farkYuzde ?? -1));

  const farklar = satirlar
    .map((s) => s.farkYuzde)
    .filter((f): f is number => f !== null);

  return {
    incelenenUrun: satirlar.length,
    pahaliUrun: satirlar.filter((s) => s.durum === "pahali" || s.durum === "cok_pahali").length,
    enUcuzUrun: satirlar.filter((s) => s.durum === "en_ucuz").length,
    ortalamaFarkYuzde: farklar.length
      ? Math.round((farklar.reduce((t, f) => t + f, 0) / farklar.length) * 10) / 10
      : null,
    satirlar: satirlar.slice(0, limit),
  };
}
