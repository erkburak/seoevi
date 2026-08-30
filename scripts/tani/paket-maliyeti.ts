/**
 * Paket limitlerinin aylık API maliyetini ve gelir oranını gösterir.
 *
 * Buradaki limitler `plans` tablosundaki gerçek değerlerle aynı olmalıdır;
 * ayrışırsa hesap yanlış paket için yapılır.
 * Kullanım: npx tsx scripts/tani/paket-maliyeti.ts
 */
import {
  aylikMaliyet,
  beklenenMaliyet,
  maliyetOrani,
  tavanMaliyetOrani,
  USD_TRY,
  HEDEF_MALIYET_ORANI,
  type LimitGirdisi,
} from "../../src/lib/maliyet";

const PAKETLER: { ad: string; fiyat: number; limit: LimitGirdisi }[] = [
  {
    ad: "Deneme (7 gün)",
    fiyat: 0,
    limit: { gunluk_serp: 3, dogrulanan_kelime: 10, hiz_olcum_sayfa: 3, satici_karsilastirma: false, isletme_yorumlari: false, aylik_site_taramasi: 1, tarama_sayfa: 150, aylik_kelime_arastirmasi: 1, aylik_ai: 4, rakip: 1, geri_baglanti: false, merchant: false, ai_gorunurlugu: false },
  },
  {
    ad: "Başlangıç",
    fiyat: 499,
    limit: { gunluk_serp: 15, dogrulanan_kelime: 50, hiz_olcum_sayfa: 10, satici_karsilastirma: false, isletme_yorumlari: true, aylik_site_taramasi: 2, tarama_sayfa: 300, aylik_kelime_arastirmasi: 8, aylik_ai: 35, rakip: 2, geri_baglanti: false, merchant: false, ai_gorunurlugu: false },
  },
  {
    ad: "Profesyonel",
    fiyat: 999,
    limit: { gunluk_serp: 30, dogrulanan_kelime: 150, hiz_olcum_sayfa: 20, satici_karsilastirma: true, isletme_yorumlari: true, aylik_site_taramasi: 4, tarama_sayfa: 600, aylik_kelime_arastirmasi: 12, aylik_ai: 45, rakip: 5, geri_baglanti: true, merchant: true, ai_gorunurlugu: true },
  },
  {
    ad: "Kurumsal",
    fiyat: 1499,
    limit: { gunluk_serp: 45, dogrulanan_kelime: 300, hiz_olcum_sayfa: 25, satici_karsilastirma: true, isletme_yorumlari: true, aylik_site_taramasi: 6, tarama_sayfa: 1000, aylik_kelime_arastirmasi: 20, aylik_ai: 55, rakip: 10, geri_baglanti: true, merchant: true, ai_gorunurlugu: true },
  },
];

console.log(`Kur: 1 USD = ${USD_TRY} TL · Hedef maliyet oranı: %${HEDEF_MALIYET_ORANI * 100}\n`);

for (const p of PAKETLER) {
  const gun = p.fiyat === 0 ? 7 : 30;
  const m = beklenenMaliyet(p.limit, gun);
  const tavan = aylikMaliyet(p.limit, gun);
  const gelir = p.fiyat / USD_TRY;
  const oran = p.fiyat === 0 ? null : maliyetOrani(p.limit, p.fiyat);
  const tavanOran = p.fiyat === 0 ? null : tavanMaliyetOrani(p.limit, p.fiyat);

  console.log(`${p.ad}${p.fiyat ? ` — ${p.fiyat} TL/ay ($${gelir.toFixed(2)})` : " — ücretsiz"}`);
  console.log(`  SERP (canlı)      $${m.serp.toFixed(2)}`);
  console.log(`  Sıra doğrulama    $${m.siraDogrulama.toFixed(2)}`);
  console.log(`  Sayfa hızı        $${m.sayfaHizi.toFixed(2)}`);
  console.log(`  Satıcı + yorum    $${m.saticiVeYorum.toFixed(2)}`);
  console.log(`  Site taraması     $${m.tarama.toFixed(2)}`);
  console.log(`  Kelime araştırma  $${m.kelimeArastirmasi.toFixed(2)}`);
  console.log(`  Labs              $${m.labs.toFixed(2)}`);
  console.log(`  Geri bağlantı     $${m.backlink.toFixed(2)}`);
  console.log(`  Merchant          $${m.merchant.toFixed(2)}`);
  console.log(`  İçerik            $${m.icerik.toFixed(2)}`);
  console.log(`  Yapay zekâ        $${m.ai.toFixed(2)}`);
  console.log(`  BEKLENEN          $${m.toplam.toFixed(2)}${oran !== null ? `  → gelirin %${(oran * 100).toFixed(1)}'i ${oran <= HEDEF_MALIYET_ORANI ? "✓" : "✗ SÜRDÜRÜLEMEZ"}` : "  (kayıt başına)"}`);
  console.log(`  TAVAN             $${tavan.toplam.toFixed(2)}${tavanOran !== null ? `  → gelirin %${(tavanOran * 100).toFixed(1)}'i  (hakkının tamamı kullanılırsa)` : ""}
`);
}
