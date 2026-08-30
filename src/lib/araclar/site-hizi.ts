import "server-only";

import { onbellekli, type Tazelik } from "@/lib/dataforseo/cache";
import { dfsTekSonuc, yenidenDene } from "@/lib/dataforseo/client";
import { alanAdiNormalize } from "@/lib/utils";

/**
 * Ücretsiz site hızı testi.
 *
 * Sayfa hızı e-ticarette iki kere önemli: Google sıralamada kullanıyor ve
 * yavaş sayfa doğrudan satış kaybettiriyor. Ölçüm Google'ın kendi
 * Lighthouse motoruyla, mobil cihaz koşullarında yapılır — Türkiye'de
 * e-ticaret trafiğinin ezici çoğunluğu mobil.
 *
 * Sağlayıcı 160 denetim döndürüyor. Hepsini göstermek kullanıcıyı boğar;
 * bu yüzden e-ticaret sitelerinde gerçekten fark yaratan denetimler
 * seçilip Türkçe, ne yapılacağını söyleyen metinlerle sunulur.
 */

/** Ölçümün tamamlanması için tanınan süre. */
const AZAMI_SURE_MS = 90_000;

export type HizSkoru = {
  ad: string;
  anahtar: string;
  skor: number;
};

export type CekirdekOlcum = {
  anahtar: string;
  ad: string;
  aciklama: string;
  /** Kullanıcıya gösterilen, Türkçe biçimlendirilmiş değer. */
  deger: string;
  /**
   * Sağlayıcının ham sayısal değeri (milisaniye; CLS birimsiz).
   * Saklama ve karşılaştırma bunun üzerinden yapılır — biçimlendirilmiş
   * metni geri ayrıştırmak hassasiyet kaybettirir.
   */
  hamDeger: number | null;
  skor: number | null;
  /** Google'ın "iyi" saydığı eşik — kullanıcı neye göre kötü olduğunu görsün. */
  hedef: string;
};

export type HizBulgusu = {
  kod: string;
  baslik: string;
  aciklama: string;
  onem: "kritik" | "uyari" | "bilgi";
  /** Sağlayıcının bildirdiği kazanç, örn. "423 KB" veya "2.510 ms". */
  kazanc: string | null;
};

export type SiteHiziSonucu = {
  url: string;
  alanAdi: string;
  mobil: boolean;
  /** 0-100 performans skoru. */
  performans: number;
  skorlar: HizSkoru[];
  olcumler: CekirdekOlcum[];
  bulgular: HizBulgusu[];
  olculduAt: string;
};

export type SiteHiziHatasi = { hata: string };

/* ------------------------------------------------------------------ */
/* Metin tabloları                                                     */
/* ------------------------------------------------------------------ */

const KATEGORI_ADI: Record<string, string> = {
  performance: "Performans",
  accessibility: "Erişilebilirlik",
  "best-practices": "En iyi uygulamalar",
  seo: "SEO",
};

/**
 * Çekirdek Web Verileri.
 *
 * Eşikler Google'ın kendi "iyi" sınırlarıdır; uydurma değildir.
 */
const CEKIRDEK: { anahtar: string; ad: string; aciklama: string; hedef: string }[] = [
  {
    anahtar: "largest-contentful-paint",
    ad: "En büyük içeriğin görünmesi",
    aciklama:
      "Ürün görseli gibi sayfanın en büyük parçasının ekranda belirmesi. Ziyaretçinin \"sayfa açıldı\" dediği an budur.",
    hedef: "2,5 sn altı",
  },
  {
    anahtar: "cumulative-layout-shift",
    ad: "Yerleşim kayması",
    aciklama:
      "Sayfa yüklenirken içeriğin zıplaması. E-ticarette en pahalı hatadır: kullanıcı \"Sepete Ekle\"ye basarken buton kayar, yanlış yere tıklar.",
    hedef: "0,1 altı",
  },
  {
    anahtar: "total-blocking-time",
    ad: "Etkileşimin kilitlenmesi",
    aciklama:
      "Sayfa göründükten sonra tıklamalara cevap vermediği süre. Uzunsa kullanıcı butona birkaç kez basar ve vazgeçer.",
    hedef: "200 ms altı",
  },
  {
    anahtar: "first-contentful-paint",
    ad: "İlk içeriğin görünmesi",
    aciklama: "Boş ekranın bitip ilk yazının/görselin çıktığı an.",
    hedef: "1,8 sn altı",
  },
  {
    anahtar: "speed-index",
    ad: "Görsel dolma hızı",
    aciklama: "Ekranın gözle görülür biçimde dolma hızı.",
    hedef: "3,4 sn altı",
  },
  {
    anahtar: "server-response-time",
    ad: "Sunucu cevap süresi",
    aciklama:
      "Sunucunun ilk baytı göndermesi. Yüksekse sorun tasarımda değil altyapıda veya veritabanı sorgularındadır.",
    hedef: "600 ms altı",
  },
];

