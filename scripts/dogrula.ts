/**
 * Yayın öncesi doğrulama.
 *
 * Kullanım: npm run seo:kontrol
 *
 * Ortam değişkenlerini, veritabanı durumunu ve dış servis bağlantılarını
 * tek tek kontrol eder. Hiçbir gizli değeri ekrana yazmaz.
 * Kritik bir eksik bulunursa çıkış kodu 1 olur.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

type Sonuc = { ad: string; durum: "tamam" | "uyari" | "hata"; not: string };

const sonuclar: Sonuc[] = [];

function ekle(ad: string, durum: Sonuc["durum"], not = "") {
  sonuclar.push({ ad, durum, not });
}

/* ------------------------------------------------------------------ */
/* 1. Ortam değişkenleri                                               */
/* ------------------------------------------------------------------ */

const ZORUNLU = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "CRON_SECRET",
];

const ISTEGE_BAGLI = ["SUPABASE_DB_URL", "AI_PROVIDER_KEY", "AI_MODEL"];

function ortamKontrol() {
  for (const ad of ZORUNLU) {
    ekle(`ortam: ${ad}`, process.env[ad] ? "tamam" : "hata", process.env[ad] ? "" : "tanımlı değil");
  }
  for (const ad of ISTEGE_BAGLI) {
    ekle(`ortam: ${ad}`, process.env[ad] ? "tamam" : "uyari", process.env[ad] ? "" : "tanımlı değil");
  }

  const cron = process.env.CRON_SECRET ?? "";
  if (cron && cron.length < 24) {
    ekle("ortam: CRON_SECRET gücü", "uyari", "en az 24 karakter olmalı");
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (site.includes("localhost") && process.env.NODE_ENV === "production") {
    ekle("ortam: NEXT_PUBLIC_SITE_URL", "hata", "canlıda localhost olamaz");
  }
}

/* ------------------------------------------------------------------ */
/* 2. Veritabanı                                                       */
/* ------------------------------------------------------------------ */

const BEKLENEN_TABLOLAR = [
  "plans", "profiles", "projects", "project_settings", "competitors", "keywords",
  "keyword_rankings", "keyword_opportunities", "serp_results", "serp_features",
  "pages", "page_audits", "technical_issues", "products", "categories",
  "merchant_audits", "backlinks", "referring_domains", "content_analysis",
  "content_opportunities", "ai_visibility", "ai_mentions", "seo_actions",
  "reports", "subscriptions", "usage", "notifications", "api_cache",
  "audit_jobs", "audit_history", "analytics_events", "app_config",
];

async function veritabaniKontrol() {
  if (!process.env.SUPABASE_DB_URL) {
    ekle("veritabanı", "uyari", "SUPABASE_DB_URL yok, şema kontrolü atlandı");
    return;
  }

  const c = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await c.connect();
  } catch (e) {
    ekle("veritabanı bağlantısı", "hata", e instanceof Error ? e.message : String(e));
    return;
  }

  const t = await c.query<{ table_name: string }>(
    `select table_name from information_schema.tables
     where table_schema='public' and table_type='BASE TABLE'`,
  );
  const mevcut = new Set(t.rows.map((r) => r.table_name));
  const eksik = BEKLENEN_TABLOLAR.filter((x) => !mevcut.has(x));
  ekle("veritabanı: tablolar", eksik.length ? "hata" : "tamam", eksik.length ? `eksik: ${eksik.join(", ")}` : `${mevcut.size} tablo`);

  const rls = await c.query<{ relname: string; relrowsecurity: boolean }>(
    `select relname, relrowsecurity from pg_class c
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='r'`,
  );
  const acikDegil = rls.rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
  ekle("veritabanı: RLS", acikDegil.length ? "hata" : "tamam", acikDegil.length ? `kapalı: ${acikDegil.join(", ")}` : `${rls.rows.length}/${rls.rows.length} açık`);

  const pol = await c.query<{ n: string }>(`select count(*) n from pg_policies where schemaname='public'`);
  ekle("veritabanı: politikalar", Number(pol.rows[0].n) > 0 ? "tamam" : "hata", `${pol.rows[0].n} politika`);

  const p = await c.query<{ n: string }>(`select count(*) n from public.plans where is_public`);
  ekle("veritabanı: paketler", Number(p.rows[0].n) > 0 ? "tamam" : "hata", `${p.rows[0].n} herkese açık paket`);

  const trg = await c.query(
    `select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid
     join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='auth' and c.relname='users' and t.tgname='on_auth_user_created'`,
  );
  ekle("veritabanı: kayıt tetikleyicisi", trg.rowCount ? "tamam" : "hata", trg.rowCount ? "" : "on_auth_user_created yok");

  await c.end();
}

