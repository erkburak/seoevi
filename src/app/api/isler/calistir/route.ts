import { NextResponse, type NextRequest } from "next/server";

import { alarmlariUret } from "@/lib/analiz/alarm";
import { etkileriOlc } from "@/lib/analiz/etki";
import { onbellegiTemizle } from "@/lib/dataforseo/cache";
import { gscSenkronize } from "@/lib/gsc/senkron";
import { bekleyenIsleriIlerlet } from "@/lib/jobs/runner";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

export const maxDuration = 300;

/**
 * Zamanlanmış görev: bekleyen analiz işlerini ilerletir ve
 * süresi dolmuş önbellek kayıtlarını temizler.
 *
 * CRON_SECRET ile korunur.
 */
export async function GET(istek: NextRequest) {
  const gizli = process.env.CRON_SECRET;
  const yetki = istek.headers.get("authorization");

  if (!gizli || yetki !== `Bearer ${gizli}`) {
    return NextResponse.json({ hata: "Yetkisiz." }, { status: 401 });
  }

  try {
    const islenen = await bekleyenIsleriIlerlet(5);
    const temizlenen = await onbellegiTemizle();

    // Tamamlanan aksiyonların etkisi yeniden ölçülür.
    // Mevcut sıralama verisinden okunur; sağlayıcı maliyeti yoktur.
    const olculenEtki = await etkileriOlc();

    /* --- Günlük alarmlar ve Search Console senkronu --- */
    // Her ikisi de ücretsizdir; sağlayıcı maliyeti oluşturmaz.
    const yonetici = yoneticiIstemcisi();
    const { data: projeler } = await yonetici
      .from("projects")
      .select("id")
      .eq("is_deleted", false)
      .limit(200);

    let uretilenAlarm = 0;
    for (const proje of projeler ?? []) {
      try {
        uretilenAlarm += await alarmlariUret(proje.id);
      } catch (h) {
        console.error("[cron] alarm üretilemedi", {
          projeId: proje.id,
          mesaj: h instanceof Error ? h.message : String(h),
        });
      }
    }

    // Search Console günde bir kez senkronlanır; veri zaten günlük yayımlanır.
    const { data: baglantilar } = await yonetici
      .from("gsc_connections")
      .select("project_id, last_sync_at")
      .limit(200);

    let senkronlanan = 0;
    for (const b of baglantilar ?? []) {
      const gecen = b.last_sync_at
        ? Date.now() - new Date(b.last_sync_at).getTime()
        : Number.POSITIVE_INFINITY;
      if (gecen < 20 * 3_600_000) continue;

      try {
        await gscSenkronize(b.project_id);
        senkronlanan++;
      } catch (h) {
        console.error("[cron] gsc senkronu başarısız", {
          projeId: b.project_id,
          mesaj: h instanceof Error ? h.message : String(h),
        });
      }
    }

    return NextResponse.json({
      islenen,
      temizlenen,
      olculenEtki,
      uretilenAlarm,
      gscSenkron: senkronlanan,
    });
  } catch (hata) {
    console.error("[cron] hata", { mesaj: hata instanceof Error ? hata.message : String(hata) });
    return NextResponse.json({ hata: "İşler çalıştırılamadı." }, { status: 500 });
  }
}