/**
 * E-ticaret sitelerinde gerçekten fark yaratan denetimler.
 *
 * Kodlar sağlayıcıdan gelen gerçek yanıt üzerinden seçildi; Lighthouse
 * sürümden sürüme denetim adlarını değiştirdiği için tahminle liste
 * yazmak sessizce boş sonuç üretiyordu. Bulunmayan kod zaten atlanır.
 *
 * Sağlayıcının İngilizce başlıkları kullanılmaz; her biri ne yapılacağını
 * söyleyen Türkçe metne çevrilir.
 */
const BULGU_METNI: Record<string, { baslik: string; aciklama: string; onem: HizBulgusu["onem"] }> = {
  "render-blocking-insight": {
    baslik: "Sayfayı bekleten dosyalar var",
    aciklama:
      "Bazı CSS ve JavaScript dosyaları sayfa çizilmeden önce indirilmeyi bekletiyor. Kritik olmayanları ertelemek ilk görüntüyü doğrudan hızlandırır.",
    onem: "kritik",
  },
  "total-byte-weight": {
    baslik: "Sayfa çok ağır",
    aciklama:
      "Toplam indirilen boyut yüksek. Mobil veri bağlantısındaki bir müşteri bu sayfayı açmadan vazgeçebilir; ağırlığın büyük kısmı genellikle ürün görselleridir.",
    onem: "kritik",
  },
  "cache-insight": {
    baslik: "Tarayıcı önbelleği kullanılmıyor",
    aciklama:
      "Görsel ve stil dosyaları her ziyarette yeniden indiriliyor. Uzun önbellek süresi vermek, geri gelen müşteri için sayfayı belirgin biçimde hızlandırır ve sunucu yükünü düşürür.",
    onem: "kritik",
  },
  "unused-javascript": {
    baslik: "Kullanılmayan JavaScript indiriliyor",
    aciklama:
      "Sayfanın ihtiyaç duymadığı kod indirilip çalıştırılıyor. Genellikle tema eklentileri ve zamanla biriken pazarlama etiketlerinden gelir.",
    onem: "kritik",
  },
  "image-delivery-insight": {
    baslik: "Görseller iyileştirilmemiş",
    aciklama:
      "Ürün görselleri gereğinden büyük dosya boyutuyla sunuluyor. Modern biçim (WebP/AVIF) ve doğru boyutlandırma çoğu e-ticaret sitesinde tek başına en büyük kazançtır.",
    onem: "kritik",
  },
  "unsized-images": {
    baslik: "Görsellerin ölçüsü belirtilmemiş",
    aciklama:
      "Görsellere genişlik/yükseklik verilmediği için yüklenirken sayfa zıplıyor. E-ticarette en pahalı hata budur: müşteri Sepete Ekle'ye basarken buton kayar.",
    onem: "kritik",
  },
  "meta-viewport": {
    baslik: "Mobil görünüm etiketi sorunlu",
    aciklama:
      "Viewport etiketi eksik veya yakınlaştırmayı engelliyor. Google mobil sürümü esas aldığı için bu doğrudan sıralamayı etkiler.",
    onem: "kritik",
  },
  "unused-css-rules": {
    baslik: "Kullanılmayan CSS indiriliyor",
    aciklama: "Bu sayfada hiç uygulanmayan stil kuralları indiriliyor.",
    onem: "uyari",
  },
  "bootup-time": {
    baslik: "JavaScript çalışması uzun sürüyor",
    aciklama:
      "Kodun çalışması telefonun işlemcisini uzun süre meşgul ediyor. Bu sırada sayfa görünse bile tıklamalara cevap vermez.",
    onem: "uyari",
  },
  "mainthread-work-breakdown": {
    baslik: "Tarayıcı ana iş parçacığı tıkanıyor",
    aciklama:
      "Tarayıcı uzun süre başka işlerle meşgul olduğu için kullanıcı etkileşimleri gecikiyor.",
    onem: "uyari",
  },
  "layout-shifts": {
    baslik: "Sayfada yerleşim kayması oluyor",
    aciklama:
      "Yüklenirken içerik yer değiştiriyor. Ölçü verilmemiş görseller, sonradan gelen banner ve yazı tipleri en sık nedenlerdir.",
    onem: "uyari",
  },
  "lcp-discovery-insight": {
    baslik: "Ana görsel geç keşfediliyor",
    aciklama:
      "Sayfanın en büyük görseli tarayıcı tarafından geç bulunuyor. Ürün fotoğrafını önceden yüklemek (preload) ve tembel yüklemeden çıkarmak gerekir.",
    onem: "uyari",
  },
  "errors-in-console": {
    baslik: "Tarayıcı konsolunda hata var",
    aciklama:
      "Sayfada JavaScript hataları oluşuyor. Sepete ekleme, varyant seçimi gibi işlevler sessizce bozulmuş olabilir.",
    onem: "uyari",
  },
  "crawlable-anchors": {
    baslik: "Bazı bağlantılar taranamıyor",
    aciklama:
      "Bağlantılar arama motorunun izleyemeyeceği biçimde kurulmuş. Bu sayfalardan iç bağlantı gücü akmaz ve hedef sayfalar keşfedilmeyebilir.",
    onem: "uyari",
  },
  "robots-txt": {
    baslik: "robots.txt dosyasında sorun var",
    aciklama:
      "Arama motorlarına ne tarayacağını söyleyen dosyada hata bulundu. Yanlış bir satır tüm kategori sayfalarını taranamaz hâle getirebilir.",
    onem: "uyari",
  },
  "target-size": {
    baslik: "Dokunma hedefleri küçük",
    aciklama:
      "Buton ve bağlantılar telefonda rahat basılamayacak kadar küçük veya birbirine yakın. Mobil satın alma akışında doğrudan kayıp yaratır.",
    onem: "bilgi",
  },
  "unminified-css": {
    baslik: "CSS küçültülmemiş",
    aciklama: "Stil dosyaları gereksiz boşluk ve yorum içeriyor.",
    onem: "bilgi",
  },
  "network-dependency-tree-insight": {
    baslik: "İstekler zincirleme bekliyor",
    aciklama:
      "Bazı dosyalar ancak başka dosyalar indikten sonra istenebiliyor. Zincir uzadıkça ilk görüntü gecikir.",
    onem: "bilgi",
  },
  "third-party-cookies": {
    baslik: "Üçüncü taraf çerezleri kullanılıyor",
    aciklama:
      "Tarayıcılar üçüncü taraf çerezlerini kaldırıyor. Ölçümleme ve yeniden pazarlama kurulumunuz yakın gelecekte veri kaybedebilir.",
    onem: "bilgi",
  },
};

