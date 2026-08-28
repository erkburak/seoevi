"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { kategoriSkoru } from "@/lib/scoring";
import { sunucuIstemcisi } from "@/lib/supabase/server";

/** Kategoriye hedef anahtar kelime atar ve skoru yeniden hesaplar. */
export async function hedefKelimeKaydet(
  kategoriId: string,
  kelime: string,
): Promise<{ hata?: string }> {
  const sonuc = z
    .object({ kategoriId: z.string().uuid(), kelime: z.string().max(120) })
    .safeParse({ kategoriId, kelime });

  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { data: kategori } = await supabase
    .from("categories")
    .select("*, pages(title, title_length, meta_description_length, h1, internal_links_count)")
    .eq("id", kategoriId)
    .maybeSingle();

  if (!kategori) return { hata: "Kategori bulunamadı." };

  const sayfa = Array.isArray(kategori.pages) ? kategori.pages[0] : kategori.pages;

  const { skor, kontroller } = kategoriSkoru({
    title: sayfa?.title ?? null,
    titleUzunluk: sayfa?.title_length ?? null,
    metaAciklamaUzunluk: sayfa?.meta_description_length ?? null,
    h1: sayfa?.h1 ?? null,
    aciklamaUzunluk: kategori.description_length,
    urunSayisi: kategori.product_count,
    altKategoriSayisi: kategori.subcategory_count,
    icLink: kategori.internal_links_count,
    hedefKelime: kelime || null,
  });

  const { error } = await supabase
    .from("categories")
    .update({
      target_keyword: kelime || null,
      seo_score: skor,
      checks: { kontroller },
    })
    .eq("id", kategoriId);

  if (error) {
    console.error("[kategori] hedef kelime kaydedilemedi", { mesaj: error.message });
    return { hata: "Kaydedilemedi. Tekrar deneyin." };
  }

  revalidatePath(`/kategori-seo/${kategoriId}`);
  revalidatePath("/kategori-seo");
  return {};
}
