/**
 * Bir kullanıcıyı yetkili yapar veya yetkisini alır.
 * Kullanım: npx tsx scripts/tani/yetkili-yap.ts <e-posta> [kaldir]
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  const eposta = process.argv[2];
  const kaldir = process.argv[3] === "kaldir";

  if (!eposta) {
    console.error("Kullanım: npx tsx scripts/tani/yetkili-yap.ts <e-posta> [kaldir]");
    process.exit(1);
  }

  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await s
    .from("profiles")
    .update({ role: kaldir ? "kullanici" : "yetkili" })
    .eq("email", eposta)
    .select("id, email, role");

  if (error) {
    console.error("HATA:", error.message);
    process.exit(1);
  }
  if (!data?.length) {
    console.error(`Kullanıcı bulunamadı: ${eposta}`);
    process.exit(1);
  }

  console.log(`${data[0].email} → rol: ${data[0].role}`);

  const { data: yetkililer } = await s.from("profiles").select("email").eq("role", "yetkili");
  console.log(`Yetkili sayısı: ${yetkililer?.length ?? 0}`);
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
