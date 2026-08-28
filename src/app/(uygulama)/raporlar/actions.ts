"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { olayKaydet } from "@/lib/analytics";
import { raporOlustur } from "@/lib/analiz/rapor";
import { RAPOR_BOLUMLERI, type RaporBolumu } from "@/lib/analiz/rapor-bolumleri";
import { aktifProjeGetir } from "@/lib/projects";
import { kullanimArtir, limitKontrol } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { yazmaEngeliVarMi } from "@/lib/yetkili";

export type RaporSonucu = { hata?: string };

const DONEMLER = { "7": 7, "30": 30, "90": 90, tumu: null } as const;

/** Seçilen bölümlerden bir SEO raporu oluşturur. */
export async function raporUret(_onceki: RaporSonucu, veri: FormData): Promise<RaporSonucu> {
  const secilenBolumler = veri.getAll("bolumler").map(String);

  const sonuc = z
    .object({
      baslik: z.string().trim().min(2, "Rapor başlığı en az 2 karakter olmalı.").max(120),
      donem: z.enum(["7", "30", "90", "tumu"]),
      bolumler: z
        .array(z.enum(RAPOR_BOLUMLERI))
        .min(1, "En az bir bölüm seçin."),
    })
    .safeParse({
      baslik: veri.get("baslik"),
      donem: veri.get("donem") ?? "30",
      bolumler: secilenBolumler,
    });

  if (!sonuc.success) {
    return { hata: sonuc.error.issues[0]?.message ?? "Rapor bilgilerini kontrol edin." };
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hata: "Oturum bulunamadı." };

  // Görüntüleme kipi salt okunurdur; yetkili başkasının hesabında
  // değişiklik yapamaz.
  const yazmaEngeli = await yazmaEngeliVarMi();
  if (yazmaEngeli) return { hata: yazmaEngeli };


  const { aktif: proje } = await aktifProjeGetir(user.id);
  if (!proje) return { hata: "Aktif proje bulunamadı." };

  const limit = await limitKontrol({ kullaniciId: user.id, metrik: "rapor" });
  if (!limit.uygun) {
    return {
      hata: `Bu ay ${limit.limit} rapor oluşturma hakkınızı kullandınız. Daha fazlası için paketinizi yükseltebilirsiniz.`,
    };
  }

  const gunSayisi = DONEMLER[sonuc.data.donem];
  const donemBaslangici = gunSayisi ? new Date(Date.now() - gunSayisi * 86_400_000) : null;

  const rapor = await raporOlustur({
    proje,
    kullaniciId: user.id,
    baslik: sonuc.data.baslik,
    bolumler: sonuc.data.bolumler as RaporBolumu[],
    donemBaslangici,
  });

  if ("hata" in rapor) return { hata: rapor.hata };

  await kullanimArtir({ kullaniciId: user.id, metrik: "rapor" });
  await olayKaydet({
    olay: "report_created",
    kullaniciId: user.id,
    projeId: proje.id,
    ozellikler: { bolum_sayisi: sonuc.data.bolumler.length, donem: sonuc.data.donem },
  });

  revalidatePath("/raporlar");
  redirect(`/raporlar/${rapor.id}`);
}

/** Raporu siler. */
export async function raporSil(raporId: string): Promise<RaporSonucu> {
  const sonuc = z.string().uuid().safeParse(raporId);
  if (!sonuc.success) return { hata: "Geçersiz istek." };

  const supabase = await sunucuIstemcisi();
  const { error } = await supabase.from("reports").delete().eq("id", sonuc.data);

  if (error) {
    console.error("[rapor] silinemedi", { mesaj: error.message });
    return { hata: "Rapor silinemedi." };
  }

  revalidatePath("/raporlar");
  return {};
}