/* ------------------------------------------------------------------ */
/* 3. Supabase REST                                                    */
/* ------------------------------------------------------------------ */

async function supabaseKontrol() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return;

  try {
    const s = createClient(url, anon, { auth: { persistSession: false } });
    const { error } = await s.from("plans").select("id").limit(1);
    ekle("Supabase REST", error ? "hata" : "tamam", error?.message ?? "");
  } catch (e) {
    ekle("Supabase REST", "hata", e instanceof Error ? e.message : String(e));
  }
}

/* ------------------------------------------------------------------ */
/* 4. DataForSEO                                                       */
/* ------------------------------------------------------------------ */

async function dataforseoKontrol() {
  const login = process.env.DATAFORSEO_LOGIN;
  const sifre = process.env.DATAFORSEO_PASSWORD;
  if (!login || !sifre) return;

  const yetki = Buffer.from(`${login}:${sifre}`).toString("base64");

  try {
    const r = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${yetki}` },
    });
    const d = (await r.json()) as {
      status_code?: number;
      status_message?: string;
      tasks?: { result?: { money?: { balance?: number } }[] }[];
    };

    if (d.status_code !== 20000) {
      ekle("DataForSEO kimlik", "hata", `${d.status_code}: ${d.status_message}`);
      return;
    }
    ekle("DataForSEO kimlik", "tamam", "");

    const bakiye = d.tasks?.[0]?.result?.[0]?.money?.balance ?? 0;
    ekle(
      "DataForSEO bakiye",
      bakiye >= 25 ? "tamam" : bakiye > 0 ? "uyari" : "hata",
      `$${bakiye}${bakiye < 25 ? " — tam analiz için düşük" : ""}`,
    );

    // Veri uç noktalarına gerçekten erişilebiliyor mu?
    const konum = await fetch("https://api.dataforseo.com/v3/serp/google/locations/TR", {
      headers: { Authorization: `Basic ${yetki}` },
    });
    const kd = (await konum.json()) as { status_code?: number; status_message?: string };

    if (kd.status_code === 20000) {
      ekle("DataForSEO veri erişimi", "tamam", "");
    } else if (kd.status_code === 40104) {
      ekle(
        "DataForSEO veri erişimi",
        "hata",
        "hesap doğrulanmamış — app.dataforseo.com üzerinden doğrulayın; analizler bu olmadan çalışmaz",
      );
    } else {
      ekle("DataForSEO veri erişimi", "hata", `${kd.status_code}: ${kd.status_message}`);
    }
  } catch (e) {
    ekle("DataForSEO", "hata", e instanceof Error ? e.message : String(e));
  }
}

/* ------------------------------------------------------------------ */
/* 5. Yapay zekâ                                                       */
/* ------------------------------------------------------------------ */

async function aiKontrol() {
  const anahtar = process.env.AI_PROVIDER_KEY;
  if (!anahtar) return;

  const model = process.env.AI_MODEL ?? "claude-sonnet-5";
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anahtar,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 16, messages: [{ role: "user", content: "ping" }] }),
    });
    const d = (await r.json()) as { error?: { message?: string }; model?: string };
    ekle("Yapay zekâ sağlayıcısı", r.ok ? "tamam" : "hata", r.ok ? `model: ${d.model}` : (d.error?.message ?? `HTTP ${r.status}`));
  } catch (e) {
    ekle("Yapay zekâ sağlayıcısı", "hata", e instanceof Error ? e.message : String(e));
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  ortamKontrol();
  await veritabaniKontrol();
  await Promise.all([supabaseKontrol(), dataforseoKontrol(), aiKontrol()]);

  const isaret = { tamam: "  ✓", uyari: "  !", hata: "  ✗" } as const;
  console.log("\nSEO Evi — yayın öncesi doğrulama\n");

  for (const s of sonuclar) {
    console.log(`${isaret[s.durum]} ${s.ad.padEnd(34)} ${s.not}`);
  }

  const hata = sonuclar.filter((s) => s.durum === "hata").length;
  const uyari = sonuclar.filter((s) => s.durum === "uyari").length;

  console.log(`\n${sonuclar.length - hata - uyari} tamam · ${uyari} uyarı · ${hata} hata\n`);

  if (hata) {
    console.log("Hatalar giderilmeden yayına alınmamalı.\n");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Doğrulama çalıştırılamadı:", e instanceof Error ? e.message : e);
  process.exit(1);
});