/** Bulguların gösterim sırası — en çok fark yaratan üstte. */
const ONEM_SIRASI: Record<HizBulgusu["onem"], number> = { kritik: 0, uyari: 1, bilgi: 2 };

/* ------------------------------------------------------------------ */
/* Ham yanıt                                                           */
/* ------------------------------------------------------------------ */

type HamDenetim = {
  score?: number | null;
  displayValue?: string | null;
  scoreDisplayMode?: string | null;
  /** Ölçümün ham sayısal karşılığı. */
  numericValue?: number | null;
};

type HamLighthouse = {
  categories?: Record<string, { score?: number | null }>;
  audits?: Record<string, HamDenetim>;
  fetch_time?: string;
};

/**
 * Kullanıcının girdiği adresi doğrular ve YOLUNU KORUR.
 *
 * `alanAdiNormalize` yalnızca alan adını döndürür; hız testinde kullanıcı
 * çoğu zaman belirli bir ürün ya da kategori sayfasını ölçmek ister ve
 * asıl sorun genellikle oradadır — ana sayfa hafif, ürün sayfası ağırdır.
 */
function adresNormalize(girdi: string): { url: string; alanAdi: string } | { hata: string } {
  const dogrulama = alanAdiNormalize(girdi);
  if (!dogrulama.gecerli) return { hata: dogrulama.hata };

  const ham = (girdi ?? "").trim();
  const aday = /^https?:\/\//i.test(ham) ? ham : `https://${ham}`;

  try {
    const u = new URL(aday);
    const yol = `${u.pathname}${u.search}`.replace(/\/$/, "");
    return { url: `https://${dogrulama.domain}${yol}`, alanAdi: dogrulama.domain };
  } catch {
    return { hata: "Geçerli bir web sitesi adresi girin. Örnek: magazam.com/urun/tisort" };
  }
}

