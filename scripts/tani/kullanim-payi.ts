/**
 * Limitlerin gerçekte ne kadarının kullanıldığını ölçer.
 *
 * Maliyet modeli iki rakam üretir: TAVAN (kullanıcı hakkının tamamını
 * kullanırsa) ve BEKLENEN (gerçekçi kullanımla). Fiyatlandırma beklenen
 * maliyete bakar ve bu, `KULLANIM_PAYI` sabitlerine dayanır.
 *
 * O sabitler şu an bir VARSAYIM. Bu betik `usage` tablosundaki gerçek
 * sayaçları okuyup ölçülen payı gösterir; yeterli veri biriktiğinde
 * `src/lib/maliyet.ts` içindeki sabitler buradaki ölçümle değiştirilir.
 *
 * Kullanım: npm run tani:kullanim
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { KULLANIM_PAYI } from "../../src/lib/maliyet";

config({ path: ".env.local" });

/** Sayaç metriğinin hangi paket limitine karşılık geldiği. */
const METRIK_LIMIT: Record<string, keyof typeof KULLANIM_PAYI> = {
  serp: "gunluk_serp",
  site_taramasi: "aylik_site_taramasi",
  keyword: "aylik_kelime_arastirmasi",
  ai: "aylik_ai",
};

/** Bu sayının altındaki örneklem gerçek kullanımı temsil etmez. */
const ASGARI_ORNEK = 200;

type UsageSatiri = { user_id: string; metric: string; used: number; period: string };

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: planlar } = await supabase.from("plans").select("id, name, limits");
  const planLimiti = new Map(
    (planlar ?? []).map((p) => [p.id as string, (p.limits ?? {}) as Record<string, number>]),
  );

  const { data: abonelikler } = await supabase
    .from("subscriptions")
    .select("user_id, plan_id");

  const kullaniciPlani = new Map(
    (abonelikler ?? []).map((a) => [a.user_id as string, a.plan_id as string]),
  );

  const { data: kullanimlar } = await supabase
    .from("usage")
    .select("user_id, metric, used, period")
    .order("period", { ascending: false })
    .limit(20000);

  const satirlar = (kullanimlar ?? []) as UsageSatiri[];

  if (!satirlar.length) {
    console.log("Henüz kullanım kaydı yok.");
    console.log("Modeldeki paylar varsayım olarak kalıyor:");
    for (const [ad, pay] of Object.entries(KULLANIM_PAYI)) {
      console.log(`  ${ad.padEnd(26)} %${(pay * 100).toFixed(0)} (varsayım)`);
    }
    return;
  }

  console.log(`Kayıt: ${satirlar.length} · kullanıcı: ${kullaniciPlani.size}`);

  /*
   * Az sayıda kayıt, üstelik geliştirme sırasındaki test hesaplarından
   * geliyorsa gerçek kullanımı temsil etmez. Bu uyarı olmadan tablo
   * "ölçüldü" sanılıp modele taşınabilir.
   */
  if (satirlar.length < ASGARI_ORNEK) {
    console.log("");
    console.log(`UYARI: ${ASGARI_ORNEK} kaydın altında örneklem.`);
    console.log("Bu sayılar büyük olasılıkla geliştirme/test hesaplarına ait;");
    console.log("modele TAŞIMAYIN. Tablo yalnızca betiğin çalıştığını gösterir.");
  }
  console.log("");
  console.log("Metrik                      ölçüm  ortalama pay   azami pay   modeldeki");
  console.log("-".repeat(74));

  for (const [metrik, limitAdi] of Object.entries(METRIK_LIMIT)) {
    const paylar: number[] = [];

    for (const satir of satirlar) {
      if (satir.metric !== metrik) continue;
      const planId = kullaniciPlani.get(satir.user_id);
      const limit = planId ? planLimiti.get(planId)?.[limitAdi] : undefined;
      if (!limit || limit <= 0) continue;
      paylar.push(satir.used / limit);
    }

    if (!paylar.length) {
      console.log(`${metrik.padEnd(26)} ${"—".padStart(6)}  ${"veri yok".padStart(12)}`);
      continue;
    }

    const ortalama = paylar.reduce((t, p) => t + p, 0) / paylar.length;
    const azami = Math.max(...paylar);
    const modeldeki = KULLANIM_PAYI[limitAdi];

    console.log(
      `${metrik.padEnd(26)} ${String(paylar.length).padStart(5)}  ` +
        `%${(ortalama * 100).toFixed(0).padStart(11)}  ` +
        `%${(azami * 100).toFixed(0).padStart(9)}  ` +
        `%${(modeldeki * 100).toFixed(0).padStart(10)}`,
    );
  }

  console.log(
    "\nÖlçülen ortalama pay modeldekinden yüksekse `KULLANIM_PAYI` güncellenmeli;" +
      "\naksi hâlde beklenen maliyet olduğundan düşük görünür.",
  );
}

main().catch((hata) => {
  console.error(hata);
  process.exit(1);
});
