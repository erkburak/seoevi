/**
 * Dış servis bağlantı kontrolü.
 * Kullanım: npx tsx scripts/tani/servis-kontrol.ts
 *
 * Kimlik bilgilerini asla ekrana yazmaz; yalnızca bağlantı durumunu bildirir.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

async function dataforseo() {
  const login = process.env.DATAFORSEO_LOGIN;
  const sifre = process.env.DATAFORSEO_PASSWORD;
  if (!login || !sifre) return console.log("DataForSEO: kimlik bilgisi tanımsız");

  const yetki = Buffer.from(`${login}:${sifre}`).toString("base64");

  const bakiye = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: `Basic ${yetki}` },
  });
  const veri = await bakiye.json();
  const t = veri?.tasks?.[0]?.result?.[0];

  if (veri.status_code !== 20000) {
    console.log(`DataForSEO: HATA ${veri.status_code} — ${veri.status_message}`);
    return;
  }

  console.log(`DataForSEO: BAĞLANDI`);
  console.log(`  Bakiye: $${t?.money?.balance ?? "?"}`);
  console.log(`  Limitler: günlük ${t?.rates?.limits?.day ?? "?"} / dakika ${t?.rates?.limits?.minute ?? "?"}`);

  // Türkiye konum kimliğini doğrula (kodda sabit yazılmamalı)
  const konum = await fetch("https://api.dataforseo.com/v3/serp/google/locations/country/TR", {
    headers: { Authorization: `Basic ${yetki}` },
  });
  const kveri = await konum.json();
  const tr = kveri?.tasks?.[0]?.result?.find(
    (r: { location_code: number; location_name: string; location_type: string }) =>
      r.location_name === "Turkey" || r.location_code === 2792,
  );
  console.log(`  Türkiye konumu: ${tr ? `${tr.location_code} (${tr.location_name})` : "BULUNAMADI"}`);
}

async function anthropic() {
  const anahtar = process.env.AI_PROVIDER_KEY;
  if (!anahtar) return console.log("Anthropic: anahtar tanımsız");

  const model = process.env.AI_MODEL ?? "claude-sonnet-5";

  const yanit = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anahtar,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Yalnızca 'tamam' yaz." }],
    }),
  });

  const veri = await yanit.json();
  if (!yanit.ok) {
    console.log(`Anthropic (${model}): HATA ${yanit.status} — ${veri?.error?.message ?? "bilinmiyor"}`);
    return;
  }
  console.log(`Anthropic: BAĞLANDI (model: ${veri.model})`);
  console.log(`  Yanıt: ${veri.content?.[0]?.text?.trim()}`);
}

async function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return console.log("Supabase: yapılandırma eksik");

  const yanit = await fetch(`${url}/rest/v1/plans?select=id&limit=1`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  console.log(
    yanit.ok
      ? "Supabase REST: BAĞLANDI (anon anahtarı plans tablosunu okuyabiliyor)"
      : `Supabase REST: HATA ${yanit.status}`,
  );
}

async function main() {
  await Promise.all(
    [dataforseo(), anthropic(), supabase()].map((p) =>
      p.catch((e: unknown) => console.log("HATA:", e instanceof Error ? e.message : e)),
    ),
  );
}

main();
