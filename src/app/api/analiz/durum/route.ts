import { NextResponse, type NextRequest } from "next/server";

import { isiIlerlet } from "@/lib/jobs/runner";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import type { AnalizIsi } from "@/types/database";

/**
 * İşin kuyruktaki sırası.
 *
 * Kendisinden önce oluşturulmuş ve hâlâ bekleyen işler sayılır.
 * 0 döndüğünde iş sıradaki ilk iştir veya zaten işlenmektedir.
 */
async function kuyruktakiSira(is: AnalizIsi): Promise<number> {
  if (is.status !== "bekliyor") return 0;

  const supabase = yoneticiIstemcisi();
  const { count } = await supabase
    .from("audit_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "bekliyor")
    .lt("created_at", is.created_at);

  return count ?? 0;
}

/** İşin başlangıcından bu yana geçen saniye. */
function gecenSaniye(is: AnalizIsi): number {
  const baslangic = new Date(is.started_at ?? is.created_at).getTime();
  return Math.max(0, Math.round((Date.now() - baslangic) / 1000));
}

export const maxDuration = 60;

/**
 * Analiz durumunu döndürür ve gerekiyorsa işi bir adım ilerletir.
 * Böylece kullanıcı sayfayı açık tuttuğu sürece analiz ilerler.
 */
export async function GET(istek: NextRequest) {
  const isId = istek.nextUrl.searchParams.get("is");
  if (!isId) {
    return NextResponse.json({ hata: "İş kimliği gerekli." }, { status: 400 });
  }

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });
  }

  // RLS sayesinde yalnızca kendi işini okuyabilir.
  const { data } = await supabase.from("audit_jobs").select("*").eq("id", isId).maybeSingle();

  if (!data) {
    return NextResponse.json({ hata: "Analiz bulunamadı." }, { status: 404 });
  }

  const is = data as AnalizIsi;

  if (is.status === "bekliyor" || is.status === "isleniyor" || is.status === "yeniden_deneniyor") {
    const sira = await kuyruktakiSira(is);
    const sonuc = await isiIlerlet(is.id);

    return NextResponse.json({
      durum: sonuc.durum,
      ilerleme: sonuc.ilerleme,
      adimlar: (await guncelAdimlar(isId)) ?? is.steps,
      hata: sonuc.hata ?? null,
      sira,
      gecenSaniye: gecenSaniye(is),
      tur: is.job_type,
      denemeSayisi: is.attempts,
    });
  }

  return NextResponse.json({
    durum: is.status,
    ilerleme: is.progress,
    adimlar: is.steps,
    hata: is.error,
    sira: 0,
    gecenSaniye: gecenSaniye(is),
    tur: is.job_type,
    denemeSayisi: is.attempts,
  });
}

async function guncelAdimlar(isId: string) {
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase.from("audit_jobs").select("steps").eq("id", isId).maybeSingle();
  return data?.steps ?? null;
}
