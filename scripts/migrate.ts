/**
 * Supabase PostgreSQL migration çalıştırıcısı.
 *
 * Kullanım: npm run db:migrate
 *
 * supabase/migrations klasöründeki .sql dosyalarını dosya adına göre sırayla
 * çalıştırır. Uygulanan dosyalar public.schema_migrations tablosunda tutulur,
 * böylece tekrar çalıştırıldığında yalnızca yeni dosyalar işlenir.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    console.error("SUPABASE_DB_URL tanımlı değil. .env.local dosyasını kontrol edin.");
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Veritabanına bağlanıldı.");

  await client.query(`
    create table if not exists public.schema_migrations (
      version    text primary key,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Set<string>(
    (await client.query<{ version: string }>("select version from public.schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  atlandı  ${file}`);
      continue;
    }
    const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
    console.log(`  uygulanıyor  ${file}`);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (version) values ($1)", [file]);
      await client.query("commit");
      count++;
    } catch (error) {
      await client.query("rollback");
      console.error(`\nHata: ${file}\n`, error instanceof Error ? error.message : error);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log(`\nTamamlandı. ${count} migration uygulandı.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
