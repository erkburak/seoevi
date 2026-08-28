import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Mevsimsellik takvimi.
 *
 * E-ticarette SEO'nun en sık kaçırılan tarafı zamanlamadır. Bir kelimede
 * ilk sayfaya çıkmak haftalar alır; talep zirvesi geldiğinde işe başlamak
 * o sezonu kaybetmek demektir.
 *
 * Bu modül her kelimenin son 12 aylık arama hacmini okuyup zirve ayını
 * bulur ve "şimdi başlamazsan yetişemezsin" uyarısı üretir.
 *
 * Veri, kelime analizinde zaten çekilen aylık hacimlerden gelir;
 * ek sağlayıcı çağrısı yapılmaz.
 */

/** SEO çalışmasının sonuç vermesi için gereken tipik süre (hafta). */
const HAZIRLIK_HAFTASI = 8;

const AY_ADI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

/**
 * Türkiye e-ticaret takvimi.
 * Kelime bazlı zirveyle eşleştiğinde kullanıcıya bağlam verir.
 */
export const TICARET_TAKVIMI: { ay: number; ad: string; not: string }[] = [
  { ay: 1, ad: "Yılbaşı sonrası indirimler", not: "Ocak ayı stok eritme ve indirim aramaları" },
  { ay: 3, ad: "Bahar / temizlik sezonu", not: "Ev, bahçe ve temizlik ürünlerinde yükseliş" },
  { ay: 4, ad: "Ramazan", not: "Gıda, hediye ve ev ürünlerinde belirgin artış" },
  { ay: 6, ad: "Yaz sezonu", not: "Klima, tatil, plaj ve serinletici ürünler" },
  { ay: 8, ad: "Okula dönüş", not: "Kırtasiye, çanta, elektronik ve giyim zirvesi" },
  { ay: 11, ad: "Efsane Cuma / Black Friday", not: "Yılın en yoğun indirim dönemi" },
  { ay: 12, ad: "Yılbaşı", not: "Hediye, elektronik ve dekorasyon aramaları" },
];

export type MevsimselKelime = {
  keyword: string;
  keywordId: string;
  aramaHacmi: number | null;
  /** 1-12. */
  zirveAy: number;
  zirveAdi: string;
  zirveHacim: number;
  dipHacim: number;
  /** Zirve / ortalama oranı. 1'e yakınsa mevsimsel değil. */
  mevsimsellik: number;
  /** Zirveye kaç hafta kaldı. */
  zirveyeHafta: number;
  /** Şimdi çalışmaya başlanmalı mı? */
  simdiBasla: boolean;
  /** Takvimdeki karşılığı varsa. */
  donem: string | null;
};

export type MevsimselOzet = {
  incelenenKelime: number;
  mevsimselKelime: number;
  /** Şu an aksiyon alınması gereken kelimeler. */
  yaklasanlar: MevsimselKelime[];
  /** Yaklaşan dönemin toplam arama hacmi. */
  yaklasanHacim: number;
  siradakiDonem: { ad: string; not: string; hafta: number } | null;
};

/** İki ay arasındaki hafta farkı (yıl döngüsünü dikkate alır). */
function zirveyeHaftaHesapla(zirveAy: number, buAy: number): number {
  let fark = zirveAy - buAy;
  if (fark < 0) fark += 12;
  return Math.round(fark * 4.33);
}

/**
 * Projedeki kelimelerin mevsimsel davranışını çıkarır.
 * Yalnızca veritabanı okunur.
 */
export async function mevsimselAnaliz(projeId: string): Promise<MevsimselOzet> {
  const supabase = yoneticiIstemcisi();

  const { data: kelimeler } = await supabase
    .from("keywords")
    .select("id, keyword, search_volume, trend")
    .eq("project_id", projeId)
    .eq("is_tracked", true)
    .not("trend", "eq", "[]")
    .limit(1000);

  const buAy = new Date().getMonth() + 1;
  const satirlar: MevsimselKelime[] = [];

  for (const k of kelimeler ?? []) {
    const trend = (k.trend ?? []) as { yil: number; ay: number; hacim: number }[];
    // En az 8 aylık veri olmadan mevsimsellik iddia edilmez.
    if (trend.length < 8) continue;

    const hacimler = trend.map((t) => t.hacim).filter((h) => h > 0);
    if (hacimler.length < 8) continue;

    const ortalama = hacimler.reduce((t, h) => t + h, 0) / hacimler.length;
    if (ortalama <= 0) continue;

    const zirve = trend.reduce((en, t) => (t.hacim > en.hacim ? t : en), trend[0]);
    const dip = trend.reduce((en, t) => (t.hacim < en.hacim ? t : en), trend[0]);

    const mevsimsellik = zirve.hacim / ortalama;
    // 1,4 altındaki dalgalanma gürültü sayılır.
    if (mevsimsellik < 1.4) continue;

    const hafta = zirveyeHaftaHesapla(zirve.ay, buAy);
    const takvim = TICARET_TAKVIMI.find((t) => t.ay === zirve.ay);

    satirlar.push({
      keyword: k.keyword,
      keywordId: k.id,
      aramaHacmi: k.search_volume,
      zirveAy: zirve.ay,
      zirveAdi: AY_ADI[zirve.ay - 1],
      zirveHacim: zirve.hacim,
      dipHacim: dip.hacim,
      mevsimsellik: Math.round(mevsimsellik * 100) / 100,
      zirveyeHafta: hafta,
      // Hazırlık süresi kadar veya daha az kaldıysa şimdi başlanmalı.
      simdiBasla: hafta > 0 && hafta <= HAZIRLIK_HAFTASI + 4,
      donem: takvim?.ad ?? null,
    });
  }

  const yaklasanlar = satirlar
    .filter((s) => s.simdiBasla)
    .sort((a, b) => b.zirveHacim - a.zirveHacim);

  // Takvimdeki bir sonraki dönem
  const siradaki = [...TICARET_TAKVIMI]
    .map((t) => ({ ...t, hafta: zirveyeHaftaHesapla(t.ay, buAy) }))
    .filter((t) => t.hafta > 0)
    .sort((a, b) => a.hafta - b.hafta)[0];

  return {
    incelenenKelime: (kelimeler ?? []).length,
    mevsimselKelime: satirlar.length,
    yaklasanlar: yaklasanlar.slice(0, 40),
    yaklasanHacim: yaklasanlar.reduce((t, s) => t + s.zirveHacim, 0),
    siradakiDonem: siradaki
      ? { ad: siradaki.ad, not: siradaki.not, hafta: siradaki.hafta }
      : null,
  };
}

/** Tüm mevsimsel kelimeler (sayfada tablo için). */
export async function mevsimselKelimeler(
  projeId: string,
  limit = 100,
): Promise<MevsimselKelime[]> {
  const ozet = await mevsimselAnaliz(projeId);
  // Yaklaşanlar önce, sonra zirve hacmine göre.
  return ozet.yaklasanlar.slice(0, limit);
}
