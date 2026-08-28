import "server-only";

import { alanAdiNormalize } from "@/lib/utils";

/**
 * Ücretsiz hızlı SEO analizi.
 *
 * Sayfayı doğrudan okuyup temel SEO sinyallerini çıkarır.
 * Dış bir veri sağlayıcısı kullanılmaz; bu sayede herkese açık olarak
 * sunulabilir ve çağrı başına maliyet oluşturmaz.
 */

/** Sayfa indirmede beklenecek azami süre. */
const ZAMAN_ASIMI_MS = 12_000;

/** İndirilecek azami içerik boyutu — çok büyük sayfalar kırpılır. */
const AZAMI_BOYUT = 2_000_000;

export type Bulgu = {
  kod: string;
  baslik: string;
  aciklama: string;
  onem: "kritik" | "uyari" | "bilgi" | "olumlu";
};

export type HizliAnalizSonucu = {
  url: string;
  alanAdi: string;
  skor: number;
  title: string | null;
  titleUzunluk: number;
  metaAciklama: string | null;
  metaAciklamaUzunluk: number;
  h1: string[];
  h2Sayisi: number;
  gorselSayisi: number;
  altMetinsizGorsel: number;
  icLink: number;
  disLink: number;
  canonical: string | null;
  robotsNoindex: boolean;
  schemaTurleri: string[];
  ogEtiketleri: boolean;
  viewport: boolean;
  dilEtiketi: string | null;
  kelimeSayisi: number;
  https: boolean;
  bulgular: Bulgu[];
};

export type HizliAnalizHatasi = { hata: string };

