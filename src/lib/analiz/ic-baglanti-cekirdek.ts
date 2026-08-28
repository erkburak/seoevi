/**
 * İç bağlantı önerisinin saf hesap çekirdeği.
 *
 * Veritabanına dokunmaz; bu sayede birim testlerle doğrulanabilir.
 */

/* ------------------------------------------------------------------ */
/* Türkçe metin işleme                                                 */
/* ------------------------------------------------------------------ */

/**
 * Türkçe'ye duyarlı küçültme.
 *
 * Varsayılan toLowerCase "İ" harfini birleşik bir karaktere çevirir ve
 * eşleşmeyi bozar; Türkçe yerel ayarı bunu doğru çözer.
 */
export function kucult(metin: string): string {
  return metin.toLocaleLowerCase("tr-TR");
}

/** Anlam taşımayan bağlaç ve edatlar — alaka hesabında sayılmaz. */
const DOLGU_KELIMELER = new Set([
  "ve",
  "ile",
  "için",
  "bir",
  "bu",
  "şu",
  "da",
  "de",
  "ki",
  "mi",
  "en",
  "çok",
  "daha",
  "gibi",
  "olan",
  "var",
  "yok",
  "ama",
  "veya",
  "her",
  "tüm",
  "the",
  "and",
  "for",
]);

/**
 * Metni karşılaştırılabilir sözcüklere ayırır.
 *
 * Rakamlar korunur: "no frost", "a++", "65 inç" gibi ifadelerde ayırt
 * edicidirler.
 */
export function sozcukler(metin: string | null | undefined): string[] {
  if (!metin) return [];
  return kucult(metin)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(" ")
    .filter((s) => s.length >= 2 && !DOLGU_KELIMELER.has(s));
}

/**
 * Türkçe sondan eklemeli bir dildir: "buzdolabı", "buzdolabında" ve
 * "buzdolapları" aynı şeyi anlatır. Tam eşleşme aramak eşleşmelerin
 * çoğunu kaçırır.
 *
 * Gövde olarak ilk beş harf alınır — kökü ayırt etmeye yeter, ekleri atar.
 */