/**
 * Denetim gerçekten bir başarısızlık mı, yoksa bilgi amaçlı mı?
 *
 * Puanlanan modlar izin listesiyle belirlenir. Önceden yalnızca `binary`
 * ve `numeric` kabul ediliyordu; oysa iyileştirme önerilerinin çoğu
 * `metricSavings` modunda geliyor ve hepsi sessizce eleniyordu — 35
 * başarısız denetimi olan bir sayfada tek bulgu gösteriliyordu.
 */
const PUANLANAN_MODLAR = new Set(["binary", "numeric", "metricSavings"]);

function basarisizMi(denetim: HamDenetim | undefined): boolean {
  if (!denetim) return false;
  // "informative", "notApplicable", "manual" ve "error" bir sorun bildirmez.
  if (denetim.scoreDisplayMode && !PUANLANAN_MODLAR.has(denetim.scoreDisplayMode)) return false;
  return typeof denetim.score === "number" && denetim.score < 0.9;
}

/**
 * Sağlayıcının İngilizce gösterim metnini Türkçeye uyarlar.
 *
 * Gelen değerler "46.8 s", "11,100 ms", "Est savings of 423 KiB" ve
 * "Root document took 920 ms" gibi biçimlerde. Türkçede ondalık ayırıcı
 * virgül, binlik ayırıcı noktadır; İngilizce biçimi olduğu gibi
 * göstermek "11,100 ms" değerini yüz milisaniye sanmaya yol açar.
 */
function degeriTurkcelestir(ham: string | null | undefined): string | null {
  if (!ham) return null;

  // Metnin içindeki ilk sayı + birim yakalanır.
  const eslesme = ham.match(/(\d[\d,.]*)\s*(KiB|MiB|KB|MB|ms|s)(?![a-z])/i) ?? ham.match(/^\s*(\d[\d,.]*)\s*$/);
  if (!eslesme) return null;

  const sayiMetni = eslesme[1];
  const birimHam = eslesme[2];

  /*
   * İngilizce biçimden sayıya: binlik virgülleri atılır, ondalık nokta
   * kalır. "11,100 ms" bin yüz değil on bir bin yüz milisaniyedir.
   */
  const sayi = Number(sayiMetni.replace(/,/g, ""));
  if (!Number.isFinite(sayi)) return null;

  const birim =
    birimHam === undefined
      ? null
      : /^KiB$/i.test(birimHam)
        ? "KB"
        : /^MiB$/i.test(birimHam)
          ? "MB"
          : /^s$/i.test(birimHam)
            ? "sn"
            : birimHam.toLowerCase();

  /*
   * Kaynaktaki hassasiyet korunur: "46.8 s" değerini 47'ye yuvarlamak
   * ölçümü olduğundan iyi gösterir.
   */
  const basamak = sayi < 1 ? 3 : sayi < 100 ? 1 : 0;

  return `${sayi.toLocaleString("tr-TR", { maximumFractionDigits: basamak })}${birim ? ` ${birim}` : ""}`;
}

/* ------------------------------------------------------------------ */
/* Ölçüm                                                               */
/* ------------------------------------------------------------------ */

