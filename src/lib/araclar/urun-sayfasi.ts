import "server-only";

/**
 * Ücretsiz ürün sayfası SEO testi.
 *
 * Genel SEO araçları bir ürün sayfasına blog yazısı gibi bakar: başlık
 * var mı, açıklama kaç karakter. Oysa e-ticarette Google'ın aradığı şey
 * farklıdır — fiyat, stok durumu, para birimi ve değerlendirme bilgisini
 * yapısal veri olarak okuyabilmesi gerekir. Bu bilgiler eksikse ürün
 * arama sonuçlarında zengin sonuç olarak görünmez; yani rakibinin
 * altında fiyatı ve yıldızıyla çıkan ürünle aynı sahada oynamaz.
 *
 * Bu araç sayfayı doğrudan okur; dış bir veri sağlayıcısı kullanılmaz ve
 * çağrı başına maliyet oluşturmaz.
 */

/** Sayfa indirmede beklenecek azami süre. */
const ZAMAN_ASIMI_MS = 12_000;

/** İndirilecek azami içerik boyutu — çok büyük sayfalar kırpılır. */
const AZAMI_BOYUT = 2_000_000;

export type UrunBulgusu = {
  kod: string;
  baslik: string;
  aciklama: string;
  onem: "kritik" | "uyari" | "bilgi" | "olumlu";
};

export type UrunSayfasiSonucu = {
  url: string;
  alanAdi: string;
  skor: number;
  /** Ürün şeması bulundu mu? Aracın can alıcı sorusu. */
  urunSemasiVar: boolean;
  ad: string | null;
  fiyat: string | null;
  paraBirimi: string | null;
  stokDurumu: string | null;
  /** Stok durumunun okunabilir Türkçe karşılığı. */
  stokTurkce: string | null;
  puan: string | null;
  yorumSayisi: string | null;
  marka: string | null;
  gtin: string | null;
  /** Kırıntı navigasyonu şeması — kategori hiyerarşisini Google'a anlatır. */
  kirintiVar: boolean;
  title: string | null;
  metaAciklama: string | null;
  h1: string[];
  gorselSayisi: number;
  altMetinsizGorsel: number;
  canonical: string | null;
  bulgular: UrunBulgusu[];
};

export type UrunSayfasiHatasi = { hata: string };

/* ------------------------------------------------------------------ */
/* HTML yardımcıları                                                   */
/* ------------------------------------------------------------------ */

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

function metaIcerigi(html: string, ad: string): string | null {
  const desenler = [
    new RegExp(`<meta[^>]+name=["']${ad}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*name=["']${ad}["']`, "i"),
  ];
  for (const d of desenler) {
    const e = html.match(d);
    if (e) return e[1].trim();
  }
  return null;
}

/** Sayfadaki tüm JSON-LD bloklarını ayrıştırır. */
function jsonLdOku(html: string): unknown[] {
  const desen = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const cikti: unknown[] = [];
  let e: RegExpExecArray | null;

  while ((e = desen.exec(html)) !== null) {
    try {
      cikti.push(JSON.parse(e[1].trim()));
    } catch {
      // Bozuk JSON-LD sık görülür; bir blok okunamazsa diğerleri denenir.
    }
  }
  return cikti;
}

/** İç içe @graph ve dizileri düzleştirerek tüm düğümleri verir. */
function dugumleriTopla(kok: unknown): Record<string, unknown>[] {
  const cikti: Record<string, unknown>[] = [];
  const kuyruk: unknown[] = [kok];

  while (kuyruk.length) {
    const d = kuyruk.shift();
    if (Array.isArray(d)) {
      kuyruk.push(...d);
      continue;
    }
    if (!d || typeof d !== "object") continue;

    const nesne = d as Record<string, unknown>;
    cikti.push(nesne);

    if (nesne["@graph"]) kuyruk.push(nesne["@graph"]);
    // Teklif ve değerlendirme bilgisi çoğu zaman iç içe durur.
    for (const alan of ["offers", "aggregateRating", "review", "brand"]) {
      if (nesne[alan]) kuyruk.push(nesne[alan]);
    }
  }
  return cikti;
}

function turuMu(dugum: Record<string, unknown>, tur: string): boolean {
  const t = dugum["@type"];
  if (typeof t === "string") return t.toLowerCase() === tur.toLowerCase();
  if (Array.isArray(t)) return t.some((x) => String(x).toLowerCase() === tur.toLowerCase());
  return false;
}