export function govde(sozcuk: string): string {
  return sozcuk.length <= 5 ? sozcuk : sozcuk.slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Ayırt edicilik ağırlığı                                             */
/* ------------------------------------------------------------------ */

/**
 * Her gövdenin sitedeki ayırt ediciliğini hesaplar.
 *
 * "fiyat" bir e-ticaret sitesinde neredeyse her sayfada geçer; iki sayfayı
 * birbirine bağlamak için hiçbir kanıt sunmaz. "vestel" birkaç sayfada
 * geçer ve gerçek bir konu akrabalığı gösterir.
 *
 * Ağırlık sitenin kendi metninden çıkar; elle bakım gerektiren Türkçe
 * kelime listesi tutmaya gerek kalmaz.
 */
export function agirliklariHesapla(belgeler: string[][]): Map<string, number> {
  const belgeSayisi = Math.max(1, belgeler.length);
  const gecis = new Map<string, number>();

  for (const belge of belgeler) {
    for (const g of new Set(belge.map(govde))) {
      gecis.set(g, (gecis.get(g) ?? 0) + 1);
    }
  }

  const agirlik = new Map<string, number>();
  for (const [g, sayi] of gecis) {
    // Her sayfada geçen gövdenin ağırlığı sıfıra yaklaşır.
    agirlik.set(g, Math.log(belgeSayisi / sayi));
  }
  return agirlik;
}

/**
 * Hedef kelimenin kaynak sayfa metniyle örtüşme oranı (0-1).
 *
 * Payda hedef kelimenin toplam ağırlığıdır: kelimenin ayırt edici
 * parçalarının ne kadarı kaynak sayfada geçiyor?
 */
export function kapsamaOrani(
  hedefSozcukler: string[],
  kaynakSozcukler: string[],
  agirlik: Map<string, number>,
): number {
  if (!hedefSozcukler.length) return 0;

  const kaynakGovdeler = new Set(kaynakSozcukler.map(govde));

  let toplam = 0;
  let eslesen = 0;
  for (const g of new Set(hedefSozcukler.map(govde))) {
    const a = agirlik.get(g) ?? 1;
    toplam += a;
    if (kaynakGovdeler.has(g)) eslesen += a;
  }

  return toplam > 0 ? eslesen / toplam : 0;
}

/**
 * Ticari eklerin sonuna geldiği kelimeler.
 *
 * "buzdolabı modelleri" ifadesinin konusu "modelleri" değil
 * "buzdolabı"dır; ana sözcüğü ararken bunlar atlanır.
 */
const KUYRUK_KELIMELER = new Set([
  "fiyatları",
  "fiyatlari",
  "fiyat",
  "modelleri",
  "modeli",
  "çeşitleri",
  "cesitleri",
  "seçenekleri",
  "secenekleri",
  "ürünleri",
  "urunleri",
  "markaları",
  "markalari",
]);

/**
 * İfadenin ana sözcüğü.
 *
 * Türkçe ad tamlamasında baş, sondaki addır: "vestel no frost buzdolabı"
 * bir buzdolabıdır, "kadın mont" bir monttur. Ana sözcük, iki sayfanın
 * aynı ürün ailesinden olup olmadığını belirleyen sözcüktür.
 */
export function anaSozcuk(sozcukListesi: string[]): string | null {
  for (let i = sozcukListesi.length - 1; i >= 0; i--) {
    if (!KUYRUK_KELIMELER.has(sozcukListesi[i])) return sozcukListesi[i];
  }
  return sozcukListesi[sozcukListesi.length - 1] ?? null;
}

/**
 * İki sayfanın konu yakınlığı (0-1).
 *
 * Yalnızca kapsama oranına bakmak yanıltır: uzun kuyruklu bir hedefin
 * ("vestel no frost buzdolabı") üst kategorisi ("vestel buzdolabı")
 * niteleyici sözcükleri tanımı gereği içermez ve düşük puan alır. Oysa
 * üst kategoriden alt kategoriye bağlantı, iç bağlantının en doğal
 * biçimidir.
 *
 * Bu yüzden yakınlık iki yarımdan oluşur:
 *   - Ana sözcük tutuyor mu? (aynı ürün ailesi mi)
 *   - İfadenin ne kadarı örtüşüyor? (ne kadar yakın akraba)
 *
 * Ana sözcük tutmuyorsa puan hiçbir zaman 0,5'i geçemez; eşik bu yüzden
 * "önce aynı ürün ailesinde ol" kuralını kendiliğinden uygular.
 */
export function konuYakinligi(
  hedefSozcukler: string[],
  kaynakSozcukler: string[],
  agirlik: Map<string, number>,
): number {
  if (!hedefSozcukler.length) return 0;

  const ana = anaSozcuk(hedefSozcukler);
  const kaynakGovdeler = new Set(kaynakSozcukler.map(govde));
  const anaEslesti = ana ? kaynakGovdeler.has(govde(ana)) : false;

  const kapsama = kapsamaOrani(hedefSozcukler, kaynakSozcukler, agirlik);

  return 0.5 * (anaEslesti ? 1 : 0) + 0.5 * kapsama;
}

/* ------------------------------------------------------------------ */
/* Puanlama                                                            */
/* ------------------------------------------------------------------ */

export type SayfaTuru = "anasayfa" | "urun" | "kategori" | "icerik" | "diger";

/**
 * Hedef sayfanın bağlantıya ne kadar ihtiyacı var (0-100).
 *
 * İkinci sayfa (11-20) en kıymetli aralıktır: sayfa zaten Google'ın
 * gözünde ilgilidir, birinci sayfaya taşımak için genelde biraz iç otorite
 * yeter. İlk üçteki sayfalar zaten kazanmıştır; ellinci sıradan sonrası
 * ise iç bağlantıyla kurtarılamaz, orada içerik sorunu vardır.
 */
export function hedefIhtiyaci({
  hacim,
  pozisyon,
  gelenLink,
  referansLink = 10,
}: {
  hacim: number | null;
  pozisyon: number | null;
  gelenLink: number;
  /**
   * Sitede tipik bir sayfanın aldığı iç bağlantı sayısı (ortanca).
   *
   * Açlık mutlak değil görelidir: sayfa başına ortalama 80 bağlantı olan
   * bir sitede 5 bağlantı alan sayfa aç sayılır; ortalama 3 olan bir
   * sitede aynı sayfa gayet iyi durumdadır.
   */
  referansLink?: number;
}): number {
  const hacimPuan = Math.min(1, Math.log10((hacim ?? 0) + 1) / 4) * 40;

  const konumPuan =
    pozisyon === null
      ? 18 // sıralanmıyor: yine de keşfedilmesi gerekiyor
      : pozisyon <= 3
        ? 8
        : pozisyon <= 10
          ? 20
          : pozisyon <= 20
            ? 35 // vurulacak mesafe
            : pozisyon <= 30
              ? 28
              : pozisyon <= 50
                ? 15
                : 6;

  // Hiç iç bağlantı almayan sayfa en aç olandır.
  const olcek = Math.max(1, referansLink);
  const aclik = (1 - Math.min(1, gelenLink / olcek)) * 25;

  return Math.round(hacimPuan + konumPuan + aclik);
}

/**
 * Kaynak sayfanın aktarabileceği değer (0-1).
 *
 * Kendisi bağlantı alan sayfa daha fazla otorite aktarır. Aşırı bağlantı
 * veren sayfa ise her bağlantıya daha az değer taşır; bu yüzden zaten
 * yüzlerce bağlantısı olan sayfalar geri çekilir.
 */
export function kaynakGucu({
  gelenLink,
  gidenLink,
  kelimeSayisi,
}: {
  gelenLink: number;
  gidenLink: number;
  kelimeSayisi: number | null;
}): number {
  const otorite = 0.35 + Math.min(1, gelenLink / 8) * 0.65;
  // Yüz bağlantıdan sonra her ek bağlantı payı sulandırır.
  const seyrelme = gidenLink > 100 ? Math.max(0.4, 100 / gidenLink) : 1;
  // Çok kısa sayfada bağlantıyı doğal yerleştirecek metin yoktur.
  const govdeVarMi = (kelimeSayisi ?? 0) >= 120 ? 1 : 0.6;

  return otorite * seyrelme * govdeVarMi;
}

/** Bir önerinin nihai puanı (0-100). */
export function oneriPuani({
  ihtiyac,
  alaka,
  guc,
}: {
  ihtiyac: number;
  alaka: number;
  guc: number;
}): number {
  return Math.round(ihtiyac * (0.45 + 0.55 * alaka) * (0.55 + 0.45 * guc));
}

/* ------------------------------------------------------------------ */
/* Bağlantı metni önerisi                                              */
/* ------------------------------------------------------------------ */

/**
 * Sayfa türüne göre doğal Türkçe bağlantı metni kalıpları.
 *
 * Çeşitlilik kasıtlıdır: aynı metinle onlarca bağlantı vermek yapay
 * görünür ve arama motoru tarafından aşırı iyileştirme olarak okunur.
 */
const KALIPLAR: Record<SayfaTuru, ((k: string) => string)[]> = {
  kategori: [
    (k) => `${k} modelleri`,
    (k) => `${k} fiyatları`,
    (k) => `${k} çeşitleri`,
    (k) => `tüm ${k} seçenekleri`,
    (k) => k,
  ],
  urun: [(k) => k, (k) => `${k} özellikleri`, (k) => `${k} incelemesi`, (k) => `${k} detayları`],
  icerik: [(k) => `${k} rehberi`, (k) => `${k} hakkında`, (k) => k, (k) => `${k} nasıl seçilir`],
  anasayfa: [(k) => k],
  diger: [(k) => k, (k) => `${k} sayfası`, (k) => `${k} listesi`, (k) => `${k} hakkında`],
};

/**
 * Sayfa başlığından bağlantı metnine uygun çekirdeği çıkarır.
 *
 * Anahtar kelime verisi olmayan sayfalarda metin başlıktan üretilir; ham
 * başlık ise çoğu zaman bağlantı metni olamaz: "Kitapyurdu e-kitap - ayda
 * sadece 79,99 TL" gibi kampanya eki taşır ya da marka adıyla biter.
 *
 * Ayırıcıdan sonrası atılır, kalan kısım birkaç sözcükle sınırlanır.
 */
export function baslikCekirdegi(baslik: string | null | undefined): string {
  if (!baslik) return "";

  // "Ürün | Mağaza", "Ürün - kampanya", "Ürün: açıklama" biçimlerinde
  // ilk parça konuyu, sonrası pazarlamayı anlatır.
  const ilkParca = baslik.split(/\s[|–—\-:·]\s/)[0];

  // Fiyat ve kampanya kuyrukları bağlantı metnine girmemeli.
  const fiyatsiz = ilkParca.replace(/\s*[\d.,]+\s*(tl|₺|usd|\$).*$/iu, "");

  const kelimeler = fiyatsiz.trim().split(/\s+/).filter(Boolean);

  // Uzun başlık bağlantı metni olarak okunmaz; ilk sekiz sözcük yeter.
  return kelimeler.slice(0, 8).join(" ").trim();
}

/** İlk harfi Türkçe kurallarına göre büyütür. */
function bastanBuyut(metin: string): string {
  if (!metin) return metin;
  return metin[0].toLocaleUpperCase("tr-TR") + metin.slice(1);
}

/**
 * Hedef sayfa için bağlantı metni üretir.
 *
 * `sira` her kaynak sayfa için farklı bir kalıp seçilmesini sağlar;
 * böylece aynı hedefe giden bağlantılar birbirinin kopyası olmaz.
 */
export function anchorOner({
  keyword,
  sayfaTuru,
  sira = 0,
}: {
  keyword: string;
  sayfaTuru: SayfaTuru;
  sira?: number;
}): string {
  const temiz = kucult(keyword).trim();
  if (!temiz) return "";

  const kalipListesi = KALIPLAR[sayfaTuru] ?? KALIPLAR.diger;
  const kalip = kalipListesi[sira % kalipListesi.length];
  const metin = kalip(temiz);

  // Kelimenin kendisi kalıbı zaten içeriyorsa tekrarı önle: "buzdolabı
  // modelleri modelleri" gibi bir metin üretilmemeli.
  const tekrarVar = /\b(\p{L}+)\s+\1\b/u.test(metin);

  return bastanBuyut(tekrarVar ? temiz : metin);
}
