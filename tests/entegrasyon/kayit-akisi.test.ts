import { describe, expect, it } from "vitest";

import { harcamaIzni } from "@/lib/guvenlik";
import { projeLimitiUygunMu } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Yeni kayıt olan kullanıcı ilk mağazasını ekleyebilmeli.
 *
 * Bu akış birden çok kapıdan geçiyor (harcama izni, paket çözümleme, proje
 * limiti) ve herhangi biri sessizce kapanırsa kullanıcı kuruluma
 * başlayamaz. Kapıların hepsi burada birlikte sınanır.
 */

const supabase = yoneticiIstemcisi();

describe("ilk mağaza ekleme", () => {
  it("projesi olmayan her kullanıcı proje açabilir", async () => {
    const { data: kullanicilar } = await supabase.auth.admin.listUsers();

    for (const k of kullanicilar.users) {
      const { count } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", k.id)
        .eq("is_deleted", false);

      // Yalnızca henüz projesi olmayanlar için anlamlı.
      if ((count ?? 0) > 0) continue;

      const izin = await harcamaIzni(k);
      expect(
        izin.izinli,
        `${k.email} harcama izni alamadı: ${izin.izinli ? "" : izin.mesaj}`,
      ).toBe(true);

      const limit = await projeLimitiUygunMu(k.id);
      expect(
        limit.uygun,
        `${k.email} proje açamıyor (limit ${limit.limit}, mevcut ${limit.mevcut})`,
      ).toBe(true);
    }
  }, 60_000);
});
