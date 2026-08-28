import { afterAll, describe, expect, it } from "vitest";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Profil satırının bütünlüğü.
 *
 * Kurulumu tamamlayan kayıt `profiles` satırını günceller. Satır eksikse
 * güncelleme hiçbir satırla eşleşmez, hata da vermez; kullanıcı kurulumu
 * bitirmiş görünmediği için kurulum ekranına sonsuza kadar geri atılır ve
 * ekranda hiçbir hata görmez. Gerçekte yaşanan hata buydu.
 */

const supabase = yoneticiIstemcisi();
const geciciKullanicilar: string[] = [];

afterAll(async () => {
  // Yalnızca bu testin açtığı kullanıcılar, kendi kimlikleriyle silinir.
  for (const id of geciciKullanicilar) {
    await supabase.auth.admin.deleteUser(id);
  }
});

describe("profil bütünlüğü", () => {
  it("her oturum kullanıcısının profil satırı vardır", async () => {
    const { data: kullanicilar } = await supabase.auth.admin.listUsers();
    const { data: profiller } = await supabase.from("profiles").select("id");

    const profilKimlikleri = new Set((profiller ?? []).map((p) => p.id));
    const eksikler = kullanicilar.users
      .filter((k) => !profilKimlikleri.has(k.id))
      .map((k) => k.email);

    expect(eksikler, `profil satırı olmayan kullanıcılar: ${eksikler.join(", ")}`).toHaveLength(0);
  }, 30_000);

  it("kayıt tetikleyicisi profil ve abonelik oluşturur", async () => {
    const eposta = `gecici-test-${Date.now()}@seoevi.com.tr`;
    const { data, error } = await supabase.auth.admin.createUser({
      email: eposta,
      email_confirm: true,
      password: crypto.randomUUID(),
    });
    expect(error).toBeNull();
    geciciKullanicilar.push(data.user!.id);

    const { data: profil } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user!.id)
      .maybeSingle();
    expect(profil, "kayıt tetikleyicisi profil oluşturmadı").not.toBeNull();

    const { data: abonelik } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", data.user!.id)
      .maybeSingle();
    expect(abonelik, "kayıt tetikleyicisi abonelik oluşturmadı").not.toBeNull();
  }, 30_000);

  it("profil satırı eksikken kurulum kaydı satırı oluşturur", async () => {
    const eposta = `gecici-test-${Date.now()}-2@seoevi.com.tr`;
    const { data } = await supabase.auth.admin.createUser({
      email: eposta,
      email_confirm: true,
      password: crypto.randomUUID(),
    });
    const kullaniciId = data.user!.id;
    geciciKullanicilar.push(kullaniciId);

    // Gerçekte yaşanan durum: profil satırı yok.
    await supabase.from("profiles").delete().eq("id", kullaniciId);

    const { data: yok } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", kullaniciId)
      .maybeSingle();
    expect(yok).toBeNull();

    /*
     * Eski kod burada UPDATE kullanıyordu ve sessizce boşa düşüyordu.
     * Ekleme-veya-güncelleme satırı oluşturmalı.
     */
    const { error } = await supabase.from("profiles").upsert(
      { id: kullaniciId, onboarded_at: new Date().toISOString(), onboarding_step: 4 },
      { onConflict: "id" },
    );
    expect(error).toBeNull();

    const { data: sonra } = await supabase
      .from("profiles")
      .select("onboarded_at")
      .eq("id", kullaniciId)
      .maybeSingle();

    expect(sonra, "kurulum kaydı profil satırını oluşturmadı").not.toBeNull();
    expect(sonra!.onboarded_at).not.toBeNull();
  }, 30_000);
});