function etiketIcerigi(html: string, etiket: string): string[] {
  const desen = new RegExp(`<${etiket}[^>]*>([\\s\\S]*?)</${etiket}>`, "gi");
  const sonuclar: string[] = [];
  let eslesme: RegExpExecArray | null;

  while ((eslesme = desen.exec(html)) !== null) {
    const metin = eslesme[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (metin) sonuclar.push(metin);
  }
  return sonuclar;
}

function metaIcerigi(html: string, adDeseni: string): string | null {
  const desenler = [
    new RegExp(`<meta[^>]+name=["']${adDeseni}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${adDeseni}["']`, "i"),
  ];

  for (const d of desenler) {
    const e = html.match(d);
    if (e) return e[1].trim();
  }
  return null;
}

/** Sayfayı indirip temel SEO sinyallerini çıkarır. */
export async function hizliAnalizYap(girdi: string): Promise<HizliAnalizSonucu | HizliAnalizHatasi> {
  const adres = alanAdiNormalize(girdi);
  if (!adres.gecerli) return { hata: adres.hata };

  let yanit: Response;
  const kontrolcu = new AbortController();
  const zamanlayici = setTimeout(() => kontrolcu.abort(), ZAMAN_ASIMI_MS);

  try {
    yanit = await fetch(adres.url, {
      redirect: "follow",
      signal: kontrolcu.signal,
      headers: {
        // Sunucular normal bir tarayıcıdan gelen isteği beklediği için tanıtıcı gönderilir.
        "User-Agent": "Mozilla/5.0 (compatible; SEO Evi/1.0; +https://seoevi.com.tr)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    });
  } catch (hata) {
    const iptal = hata instanceof Error && hata.name === "AbortError";
    console.warn("[hizli-analiz] sayfa alınamadı", {
      alanAdi: adres.domain,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return {
      hata: iptal
        ? "Site zamanında yanıt vermedi. Adresi kontrol edip tekrar deneyin."
        : "Siteye ulaşılamadı. Adresin doğru olduğundan ve sitenin erişilebilir olduğundan emin olun.",
    };
  } finally {
    clearTimeout(zamanlayici);
  }

  if (!yanit.ok) {
    return {
      hata: `Site ${yanit.status} yanıtı döndürdü. Sayfanın herkese açık olduğundan emin olun.`,
    };
  }

  const icerikTuru = yanit.headers.get("content-type") ?? "";
  if (!icerikTuru.includes("html")) {
    return { hata: "Bu adres bir web sayfası değil. Ana sayfanızın adresini girmeyi deneyin." };
  }

  const ham = await yanit.text();
  const html = ham.slice(0, AZAMI_BOYUT);

  /* ---------------- Sinyaller ---------------- */

  const title = etiketIcerigi(html, "title")[0] ?? null;
  const metaAciklama = metaIcerigi(html, "description");
  const robots = metaIcerigi(html, "robots") ?? "";
  const h1 = etiketIcerigi(html, "h1");
  const h2Sayisi = etiketIcerigi(html, "h2").length;

  const gorseller = html.match(/<img[^>]*>/gi) ?? [];
  const altMetinsiz = gorseller.filter((g) => !/\salt\s*=\s*["'][^"']+["']/i.test(g)).length;

  const baglantilar = html.match(/<a[^>]+href=["']([^"']+)["']/gi) ?? [];
  let icLink = 0;
  let disLink = 0;
  for (const b of baglantilar) {
    const hedef = b.match(/href=["']([^"']+)["']/i)?.[1] ?? "";
    if (hedef.startsWith("#") || hedef.startsWith("mailto:") || hedef.startsWith("tel:")) continue;
    if (/^https?:\/\//i.test(hedef)) {
      if (hedef.includes(adres.domain)) icLink += 1;
      else disLink += 1;
    } else {
      icLink += 1;
    }
  }

  const canonical =
    html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']*)["'][^>]*rel=["']canonical["']/i)?.[1] ??
    null;

  const schemaTurleri = [
    ...new Set(
      [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)].map((e) => e[1]).filter(Boolean),
    ),
  ].slice(0, 12);

  const govde = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const kelimeSayisi = govde ? govde.split(" ").filter((k) => k.length > 1).length : 0;

  const sonuc: Omit<HizliAnalizSonucu, "skor" | "bulgular"> = {
    url: yanit.url || adres.url,
    alanAdi: adres.domain,
    title,
    titleUzunluk: title?.length ?? 0,
    metaAciklama,
    metaAciklamaUzunluk: metaAciklama?.length ?? 0,
    h1,
    h2Sayisi,
    gorselSayisi: gorseller.length,
    altMetinsizGorsel: altMetinsiz,
    icLink,
    disLink,
    canonical,
    robotsNoindex: /noindex/i.test(robots),
    schemaTurleri,
    ogEtiketleri: /property=["']og:(title|description|image)["']/i.test(html),
    viewport: /name=["']viewport["']/i.test(html),
    dilEtiketi: html.match(/<html[^>]+lang=["']([^"']+)["']/i)?.[1] ?? null,
    kelimeSayisi,
    https: (yanit.url || adres.url).startsWith("https://"),
  };

  const bulgular = bulgulariCikar(sonuc);
  const skor = skorHesapla(bulgular);

  return { ...sonuc, skor, bulgular };
}

/** Sinyalleri okunabilir bulgulara çevirir. */
function bulgulariCikar(s: Omit<HizliAnalizSonucu, "skor" | "bulgular">): Bulgu[] {
  const b: Bulgu[] = [];

  /* --- Başlık --- */
  if (!s.title) {
    b.push({
      kod: "title_yok",
      baslik: "Sayfa başlığı bulunamadı",
      aciklama:
        "Başlık etiketi arama sonuçlarında görünen ilk şeydir ve sıralamayı doğrudan etkiler. Mutlaka eklenmeli.",
      onem: "kritik",
    });
  } else if (s.titleUzunluk < 30) {
    b.push({
      kod: "title_kisa",
      baslik: `Sayfa başlığı çok kısa (${s.titleUzunluk} karakter)`,
      aciklama: "30-60 karakter arası bir başlık, arama sonuçlarında kırpılmadan görünür.",
      onem: "uyari",
    });
  } else if (s.titleUzunluk > 60) {
    b.push({
      kod: "title_uzun",
      baslik: `Sayfa başlığı çok uzun (${s.titleUzunluk} karakter)`,
      aciklama: "60 karakteri aşan başlıklar arama sonuçlarında kırpılır. Önemli kelimeler başta olmalı.",
      onem: "uyari",
    });
  } else {
    b.push({
      kod: "title_iyi",
      baslik: "Sayfa başlığı uygun uzunlukta",
      aciklama: `${s.titleUzunluk} karakter — arama sonuçlarında tam görünür.`,
      onem: "olumlu",
    });
  }

  /* --- Meta açıklama --- */
  if (!s.metaAciklama) {
    b.push({
      kod: "aciklama_yok",
      baslik: "Meta açıklama bulunamadı",
      aciklama:
        "Meta açıklama tıklama oranını etkiler. Yazmazsanız arama motoru sayfadan rastgele bir bölüm gösterir.",
      onem: "kritik",
    });
  } else if (s.metaAciklamaUzunluk < 70) {
    b.push({
      kod: "aciklama_kisa",
      baslik: `Meta açıklama çok kısa (${s.metaAciklamaUzunluk} karakter)`,
      aciklama: "120-158 karakter arası bir açıklama, alanın tamamını kullanır.",
      onem: "uyari",
    });
  } else if (s.metaAciklamaUzunluk > 158) {
    b.push({
      kod: "aciklama_uzun",
      baslik: `Meta açıklama çok uzun (${s.metaAciklamaUzunluk} karakter)`,
      aciklama: "158 karakteri aşan açıklamalar kırpılır.",
      onem: "uyari",
    });
  } else {
    b.push({
      kod: "aciklama_iyi",
      baslik: "Meta açıklama uygun uzunlukta",
      aciklama: `${s.metaAciklamaUzunluk} karakter.`,
      onem: "olumlu",
    });
  }

  /* --- H1 --- */
  if (s.h1.length === 0) {
    /*
     * Bu araç sayfayı JavaScript çalıştırmadan okur. İçeriğini tarayıcıda
     * üreten sitelerde başlıklar HTML'de bulunmaz; "H1 yok" demek sayfa
     * hakkında değil ölçümün sınırı hakkında olur. İmza, metin okunuyor
     * ama hiçbir başlık etiketi görünmüyor olmasıdır.
     */
    const icerikVarBaslikYok = s.kelimeSayisi > 300 && s.h2Sayisi === 0;

    b.push(
      icerikVarBaslikYok
        ? {
            kod: "baslik_okunamadi",
            baslik: "Başlıklar okunamadı — içerik JavaScript ile yükleniyor",
            aciklama:
              "Sayfada metin var ama hiçbir başlık etiketi görünmüyor; başlıklar tarayıcıda " +
              "üretiliyor olabilir. Bu hızlı araç sayfayı JavaScript çalıştırmadan okur. " +
              "Ücretsiz hesap açtığınızda SEO Evi sayfaları tarayıcı çalıştırarak ölçer.",
            onem: "uyari",
          }
        : {
            kod: "h1_yok",
            baslik: "H1 başlığı bulunamadı",
            aciklama: "Her sayfada sayfanın konusunu özetleyen tek bir H1 başlığı olmalı.",
            onem: "kritik",
          },
    );
  } else if (s.h1.length > 1) {
    b.push({
      kod: "h1_fazla",
      baslik: `${s.h1.length} adet H1 başlığı var`,
      aciklama: "Birden fazla H1, sayfanın ana konusunu belirsizleştirir. Tek H1 kullanın.",
      onem: "uyari",
    });
  } else {
    b.push({
      kod: "h1_iyi",
      baslik: "Tek bir H1 başlığı kullanılmış",
      aciklama: s.h1[0].slice(0, 90),
      onem: "olumlu",
    });
  }

  /* --- İndekslenebilirlik --- */
  if (s.robotsNoindex) {
    b.push({
      kod: "noindex",
      baslik: "Sayfa indekslenmeye kapalı",
      aciklama:
        "Sayfada noindex etiketi var. Bu sayfa arama sonuçlarında hiçbir şekilde görünmez. Bilerek yapılmadıysa acilen kaldırılmalı.",
      onem: "kritik",
    });
  }

  if (!s.https) {
    b.push({
      kod: "https_yok",
      baslik: "Site HTTPS kullanmıyor",
      aciklama: "Şifreli bağlantı bir sıralama sinyalidir ve kullanıcı güveni için gereklidir.",
      onem: "kritik",
    });
  }

  /* --- Görseller --- */
  if (s.altMetinsizGorsel > 0) {
    b.push({
      kod: "alt_metin",
      baslik: `${s.altMetinsizGorsel} görselde alt metni eksik`,
      aciklama:
        "Alt metni, görsel aramasında bulunmanızı sağlar ve erişilebilirlik için gereklidir.",
      onem: s.altMetinsizGorsel > 10 ? "uyari" : "bilgi",
    });
  }

  /* --- Yapısal veri --- */
  if (s.schemaTurleri.length === 0) {
    b.push({
      kod: "schema_yok",
      baslik: "Yapısal veri işaretlemesi bulunamadı",
      aciklama:
        "Schema işaretlemesi, arama sonuçlarında zengin gösterim ve yapay zekâ cevaplarında yer alma şansınızı artırır.",
      onem: "uyari",
    });
  } else {
    b.push({
      kod: "schema_var",
      baslik: "Yapısal veri kullanılmış",
      aciklama: `Bulunan türler: ${s.schemaTurleri.slice(0, 5).join(", ")}`,
      onem: "olumlu",
    });
  }

  /* --- Diğer --- */
  if (!s.canonical) {
    b.push({
      kod: "canonical_yok",
      baslik: "Canonical etiketi yok",
      aciklama: "Canonical, aynı içeriğin birden fazla adreste yinelenmesini önler.",
      onem: "bilgi",
    });
  }

  if (!s.ogEtiketleri) {
    b.push({
      kod: "og_yok",
      baslik: "Sosyal medya etiketleri eksik",
      aciklama:
        "OpenGraph etiketleri olmadan bağlantınız sosyal medyada paylaşıldığında düzgün görünmez.",
      onem: "bilgi",
    });
  }

  if (!s.viewport) {
    b.push({
      kod: "viewport_yok",
      baslik: "Mobil görünüm etiketi eksik",
      aciklama: "Viewport etiketi olmadan sayfa mobil cihazlarda doğru ölçeklenmez.",
      onem: "uyari",
    });
  }

  if (!s.dilEtiketi) {
    b.push({
      kod: "dil_yok",
      baslik: "Sayfa dili belirtilmemiş",
      aciklama: "html etiketine lang=\"tr\" eklemek, arama motorlarının dili doğru anlamasını sağlar.",
      onem: "bilgi",
    });
  }

  if (s.kelimeSayisi < 250) {
    b.push({
      kod: "icerik_az",
      baslik: `Sayfada az metin var (${s.kelimeSayisi} kelime)`,
      aciklama:
        "İçeriği zayıf sayfaların sıralanması zordur. Sayfanın konusunu açıklayan metin ekleyin.",
      onem: "uyari",
    });
  }

  return b;
}

/** Bulgulardan 100 üzerinden bir skor üretir. */
function skorHesapla(bulgular: Bulgu[]): number {
  const CEZA = { kritik: 18, uyari: 7, bilgi: 2, olumlu: 0 } as const;
  const toplam = bulgular.reduce((t, b) => t + CEZA[b.onem], 0);
  return Math.max(0, Math.min(100, 100 - toplam));
}
