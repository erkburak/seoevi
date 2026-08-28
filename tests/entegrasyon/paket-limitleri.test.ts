import { describe, expect, it } from "vitest";

import { planGetir, tumPaketler } from "@/lib/plans";
import {
  abonelikDurumu,
  projeLimitiUygunMu,
  sonrakiPlan,
  takipKelimeLimiti,
} from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Kayıt akışının paket tarafı.
 *
 * Kayıt tetikleyicisi her yeni kullanıcıya deneme paketini atar. Bu paket
 * fiyat sayfasında görünmesin diye `is_public = false` işaretlidir; paket
 * okuma yolu yalnızca herkese açık paketlere bakarsa yeni kullanıcının
 * limitleri okunamaz ve hiç proje açamaz.
 */

const supabase = yoneticiIstemcisi();

describe("kayıtta atanan paket", () => {
  it("deneme paketi okunabilir ve proje hakkı verir", async () => {
    const plan = await planGetir("deneme");

    expect(plan, "deneme paketi okunamadı").not.toBeNull();
    expect(plan!.limits.projeler).toBeGreaterThan(0);
  });

  it("gizli paketler yalnızca tumPaketler ile gelir", async () => {
    const { planlariGetir } = await import("@/lib/plans");
    const [hepsi, acik] = await Promise.all([tumPaketler(), planlariGetir()]);

    expect(hepsi.length).toBeGreaterThan(acik.length);
    // Deneme paketi fiyat sayfasına sızmamalı.
    expect(acik.some((p) => p.id === "deneme")).toBe(false);
    expect(hepsi.some((p) => p.id === "deneme")).toBe(true);
  });
});

describe("takip kelimesi limiti", () => {
  it("aylık araştırma hakkını değil anahtar_kelime alanını kullanır", async () => {
    /*
     * Düzeltilen hata: takip limiti `METRIK_LIMITI.keyword` üzerinden
     * `aylik_kelime_arastirmasi`ya (deneme paketinde 1) eşleniyordu.
     * Doğrusu `anahtar_kelime` (25). İkisi karışırsa kullanıcı vitrinde
     * yazandan çok daha azını takip edebilir.
     */
    const plan = await planGetir("deneme");
    expect(plan).not.toBeNull();

    const arastirmaHakki = plan!.limits.aylik_kelime_arastirmasi;
    const takipHakki = plan!.limits.anahtar_kelime;
    expect(takipHakki).not.toBe(arastirmaHakki);

    const { data: abonelik } = await supabase
      .from("subscriptions")
      .select("user_id")
      .eq("plan_id", "deneme")
      .limit(1)
      .maybeSingle();

    if (!abonelik) return;

    const { data: proje } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", abonelik.user_id)
      .limit(1)
      .maybeSingle();

    const sonuc = await takipKelimeLimiti(abonelik.user_id, proje?.id ?? crypto.randomUUID());
    expect(sonuc.limit).toBe(takipHakki);
  }, 30_000);
});

describe("deneme paketi daraltması", () => {
  it("belirlenen limitleri taşır", async () => {
    const plan = await planGetir("deneme");
    expect(plan!.limits).toMatchObject({
      projeler: 1,
      anahtar_kelime: 25,
      tarama_sayfa: 150,
      aylik_kelime_arastirmasi: 1,
      aylik_ai: 4,
      gunluk_serp: 3,
      aylik_rapor: 1,
    });
  });
});

describe("mevcut abonelikler", () => {
  it("her aboneliğin paketi çözümlenebilir ve limitleri sıfırdan büyüktür", async () => {
    const { data: abonelikler } = await supabase
      .from("subscriptions")
      .select("user_id, plan_id");

    expect(abonelikler?.length ?? 0).toBeGreaterThan(0);

    for (const a of abonelikler ?? []) {
      const durum = await abonelikDurumu(a.user_id);
      expect(durum.plan, `${a.plan_id} paketi çözümlenemedi`).not.toBeNull();

      const limit = await projeLimitiUygunMu(a.user_id);
      expect(limit.limit, `${a.plan_id} paketinde proje hakkı sıfır`).toBeGreaterThan(0);
    }
  }, 60_000);

  it("deneme paketindeki kullanıcıya yükseltme önerilir", async () => {
    const sonraki = await sonrakiPlan("deneme");
    expect(sonraki, "deneme paketi için yükseltme önerisi üretilemedi").not.toBeNull();
    expect(sonraki!.is_public).toBe(true);
  });
});