/**
 * Bir sayfanın hızını ölçer.
 *
 * Ölçüm varsayılan olarak mobil cihaz koşullarında yapılır: Türkiye'de
 * e-ticaret trafiğinin büyük çoğunluğu mobil ve mobil skorlar masaüstünden
 * belirgin biçimde düşüktür. Yalnızca masaüstünü ölçüp "sitem hızlı"
 * demek yanıltıcı olurdu.
 */
export async function siteHiziOlc({
  url,
  mobil = true,
  tazelik,
}: {
  url: string;
  mobil?: boolean;
  tazelik?: Tazelik;
}): Promise<SiteHiziSonucu | SiteHiziHatasi> {
  const adres = adresNormalize(url);
  if ("hata" in adres) return { hata: adres.hata };

  let veri: HamLighthouse | null = null;

  try {
    const cevap = await onbellekli<HamLighthouse | null>(
      {
        endpoint: "/on_page/lighthouse/live/json",
        parametreler: { url: adres.url, mobil },
        grup: "serp_arac",
        tazelik,
      },
      () =>
        yenidenDene(() =>
          dfsTekSonuc<HamLighthouse>("/on_page/lighthouse/live/json", [
            { url: adres.url, for_mobile: mobil },
          ]),
        ),
    );
    veri = cevap.veri;
  } catch (hata) {
    console.error("[site-hizi] ölçüm başarısız", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return { hata: "Ölçüm tamamlanamadı. Adresi kontrol edip birkaç dakika sonra tekrar deneyin." };
  }

  if (!veri?.categories) {
    return {
      hata: "Bu adres ölçülemedi. Sayfanın herkese açık olduğundan ve yönlendirme yapmadığından emin olun.",
    };
  }

  return lighthouseCevir(veri, adres.url, adres.alanAdi, mobil);
}

/**
 * Ham Lighthouse yanıtını ürünün kullandığı biçime çevirir.
 *
 * Hem canlı hem kuyruklu akış aynı yanıtı döndürdüğü için çeviri tek
 * yerde durur; iki kopya tutmak sürüm farklarında sessizce ayrışırdı.
 */
export function lighthouseCevir(
  veri: HamLighthouse,
  url: string,
  alanAdi: string,
  mobil: boolean,
): SiteHiziSonucu {
  const denetimler = veri.audits ?? {};
  const kategoriler = veri.categories ?? {};

  const skorlar: HizSkoru[] = Object.entries(KATEGORI_ADI)
    .filter(([anahtar]) => kategoriler[anahtar])
    .map(([anahtar, ad]) => ({
      anahtar,
      ad,
      skor: Math.round((kategoriler[anahtar]!.score ?? 0) * 100),
    }));

  const olcumler: CekirdekOlcum[] = CEKIRDEK.filter((c) => denetimler[c.anahtar]).map((c) => ({
    anahtar: c.anahtar,
    ad: c.ad,
    aciklama: c.aciklama,
    hedef: c.hedef,
    deger: degeriTurkcelestir(denetimler[c.anahtar]?.displayValue) ?? "—",
    hamDeger:
      typeof denetimler[c.anahtar]?.numericValue === "number"
        ? Math.round(denetimler[c.anahtar]!.numericValue! * 1000) / 1000
        : null,
    skor: typeof denetimler[c.anahtar]?.score === "number" ? denetimler[c.anahtar]!.score! : null,
  }));

  const bulgular: HizBulgusu[] = Object.entries(BULGU_METNI)
    .filter(([kod]) => basarisizMi(denetimler[kod]))
    .map(([kod, metin]) => ({
      kod,
      ...metin,
      kazanc: degeriTurkcelestir(denetimler[kod]?.displayValue),
    }))
    .sort((a, b) => ONEM_SIRASI[a.onem] - ONEM_SIRASI[b.onem]);

  return {
    url,
    alanAdi,
    mobil,
    performans: Math.round((kategoriler.performance?.score ?? 0) * 100),
    skorlar,
    olcumler,
    bulgular,
    olculduAt: veri.fetch_time ? new Date(veri.fetch_time).toISOString() : new Date().toISOString(),
  };
}

export { AZAMI_SURE_MS };
