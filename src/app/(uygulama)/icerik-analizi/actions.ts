"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { isOlustur, isiIlerlet } from "@/lib/jobs/runner";
import { aktifProjeGetir } from "@/lib/projects";
import { harcamaIzni } from "@/lib/guvenlik";
import { limitKontrol, kullanimArtir } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";

export type IcerikSonucu = { hata?: string; basari?: string; isId?: string };

/**
 * Bir anahtar kelime için içerik analizi başlatır.
 * Analiz arka planda çalışır; kullanıcı beklemez.
 */
export async function icerikAnaliziBaslat(
  _onceki: IcerikSonucu,
  veri: FormData,
): Promise<IcerikSonucu> {
  const sonuc = z
    .object({ keyword: z.string().trim().min(2, "En az 2 karakterlik bir kelime girin.").max(120) })
    .safeParse({ keyword: veri.get("keyword") });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Anahtar kelimeyi kontrol edin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const izin = await harcamaIzni(user);
  if (!izin.izinli) return { hata: izin.mesaj };

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return { hata: "Aktif proje bulunamadı." };

  // İçerik analizi SERP çağrısı yaptığı için SERP limitine dahildir.
  const limit = await limitKontrol({ kullaniciId: user.id, metrik: "serp" });
  if (!limit.uygun) {
    return {
      hata: `Günlük SERP analizi limitinize ulaştınız (${limit.limit}). Yarın tekrar deneyebilir veya paketinizi yükseltebilirsiniz.`,
    };
  }

  const is = await isOlustur({
    projeId: proje.id,
    kullaniciId: user.id,
    tur: "icerik",
    params: { keyword: sonuc.data.keyword },
  });

  await kullanimArtir({ kullaniciId: user.id, metrik: "serp" });
  await olayKaydet({
    olay: "keyword_searched",
    kaynak: "icerik_analizi",
    kullaniciId: user.id,
    projeId: proje.id,
    ozellikler: { keyword: sonuc.data.keyword },
  });

  void isiIlerlet(is.id).catch((hata) => {
    console.error("[icerik] analiz başlatılamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  });

  revalidatePath("/icerik-analizi");
  return { basari: `"${sonuc.data.keyword}" için içerik analizi başladı.`, isId: is.id };
}

/** İçerik fırsatının durumunu günceller. */
export async function firsatDurumuGuncelle(
  firsatId: string,
  durum: "acik" | "planlandi" | "yazildi" | "yayinlandi",
): Promise<{ hata?: string }> {
  const sonuc = z
    .object({
      firsatId: z.string().uuid(),
      durum: z.enum(["acik", "planlandi", "yazildi", "yayinlandi"]),
    })
    .safeParse({ firsatId, durum });

  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase
    .from("content_opportunities")
    .update({ status: sonuc.data.durum })
    .eq("id", sonuc.data.firsatId);

  if (error) {
    console.error("[icerik] fırsat durumu güncellenemedi", { mesaj: error.message });
    return { hata: "Durum kaydedilemedi." };
  }

  revalidatePath("/icerik-analizi");
  return {};
}
