/**
 * Tüm rotaları gerçek bir oturumla gezer ve HTTP durumunu raporlar.
 * Kullanım: node scripts/tani/sayfa-tarama.mjs
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const TABAN = "http://localhost:3000";
const EPOSTA = process.env.TEST_EPOSTA ?? "test@seoevi.com.tr";
const SIFRE = process.env.TEST_SIFRE ?? "Deneme1234!";

const HERKESE_ACIK = [
  "/", "/fiyatlandirma", "/iletisim", "/hakkimizda",
  "/kvkk", "/gizlilik", "/kullanim-kosullari", "/cerez-politikasi",
  "/seo-araci", "/e-ticaret-seo", "/rakip-seo-analizi", "/google-shopping-seo",
  "/ai-seo", "/teknik-seo-analizi", "/anahtar-kelime-arastirma-araci",
  "/ucretsiz-seo-analizi", "/google-sira-bulucu", "/meta-title-olusturucu", "/meta-description-olusturucu",
  "/sitemap.xml", "/robots.txt", "/bulunmayan-sayfa-404-testi",
];

const KORUMALI = [
  "/genel-bakis", "/aksiyon-merkezi", "/anahtar-kelimeler", "/anahtar-kelime-arastirmasi",
  "/kelime-firsatlari", "/serp-analizi", "/rakipler", "/teknik-seo", "/sayfa-analizi",
  "/icerik-analizi", "/geri-baglantilar", "/e-ticaret", "/urun-seo", "/kategori-seo",
  "/merchant-analizi", "/pazaryeri-radari", "/fiyat-konumu", "/yamyamlik", "/mevsimsellik", "/ai-gorunurlugu", "/projeler", "/projeler/yeni",
  "/raporlar", "/hesabim", "/hesabim?bolum=profil", "/hesabim?bolum=guvenlik", "/ayarlar",
  "/yetkili", "/yetkili/kullanicilar", "/yetkili/marka", "/yetkili/sayfa-bilgileri",
];

async function girisCerezi() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await s.auth.signInWithPassword({ email: EPOSTA, password: SIFRE });
  if (error) throw new Error(`Giriş başarısız: ${error.message}`);

  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

  // @supabase/ssr oturumun tamamını base64- ön ekiyle saklar ve 3180 baytı
  // aşarsa `.0`, `.1` parçalarına böler. Aynı biçimi burada üretiyoruz.
  const deger = "base64-" + Buffer.from(JSON.stringify(data.session)).toString("base64");
  const ad = `sb-${ref}-auth-token`;

  if (deger.length <= 3180) return `${ad}=${deger}`;

  const parcalar = [];
  for (let i = 0; i < deger.length; i += 3180) parcalar.push(deger.slice(i, i + 3180));
  return parcalar.map((p, i) => `${ad}.${i}=${p}`).join("; ");
}

async function gez(yol, cerez) {
  try {
    const r = await fetch(TABAN + yol, {
      headers: cerez ? { cookie: cerez } : {},
      redirect: "manual",
    });
    let not = "";
    if (r.status >= 300 && r.status < 400) not = ` -> ${r.headers.get("location")}`;
    if (r.status === 200) {
      const g = await r.text();
      if (/Bir şeyler ters gitti|Application error|Unhandled Runtime/i.test(g)) not = " !! HATA EKRANI";
      const b = g.match(/<title>([^<]*)<\/title>/i);
      if (b) not += ` | ${b[1].replace(" | SEO Evi", "")}`;
    }
    return `${String(r.status).padEnd(4)} ${yol.padEnd(36)}${not}`;
  } catch (e) {
    return `HATA ${yol.padEnd(36)} ${e.message}`;
  }
}

const cerez = await girisCerezi();
console.log("=== HERKESE AÇIK ===");
for (const y of HERKESE_ACIK) console.log(await gez(y, null));
console.log("\n=== KORUMALI (oturum açık) ===");
for (const y of KORUMALI) console.log(await gez(y, cerez));
console.log("\n=== KORUMALI (oturum yok — /giris'e gitmeli) ===");
for (const y of ["/genel-bakis", "/ayarlar", "/raporlar"]) console.log(await gez(y, null));
