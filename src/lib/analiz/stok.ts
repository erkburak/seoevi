import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import type { Proje } from "@/types/database";

/**
 * Stok–sıralama çakışması.
 *
 * E-ticarette sessizce en çok para kaybettiren durum budur: bir ürün
 * Google'da iyi sıralanıyor, trafik alıyor — ama stokta yok. Ziyaretçi
 * gelip boş dönüyor. Üstelik zamanla artan hemen çıkma oranı sıralamayı
 * da aşağı çekiyor, yani ürün geri geldiğinde eski yerinde olmuyor.
 *
 * Bu modül "sıralanıyor ama satılamıyor" ürünleri bulur ve kaybedilen
 * trafiği paraya çevirir. Mevcut tarama ve sıralama verisinden okur;
 * ek sağlayıcı çağrısı yapılmaz.
 */

/** Stokta olmadığını gösteren değerler (schema.org ve yaygın varyantlar). */
const STOKTA_YOK = [
  "outofstock",
  "out_of_stock",
  "soldout",
  "sold_out",
  "discontinued",
  "tukendi",
  "tükendi",
  "stokta yok",
];

export function stoktaYokMu(availability: string | null | undefined): boolean {
  if (!availability) return false;
  const t = availability.toLowerCase().replace(/[\s/]/g, "").replace("http://schema.org", "");
  return STOKTA_YOK.some((s) => t.includes(s.replace(/\s/g, "")));
}

export type StokCakismasi = {
  urunId: string;
  url: string;
  ad: string | null;
  availability: string | null;
  fiyat: number | null;
  /** Bu ürün sayfasında sıralanan kelime sayısı. */
  kelimeSayisi: number;
  /** En iyi sıra. */
  enIyiPozisyon: number | null;
  /** Aylık tahmini kaybedilen ziyaret. */
  kayipZiyaret: number;
  /** Kaç gündür stokta yok (izlenebiliyorsa). */
  gunSayisi: number | null;
};

export type StokOzeti = {
  cakisanUrun: number;
  toplamKayipZiyaret: number;
  toplamKelime: number;
  satirlar: StokCakismasi[];
};

/**
 * Sıralanan ama stokta olmayan ürünleri bulur.
 * Stok geçmişi de kaydedilir; böylece "kaç gündür yok" izlenebilir.
 */
export async function stokCakismalariniBul({
  proje,
  limit = 100,
}: {
  proje: Proje;
  limit?: number;
}): Promise<StokOzeti> {
  const supabase = yoneticiIstemcisi();

  const { data: urunler } = await supabase
    .from("products")
    .select("id, url, name, availability, price")
    .eq("project_id", proje.id)
    .not("availability", "is", null);

  if (!urunler?.length) {
    return { cakisanUrun: 0, toplamKayipZiyaret: 0, toplamKelime: 0, satirlar: [] };
  }

  const stoksuzlar = urunler.filter((u) => stoktaYokMu(u.availability));
  if (!stoksuzlar.length) {
    return { cakisanUrun: 0, toplamKayipZiyaret: 0, toplamKelime: 0, satirlar: [] };
  }

  // Bu ürün adreslerinde sıralanan kelimeler
  const urlSeti = stoksuzlar.map((u) => u.url);
  const { data: siralamalar } = await supabase
    .from("kelime_ozet")
    .select("url, position, etv")
    .eq("project_id", proje.id)
    .in("url", urlSeti.slice(0, 200))
    .not("position", "is", null);

  const urlBazli = new Map<string, { adet: number; enIyi: number; etv: number }>();
  for (const s of siralamalar ?? []) {
    if (!s.url) continue;
    const mevcut = urlBazli.get(s.url) ?? { adet: 0, enIyi: 999, etv: 0 };
    mevcut.adet += 1;
    mevcut.enIyi = Math.min(mevcut.enIyi, s.position ?? 999);
    mevcut.etv += Number(s.etv ?? 0);
    urlBazli.set(s.url, mevcut);
  }

  /* --- Stok geçmişi: değişim varsa kaydet --- */
  for (const u of stoksuzlar) {
    const { data: son } = await supabase
      .from("product_stock_history")
      .select("availability, created_at")
      .eq("product_id", u.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (son?.availability !== u.availability) {
      await supabase.from("product_stock_history").insert({
        project_id: proje.id,
        product_id: u.id,
        availability: u.availability,
        price: u.price,
      });
    }
  }

  /* --- Kaç gündür stokta yok? --- */
  const { data: gecmis } = await supabase
    .from("product_stock_history")
    .select("product_id, availability, created_at")
    .eq("project_id", proje.id)
    .in(
      "product_id",
      stoksuzlar.map((u) => u.id).slice(0, 200),
    )
    .order("created_at", { ascending: true });

  const ilkStoksuz = new Map<string, string>();
  for (const g of gecmis ?? []) {
    if (!stoktaYokMu(g.availability)) {
      // Stok geri geldiyse sayaç sıfırlanır.
      ilkStoksuz.delete(g.product_id);
      continue;
    }
    if (!ilkStoksuz.has(g.product_id)) ilkStoksuz.set(g.product_id, g.created_at);
  }

  const satirlar: StokCakismasi[] = stoksuzlar
    .map((u) => {
      const s = urlBazli.get(u.url);
      const baslangic = ilkStoksuz.get(u.id);

      return {
        urunId: u.id,
        url: u.url,
        ad: u.name,
        availability: u.availability,
        fiyat: u.price === null ? null : Number(u.price),
        kelimeSayisi: s?.adet ?? 0,
        enIyiPozisyon: s && s.enIyi < 999 ? s.enIyi : null,
        kayipZiyaret: Math.round((s?.etv ?? 0) * 100) / 100,
        gunSayisi: baslangic
          ? Math.floor((Date.now() - new Date(baslangic).getTime()) / 86_400_000)
          : null,
      };
    })
    // Yalnızca gerçekten sıralanan ürünler sorun sayılır.
    .filter((s) => s.kelimeSayisi > 0)
    .sort((a, b) => b.kayipZiyaret - a.kayipZiyaret)
    .slice(0, limit);

  return {
    cakisanUrun: satirlar.length,
    toplamKayipZiyaret: Math.round(satirlar.reduce((t, s) => t + s.kayipZiyaret, 0)),
    toplamKelime: satirlar.reduce((t, s) => t + s.kelimeSayisi, 0),
    satirlar,
  };
}
