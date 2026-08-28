/**
 * Önbellek etkisini raporlar: isabet oranı, harcanan ve tasarruf edilen tutar.
 * Kullanım: npm run tani:onbellek
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

  const { rows: genel } = await c.query<{
    kayit: string; isabet: string; harcanan: string; tasarruf: string;
  }>(`
    select count(*)::text                                        as kayit,
           coalesce(sum(hit_count), 0)::text                     as isabet,
           coalesce(sum(cost), 0)::text                          as harcanan,
           coalesce(sum(cost * hit_count), 0)::text              as tasarruf
    from public.api_cache
    where provider = 'dataforseo'
  `);

  const g = genel[0];
  const kayit = Number(g.kayit);
  const isabet = Number(g.isabet);
  const harcanan = Number(g.harcanan);
  const tasarruf = Number(g.tasarruf);
  const toplamIstek = kayit + isabet;

  console.log("\nÖNBELLEK ÖZETİ\n");
  console.log(`  Saklanan kayıt        ${kayit}`);
  console.log(`  Önbellekten karşılanan ${isabet}`);
  console.log(`  Toplam istek          ${toplamIstek}`);
  console.log(
    `  İsabet oranı          %${toplamIstek ? Math.round((isabet / toplamIstek) * 100) : 0}`,
  );
  console.log(`\n  Sağlayıcıya ödenen    $${harcanan.toFixed(4)}`);
  console.log(`  Önbellek tasarrufu    $${tasarruf.toFixed(4)}`);
  if (harcanan + tasarruf > 0) {
    console.log(
      `  Önbelleksiz maliyet   $${(harcanan + tasarruf).toFixed(4)}  (%${Math.round((tasarruf / (harcanan + tasarruf)) * 100)} tasarruf)`,
    );
  }

  const { rows: uclar } = await c.query<{
    endpoint: string; kayit: string; isabet: string; harcanan: string; tasarruf: string;
  }>(`
    select endpoint,
           count(*)::text                            as kayit,
           coalesce(sum(hit_count), 0)::text         as isabet,
           coalesce(sum(cost), 0)::text              as harcanan,
           coalesce(sum(cost * hit_count), 0)::text  as tasarruf
    from public.api_cache
    where provider = 'dataforseo'
    group by endpoint
    order by sum(cost * hit_count) desc nulls last, count(*) desc
    limit 12
  `);

  if (uclar.length) {
    console.log("\nUÇ NOKTA BAZINDA\n");
    console.log("  " + "uç nokta".padEnd(48) + "kayıt".padStart(7) + "isabet".padStart(8) + "tasarruf".padStart(12));
    console.log("  " + "-".repeat(75));
    for (const u of uclar) {
      console.log(
        "  " +
          u.endpoint.slice(0, 47).padEnd(48) +
          u.kayit.padStart(7) +
          u.isabet.padStart(8) +
          ("$" + Number(u.tasarruf).toFixed(4)).padStart(12),
      );
    }
  }

  const { rows: sure } = await c.query<{ gecerli: string; suresi_dolmus: string }>(`
    select count(*) filter (where expires_at > now())::text  as gecerli,
           count(*) filter (where expires_at <= now())::text as suresi_dolmus
    from public.api_cache
    where provider = 'dataforseo'
  `);
  console.log(
    `\n  Geçerli kayıt ${sure[0].gecerli} · süresi dolmuş ${sure[0].suresi_dolmus} (cron temizler)\n`,
  );

  await c.end();
}

main().catch((e) => {
  console.error("HATA:", e instanceof Error ? e.message : e);
  process.exit(1);
});
