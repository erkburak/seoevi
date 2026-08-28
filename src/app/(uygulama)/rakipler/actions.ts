"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { isOlustur, isiIlerlet } from "@/lib/jobs/runner";
import { aktifProjeGetir } from "@/lib/projects";
import { harcamaIzni } from "@/lib/guvenlik";
import { abonelikDurumu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { alanAdiNormalize } from "@/lib/utils";

export type RakipSonucu = { hata?: string; basari?: string };

/** Projeye rakip ekler ve rakip analizini başlatır. */
export async function rakipEkle(_onceki: RakipSonucu, veri: FormData): Promise<RakipSonucu> {
  const sonuc = z
    .object({ domain: z.string().min(1, "Rakip alan adı gerekli.") })
    .safeParse({ domain: veri.get("domain") });

  if (!sonuc.success) return { hata: "Rakip alan adı gerekli." };

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return { hata: "Aktif proje bulunamadı." };

  const izin = await harcamaIzni(user);
  if (!izin.izinli) return { hata: izin.mesaj };

  const adres = alanAdiNormalize(sonuc.data.domain);
  if (!adres.gecerli) return { hata: adres.hata };

  if (adres.domain === proje.domain) {
    return { hata: "Kendi alan adınızı rakip olarak ekleyemezsiniz." };
  }

  const yonetici = yoneticiIstemcisi();
  const { limitler } = await abonelikDurumu(user.id);

  const { count } = await yonetici
    .from("competitors")
    .select("id", { count: "exact", head: true })
    .eq("project_id", proje.id);

  if ((count ?? 0) >= (limitler?.rakip ?? 0)) {
    return {
      hata: `Paketinizde ${limitler?.rakip ?? 0} rakip takip edebilirsiniz. Daha fazlası için paketinizi yükseltin.`,
    };
  }

  const { error } = await yonetici.from("competitors").insert({
    project_id: proje.id,
    domain: adres.domain,
    source: "manuel",
  });

  if (error) {
    if (error.code === "23505") return { hata: "Bu rakip zaten ekli." };
    console.error("[rakip] eklenemedi", { mesaj: error.message });
    return { hata: "Rakip eklenemedi. Tekrar deneyin." };
  }

  await olayKaydet({
    olay: "competitor_added",
    kullaniciId: user.id,
    projeId: proje.id,
    ozellikler: { domain: adres.domain },
  });

  const is = await isOlustur({ projeId: proje.id, kullaniciId: user.id, tur: "rakip" });
  void isiIlerlet(is.id).catch((hata) => {
    console.error("[rakip] analiz başlatılamadı", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  });

  revalidatePath("/rakipler");
  return { basari: `${adres.domain} eklendi. Analiz arka planda başladı.` };
}

/** Rakibi ve ilgili verilerini kaldırır. */
export async function rakipSil(rakipId: string): Promise<RakipSonucu> {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { error } = await supabase.from("competitors").delete().eq("id", rakipId);

  if (error) {
    console.error("[rakip] silinemedi", { mesaj: error.message });
    return { hata: "Rakip kaldırılamadı." };
  }

  revalidatePath("/rakipler");
  return { basari: "Rakip kaldırıldı." };
}

/** Rakip analizini yeniden çalıştırır. */
export async function rakipAnaliziniYenile(): Promise<RakipSonucu> {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return { hata: "Aktif proje bulunamadı." };

  const is = await isOlustur({ projeId: proje.id, kullaniciId: user.id, tur: "rakip" });
  void isiIlerlet(is.id).catch(() => undefined);

  revalidatePath("/rakipler");
  return { basari: "Rakip analizi başlatıldı." };
}