function metne(deger: unknown): string | null {
  if (deger === null || deger === undefined) return null;
  if (typeof deger === "string" || typeof deger === "number") return String(deger).trim() || null;
  return null;
}

/** "https://schema.org/InStock" → "InStock" */
function stokSadelestir(deger: string | null): string | null {
  if (!deger) return null;
  return deger.split("/").pop() ?? deger;
}

/** schema.org stok değerlerinin Türkçe karşılıkları. */
const STOK_TURKCE: Record<string, string> = {
  instock: "Stokta var",
  outofstock: "Stokta yok",
  preorder: "Ön sipariş",
  backorder: "Tedarik ediliyor",
  discontinued: "Üretimi durdu",
  limitedavailability: "Sınırlı stok",
  soldout: "Tükendi",
};

/* ------------------------------------------------------------------ */
/* Analiz                                                              */
/* ------------------------------------------------------------------ */

export async function urunSayfasiDenetle(
  girdi: string,
): Promise<UrunSayfasiSonucu | UrunSayfasiHatasi> {
  const ham = (girdi ?? "").trim();
  if (!ham) return { hata: "Ürün sayfasının adresini girin." };

  const aday = /^https?:\/\//i.test(ham) ? ham : `https://${ham}`;

  let adres: URL;
  try {
    adres = new URL(aday);
  } catch {
    return { hata: "Geçerli bir adres girin. Örnek: magazam.com/urun/triko-kazak" };
  }

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(adres.hostname)) {
    return { hata: "Geçerli bir web sitesi adresi girin." };
  }

  let yanit: Response;
  const kontrolcu = new AbortController();
  const zamanlayici = setTimeout(() => kontrolcu.abort(), ZAMAN_ASIMI_MS);

  try {
    yanit = await fetch(adres.toString(), {
      redirect: "follow",
      signal: kontrolcu.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEO Evi/1.0; +https://seoevi.com.tr)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "tr-TR,tr;q=0.9",
      },
      cache: "no-store",
    });
  } catch (hata) {
    const iptal = hata instanceof Error && hata.name === "AbortError";
    console.warn("[urun-sayfasi] sayfa alınamadı", {
      alanAdi: adres.hostname,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    return {
      hata: iptal
        ? "Sayfa zamanında yanıt vermedi. Adresi kontrol edip tekrar deneyin."
        : "Sayfaya ulaşılamadı. Adresin doğru ve herkese açık olduğundan emin olun.",
    };
  } finally {
    clearTimeout(zamanlayici);
  }

  if (!yanit.ok) {
    /*
     * Büyük pazaryerleri (Hepsiburada, Trendyol gibi) otomatik istekleri
     * 403 ile engelliyor. Bunu "adres yanlış" diye göstermek kullanıcıyı
     * boş yere adres aramaya iter; nedenini açıkça söylemek gerekir.
     */
    if (yanit.status === 403 || yanit.status === 429) {
      return {
        hata: "Bu site otomatik erişimi engelliyor; büyük pazaryerlerinde sık görülür. Kendi mağazanızın ürün sayfasını deneyebilirsiniz.",
      };
    }
    if (yanit.status === 404) {
      return { hata: "Bu adreste bir sayfa bulunamadı. Ürün adresini kontrol edin." };
    }
    return { hata: `Sayfa ${yanit.status} yanıtı döndürdü. Adresin doğru olduğundan emin olun.` };
  }

  if (!(yanit.headers.get("content-type") ?? "").includes("html")) {
    return { hata: "Bu adres bir web sayfası değil." };
  }

  const html = (await yanit.text()).slice(0, AZAMI_BOYUT);

  /* ---------------- Yapısal veri ---------------- */

  const dugumler = jsonLdOku(html).flatMap(dugumleriTopla);
  const urun = dugumler.find((d) => turuMu(d, "Product"));
  const teklif = dugumler.find((d) => turuMu(d, "Offer") || turuMu(d, "AggregateOffer"));
  const derece = dugumler.find((d) => turuMu(d, "AggregateRating"));
  const kirinti = dugumler.some((d) => turuMu(d, "BreadcrumbList"));

  const markaDugumu = dugumler.find((d) => turuMu(d, "Brand"));
  const marka =
    metne(markaDugumu?.name) ?? metne(urun?.brand) ?? null;

  const fiyat = metne(teklif?.price) ?? metne(teklif?.lowPrice) ?? null;
  // Siteler para birimini çoğu zaman küçük harfle yazıyor ("try");
  // schema.org ISO 4217 kodu bekler ve kullanıcıya da öyle gösterilmeli.
  const paraBirimi = metne(teklif?.priceCurrency)?.toUpperCase() ?? null;
  const stokDurumu = stokSadelestir(metne(teklif?.availability));

  const sonuc: Omit<UrunSayfasiSonucu, "skor" | "bulgular"> = {
    url: adres.toString(),
    alanAdi: adres.hostname.replace(/^www\./, ""),
    urunSemasiVar: Boolean(urun),
    ad: metne(urun?.name),
    fiyat,
    paraBirimi,
    stokDurumu,
    stokTurkce: stokDurumu ? (STOK_TURKCE[stokDurumu.toLowerCase()] ?? stokDurumu) : null,
    puan: metne(derece?.ratingValue),
    yorumSayisi: metne(derece?.reviewCount) ?? metne(derece?.ratingCount),
    marka,
    gtin:
      metne(urun?.gtin13) ?? metne(urun?.gtin) ?? metne(urun?.mpn) ?? metne(urun?.sku) ?? null,
    kirintiVar: kirinti,
    title: etiketIcerigi(html, "title")[0] ?? null,
    metaAciklama: metaIcerigi(html, "description"),
    h1: etiketIcerigi(html, "h1"),
    gorselSayisi: (html.match(/<img[^>]*>/gi) ?? []).length,
    altMetinsizGorsel: (html.match(/<img[^>]*>/gi) ?? []).filter(
      (g) => !/\salt\s*=\s*["'][^"']+["']/i.test(g),
    ).length,
    canonical: (html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ?? [])[1] ?? null,
  };

  const bulgular = bulgulariCikar(sonuc);

  return { ...sonuc, bulgular, skor: skorHesapla(bulgular) };
}

/* ------------------------------------------------------------------ */
/* Bulgular                                                            */
/* ------------------------------------------------------------------ */

function bulgulariCikar(s: Omit<UrunSayfasiSonucu, "skor" | "bulgular">): UrunBulgusu[] {
  const b: UrunBulgusu[] = [];

  /* --- Ürün şeması: aracın can alıcı noktası --- */
  if (!s.urunSemasiVar) {
    b.push({
      kod: "urun_semasi_yok",
      baslik: "Ürün şeması bulunamadı",
      aciklama:
        "Sayfada Product yapısal verisi yok. Google bu sayfanın bir ürün olduğunu anlamadığı için arama sonuçlarında fiyat ve stok bilgisiyle zengin görünüm alamazsınız. Rakibiniz fiyatı ve yıldızıyla çıkarken siz düz bir bağlantı olarak kalırsınız.",
      onem: "kritik",
    });
  } else {
    b.push({
      kod: "urun_semasi_var",
      baslik: "Ürün şeması bulundu",
      aciklama: "Google bu sayfayı bir ürün olarak tanıyabiliyor.",
      onem: "olumlu",
    });

    if (!s.fiyat) {
      b.push({
        kod: "fiyat_yok",
        baslik: "Fiyat yapısal veride yok",
        aciklama:
          "Fiyat sayfada görünse bile Google'ın okuduğu yapısal veride yer almıyor. Zengin sonuçta fiyat gösterilemez; bu, tıklama oranını doğrudan düşürür.",
        onem: "kritik",
      });
    } else if (!s.paraBirimi) {
      b.push({
        kod: "para_birimi_yok",
        baslik: "Para birimi belirtilmemiş",
        aciklama:
          "Fiyat var ama para birimi yok. Google fiyatı yorumlayamaz; `priceCurrency` alanına TRY eklenmelidir.",
        onem: "uyari",
      });
    }

    if (!s.stokDurumu) {
      b.push({
        kod: "stok_yok",
        baslik: "Stok durumu belirtilmemiş",
        aciklama:
          "`availability` alanı eksik. Google stokta olmayan ürünü öne çıkarmak istemez; bu bilgiyi vermeyen sayfalar zengin sonuç almakta dezavantajlıdır.",
        onem: "uyari",
      });
    }

    if (!s.puan) {
      b.push({
        kod: "puan_yok",
        baslik: "Değerlendirme puanı yok",
        aciklama:
          "Yıldızlar arama sonuçlarında en çok dikkat çeken öğedir. Müşteri yorumu topluyorsanız bunu AggregateRating olarak da işaretleyin; toplamıyorsanız yorum toplamaya başlamak en yüksek getirili işlerden biridir.",
        onem: "uyari",
      });
    }

    if (!s.marka) {
      b.push({
        kod: "marka_yok",
        baslik: "Marka bilgisi yok",
        aciklama:
          "`brand` alanı eksik. Marka adıyla yapılan aramalarda eşleşmeyi zorlaştırır ve Google Alışveriş tarafında eksiklik sayılır.",
        onem: "bilgi",
      });
    }

    if (!s.gtin) {
      b.push({
        kod: "urun_kodu_yok",
        baslik: "Ürün kodu (GTIN/MPN/SKU) yok",
        aciklama:
          "Ürün kodu, Google'ın aynı ürünü farklı satıcılarda eşleştirmesini sağlar. Kodsuz ürün, fiyat karşılaştırma sonuçlarında görünmekte zorlanır.",
        onem: "bilgi",
      });
    }
  }

  /* --- Kırıntı navigasyonu --- */
  if (!s.kirintiVar) {
    b.push({
      kod: "kirinti_yok",
      baslik: "Kırıntı navigasyonu şeması yok",
      aciklama:
        "BreadcrumbList, ürünün hangi kategoriye ait olduğunu Google'a anlatır ve arama sonucunda çirkin bir adres yerine kategori yolu gösterilmesini sağlar.",
      onem: "uyari",
    });
  }

  /* --- Temel etiketler --- */
  if (!s.title) {
    b.push({
      kod: "title_yok",
      baslik: "Sayfa başlığı yok",
      aciklama: "Başlık etiketi bulunamadı. Arama sonucunda gösterilecek ana metin budur.",
      onem: "kritik",
    });
  } else if (s.title.length > 65) {
    b.push({
      kod: "title_uzun",
      baslik: "Başlık çok uzun",
      aciklama: `Başlık ${s.title.length} karakter. Google yaklaşık 60 karakterden sonrasını keser; ürün adı ve marka öne alınmalı.`,
      onem: "bilgi",
    });
  }

  if (!s.metaAciklama) {
    b.push({
      kod: "aciklama_yok",
      baslik: "Meta açıklama yok",
      aciklama:
        "Arama sonucunda başlığın altında görünen metin yok. Google sayfadan rastgele bir bölüm seçer; ürünün satış cümlesini siz yazmalısınız.",
      onem: "uyari",
    });
  }

  if (s.h1.length === 0) {
    b.push({
      kod: "h1_yok",
      baslik: "H1 başlığı yok",
      aciklama:
        "Ürün sayfasının H1'i ürün adı olmalıdır. Yoksa sayfanın ne hakkında olduğu zayıf bir sinyalle anlaşılır.",
      onem: "uyari",
    });
  } else if (s.h1.length > 1) {
    b.push({
      kod: "h1_fazla",
      baslik: `Sayfada ${s.h1.length} adet H1 var`,
      aciklama: "Tek bir H1 olmalı ve o da ürün adı olmalıdır.",
      onem: "bilgi",
    });
  }

  if (!s.canonical) {
    b.push({
      kod: "canonical_yok",
      baslik: "Canonical etiketi yok",
      aciklama:
        "E-ticarette aynı ürün renk, beden ve sıralama parametreleriyle onlarca adreste açılabilir. Canonical olmadan Google hangisinin asıl sayfa olduğunu bilemez ve gücünüz bölünür.",
      onem: "uyari",
    });
  }

  if (s.gorselSayisi > 0 && s.altMetinsizGorsel / s.gorselSayisi > 0.4) {
    b.push({
      kod: "alt_metin_eksik",
      baslik: `${s.altMetinsizGorsel} görselde alt metni yok`,
      aciklama:
        "Ürün görselleri Google Görseller'den ciddi trafik getirir. Alt metni olmayan görsel aramada çıkmaz.",
      onem: "uyari",
    });
  }

  return b;
}

/** Bulgulardan 0-100 arası bir skor üretir. */
function skorHesapla(bulgular: UrunBulgusu[]): number {
  const agirlik: Record<UrunBulgusu["onem"], number> = {
    kritik: 22,
    uyari: 9,
    bilgi: 3,
    olumlu: 0,
  };

  const dusen = bulgular.reduce((t, b) => t + agirlik[b.onem], 0);
  return Math.max(0, Math.min(100, 100 - dusen));
}
