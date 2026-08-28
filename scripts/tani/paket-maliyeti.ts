/**
 * Paket limitlerinin aylık API maliyetini ve gelir oranını gösterir.
 * Kullanım: npx tsx scripts/tani/paket-maliyeti.ts
 */
import { aylikMaliyet, maliyetOrani, USD_TRY, HEDEF_MALIYET_ORANI, type LimitGirdisi } from "../../src/lib/maliyet";

const PAKETLER: { ad: string; fiyat: number; limit: LimitGirdisi }[] = [
  {
    ad: "Deneme (7 gün)",
    fiyat: 0,
    limit: { gunluk_serp: 5, aylik_site_taramasi: 1, tarama_sayfa: 100, aylik_kelime_arastirmasi: 2, aylik_ai: 8, rakip: 1, geri_baglanti: false, merchant: false, ai_gorunurlugu: false },
  },
  {
    ad: "Başlangıç",
    fiyat: 499,
    limit: { gunluk_serp: 15, aylik_site_taramasi: 2, tarama_sayfa: 300, aylik_kelime_arastirmasi: 8, aylik_ai: 35, rakip: 2, geri_baglanti: false, merchant: false, ai_gorunurlugu: false },
  },
  {
    ad: "Profesyonel",
    fiyat: 999,
    limit: { gunluk_serp: 30, aylik_site_taramasi: 4, tarama_sayfa: 600, aylik_kelime_arastirmasi: 12, aylik_ai: 45, rakip: 5, geri_baglanti: true, merchant: true, ai_gorunurlugu: false },
  },
  {
    ad: "Kurumsal",
    fiyat: 1499,
    limit: { gunluk_serp: 45, aylik_site_taramasi: 6, tarama_sayfa: 1000, aylik_kelime_arastirmasi: 20, aylik_ai: 55, rakip: 10, geri_baglanti: true, merchant: true, ai_gorunurlugu: true },
  },
];

console.log(`Kur: 1 USD = ${USD_TRY} TL · Hedef maliyet oranı: %${HEDEF_MALIYET_ORANI * 100}\n`);

for (const p of PAKETLER) {
  const m = aylikMaliyet(p.limit, p.fiyat === 0 ? 7 : 30);
  const gelir = p.fiyat / USD_TRY;
  const oran = p.fiyat === 0 ? null : maliyetOrani(p.limit, p.fiyat);

  console.log(`${p.ad}${p.fiyat ? ` — ${p.fiyat} TL/ay ($${gelir.toFixed(2)})` : " — ücretsiz"}`);
  console.log(`  SERP              $${m.serp.toFixed(2)}`);
  console.log(`  Site taraması     $${m.tarama.toFixed(2)}`);
  console.log(`  Kelime araştırma  $${m.kelimeArastirmasi.toFixed(2)}`);
  console.log(`  Labs              $${m.labs.toFixed(2)}`);
  console.log(`  Geri bağlantı     $${m.backlink.toFixed(2)}`);
  console.log(`  Merchant          $${m.merchant.toFixed(2)}`);
  console.log(`  İçerik            $${m.icerik.toFixed(2)}`);
  console.log(`  Yapay zekâ        $${m.ai.toFixed(2)}`);
  console.log(`  TOPLAM            $${m.toplam.toFixed(2)}${oran !== null ? `  → gelirin %${(oran * 100).toFixed(1)}'i ${oran <= HEDEF_MALIYET_ORANI ? "✓" : "✗ SÜRDÜRÜLEMEZ"}` : "  (kayıt başına azami maliyet)"}\n`);
}
