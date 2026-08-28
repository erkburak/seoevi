/**
 * Veritabanı durum kontrolü.
 * Kullanım: npx tsx scripts/tani/db-durum.ts
 */
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });

async function main() {
  const c = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const t = await c.query(
    `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1`,
  );
  console.log(`TABLOLAR (${t.rows.length}): ${t.rows.map((r) => r.table_name).join(", ")}`);

  const v = await c.query(
    `select table_name from information_schema.views where table_schema='public' order by 1`,
  );
  console.log(`GÖRÜNÜMLER: ${v.rows.map((r) => r.table_name).join(", ") || "(yok)"}`);

  const rls = await c.query(
    `select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r' order by 1`,
  );
  const kapali = rls.rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  console.log(`RLS: ${rls.rows.length - kapali.length}/${rls.rows.length} tabloda açık`);
  if (kapali.length) console.log(`  !! RLS KAPALI: ${kapali.join(", ")}`);

  const pol = await c.query(`select count(*)::int n from pg_policies where schemaname='public'`);
  console.log(`POLİTİKA SAYISI: ${pol.rows[0].n}`);

  const p = await c.query(
    `select id, name, price_monthly, is_custom from plans order by sort_order`,
  );
  console.log(
    `PAKETLER: ${p.rows.length ? p.rows.map((r) => `${r.id}=${r.name}/${r.price_monthly}`).join(" | ") : "(BOŞ!)"}`,
  );

  const cfg = await c.query(`select key from app_config order by 1`);
  console.log(`APP_CONFIG: ${cfg.rows.map((r) => r.key).join(", ") || "(boş)"}`);

  const fn = await c.query(
    `select routine_name from information_schema.routines where routine_schema='public' order by 1`,
  );
  console.log(`FONKSİYONLAR: ${fn.rows.map((r) => r.routine_name).join(", ")}`);

  const trg = await c.query(
    `select trigger_name, event_object_table from information_schema.triggers
     where trigger_schema='public' order by 1`,
  );
  console.log(`TETİKLEYİCİLER: ${trg.rows.length}`);

  const authTrg = await c.query(
    `select tgname from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='auth' and c.relname='users' and not t.tgisinternal`,
  );
  console.log(`AUTH.USERS TETİKLEYİCİSİ: ${authTrg.rows.map((r) => r.tgname).join(", ") || "(YOK!)"}`);

  const u = await c.query(`select count(*)::int n from auth.users`);
  console.log(`KAYITLI KULLANICI: ${u.rows[0].n}`);

  await c.end();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
