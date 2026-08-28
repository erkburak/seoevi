/**
 * Geliştirme için doğrulanmış bir test kullanıcısı oluşturur.
 * Kullanım: npx tsx scripts/tani/test-kullanici.ts [e-posta] [sifre]
 *
 * Yalnızca yerel geliştirmede kullanılır; servis rolü anahtarı gerektirir.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const eposta = process.argv[2] ?? "test@seoevi.com.tr";
const sifre = process.argv[3] ?? "Deneme1234!";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: mevcutlar } = await supabase.auth.admin.listUsers();
  const mevcut = mevcutlar?.users.find((u) => u.email === eposta);

  let kullaniciId: string;

  if (mevcut) {
    kullaniciId = mevcut.id;
    await supabase.auth.admin.updateUserById(kullaniciId, { password: sifre });
    console.log(`Kullanıcı zaten vardı, şifresi güncellendi: ${eposta}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: eposta,
      password: sifre,
      email_confirm: true,
      user_metadata: { full_name: "Test Kullanıcısı" },
    });
    if (error || !data.user) throw new Error(error?.message ?? "Kullanıcı oluşturulamadı");
    kullaniciId = data.user.id;
    console.log(`Kullanıcı oluşturuldu: ${eposta}`);
  }

  // Tetikleyicinin profili ve aboneliği kurduğunu doğrula
  const { data: profil } = await supabase.from("profiles").select("*").eq("id", kullaniciId).maybeSingle();
  const { data: abonelik } = await supabase
    .from("subscriptions")
    .select("plan_id, status, trial_ends_at")
    .eq("user_id", kullaniciId)
    .maybeSingle();

  console.log(`  profil        : ${profil ? `var (${profil.full_name || "adsız"}, rol=${profil.role}, onboarded=${profil.onboarded_at ?? "hayır"})` : "YOK !!"}`);
  console.log(`  abonelik      : ${abonelik ? `${abonelik.plan_id} / ${abonelik.status} / deneme bitişi ${abonelik.trial_ends_at?.slice(0, 10)}` : "YOK !!"}`);
  console.log(`  kullanıcı kimliği: ${kullaniciId}`);
  console.log(`\nGiriş: ${eposta} / ${sifre}`);
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
