import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Ürün kullanım olayları.
 * Kişisel veri saklanmaz; yalnızca kullanıcı kimliği ve olay bağlamı tutulur.
 */
export const OLAYLAR = [
  "project_created",
  "project_deleted",
  "audit_started",
  "audit_completed",
  "keyword_searched",
  "competitor_added",
  "report_created",
  "ai_action_used",
  "whatsapp_clicked",
  "pricing_viewed",
  "onboarding_completed",
  "signup_completed",
  "free_tool_used",
] as const;

export type OlayAdi = (typeof OLAYLAR)[number];

export async function olayKaydet({
  olay,
  kaynak,
  kullaniciId,
  projeId,
  ozellikler = {},
}: {
  olay: OlayAdi;
  kaynak?: string;
  kullaniciId?: string | null;
  projeId?: string | null;
  ozellikler?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = yoneticiIstemcisi();
    await supabase.from("analytics_events").insert({
      event: olay,
      source: kaynak ?? null,
      user_id: kullaniciId ?? null,
      project_id: projeId ?? null,
      properties: ozellikler as never,
    });
  } catch (hata) {
    // Analitik hatası kullanıcı akışını bozmaz.
    console.warn("[analitik] olay kaydedilemedi", {
      olay,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  }
}
