import "server-only";

import { onbellekli, type Tazelik } from "./cache";
import { DataForSeoHatasi, dfsIstek, dfsTekSonuc, yenidenDene } from "./client";

/* ------------------------------------------------------------------ */
/* Tarama görevi                                                       */
/* ------------------------------------------------------------------ */

/**
 * Site taramasını başlatır ve görev kimliğini döndürür.
 * Tarama asenkrondur; sonuçlar taramaOzeti / taramaSayfalari ile okunur.
 */
export async function taramaBaslat({
  url,
  maksSayfa = 200,
  jsCalistir = false,
}: {
  url: string;
  maksSayfa?: number;
  jsCalistir?: boolean;
}): Promise<string> {
  const gövde = [
    {
      target: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      max_crawl_pages: maksSayfa,
      load_resources: false,
      enable_javascript: jsCalistir,
      enable_browser_rendering: false,
      store_raw_html: false,
      check_spell: false,
      calculate_keyword_density: false,
      support_cookies: true,
      validate_micromarkup: true,
    },
  ];

  const yanit = await yenidenDene(() => dfsIstek<never>("/on_page/task_post", gövde));
  const gorevId = yanit.tasks?.[0]?.id;
  if (!gorevId) {
    throw new Error("Tarama görevi oluşturulamadı.");
  }
  return gorevId;
}

export type TaramaOzeti = {
  tamamlandi: boolean;
  ilerleme: number;
  taranan_sayfa: number;
  toplam_sayfa: number;
  /**
   * Tarama sayfa sınırına takılarak mı durdu?
   *
   * Sağlayıcı, sitede kaç sayfa KALDIĞINI bildirmez; yalnızca taramanın
   * neden bittiğini söyler. Bu yüzden "şu kadar sayfa daha var" denemez,
   * yalnızca "sınırda durdu, daha fazlası var" denebilir.
   */
  sinira_takildi: boolean;
  onpage_skoru: number | null;
  kontroller: Record<string, number>;
  sunucu: { ip: string | null; sunucu: string | null; cms: string | null };
  sayfa_metrikleri: {
    kirik_link: number;
    kirik_kaynak: number;
    duplicate_title: number;
    duplicate_description: number;
    duplicate_content: number;
    ic_link: number;
    dis_link: number;
    yonlendirme: number;
    indekslenemez: number;
  };
};

type HamOzet = {
  crawl_progress?: string;
  crawl_stop_reason?: string;
  crawl_status?: { max_crawl_pages?: number; pages_in_queue?: number; pages_crawled?: number };
  domain_info?: {
    ip?: string;
    server?: string;
    cms?: string;
    total_pages?: number;
    checks?: Record<string, number>;
  };
  page_metrics?: {
    onpage_score?: number;
    links_external?: number;
    links_internal?: number;
    duplicate_title?: number;
    duplicate_description?: number;
    duplicate_content?: number;
    broken_links?: number;
    broken_resources?: number;
    redirect_loop?: number;
    non_indexable?: number;
    checks?: Record<string, number>;
  };
};

/** Tarama durumunu ve site geneli metrikleri okur. */
export async function taramaOzeti(gorevId: string): Promise<TaramaOzeti> {
  let veri: HamOzet | null = null;

  try {
    veri = await dfsTekSonuc<HamOzet>(`/on_page/summary/${gorevId}`, undefined, "GET");
  } catch (hata) {
    /*
     * Görev henüz kuyrukta ya da işleniyorsa sağlayıcı 406xx döndürür.
     * Bu bir arıza değil; "daha bitmedi" demektir. Hata olarak yukarı
     * taşınırsa iş, tarama daha başlamadan başarısız işaretlenir.
     */
    if (hata instanceof DataForSeoHatasi && hata.hazirDegil) {
      return {
        tamamlandi: false,
        ilerleme: 0,
        taranan_sayfa: 0,
        toplam_sayfa: 0,
        sinira_takildi: false,
        onpage_skoru: null,
        kontroller: {},
        sunucu: { ip: null, sunucu: null, cms: null },
        sayfa_metrikleri: {
          kirik_link: 0,
          kirik_kaynak: 0,
          duplicate_title: 0,
          duplicate_description: 0,
          duplicate_content: 0,
          ic_link: 0,
          dis_link: 0,
          yonlendirme: 0,
          indekslenemez: 0,
        },
      };
    }
    throw hata;
  }

  const taranan = veri?.crawl_status?.pages_crawled ?? 0;
  const kuyrukta = veri?.crawl_status?.pages_in_queue ?? 0;
  const toplam = taranan + kuyrukta || veri?.crawl_status?.max_crawl_pages || 1;
  const tamamlandi = veri?.crawl_progress === "finished";
  const siniraTakildi = veri?.crawl_stop_reason === "limit_exceeded";

  return {
    tamamlandi,
    ilerleme: tamamlandi ? 100 : Math.min(99, Math.round((taranan / toplam) * 100)),
    taranan_sayfa: taranan,
    toplam_sayfa: toplam,
    sinira_takildi: siniraTakildi,
    onpage_skoru: veri?.page_metrics?.onpage_score ?? null,
    kontroller: { ...(veri?.domain_info?.checks ?? {}), ...(veri?.page_metrics?.checks ?? {}) },
    sunucu: {
      ip: veri?.domain_info?.ip ?? null,
      sunucu: veri?.domain_info?.server ?? null,
      cms: veri?.domain_info?.cms ?? null,
    },
    sayfa_metrikleri: {
      kirik_link: veri?.page_metrics?.broken_links ?? 0,
      kirik_kaynak: veri?.page_metrics?.broken_resources ?? 0,
      duplicate_title: veri?.page_metrics?.duplicate_title ?? 0,
      duplicate_description: veri?.page_metrics?.duplicate_description ?? 0,
      duplicate_content: veri?.page_metrics?.duplicate_content ?? 0,
      ic_link: veri?.page_metrics?.links_internal ?? 0,
      dis_link: veri?.page_metrics?.links_external ?? 0,
      yonlendirme: veri?.page_metrics?.redirect_loop ?? 0,
      indekslenemez: veri?.page_metrics?.non_indexable ?? 0,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sayfalar                                                            */
/* ------------------------------------------------------------------ */

export type TaranmisSayfa = {
  url: string;
  durum_kodu: number | null;
  title: string | null;
  title_uzunluk: number | null;
  aciklama: string | null;
  aciklama_uzunluk: number | null;
  h1: string | null;
  h1_sayisi: number;
  h2_sayisi: number;
  kelime_sayisi: number | null;
  ic_link: number | null;
  dis_link: number | null;
  gorsel_sayisi: number | null;
  alt_metinsiz_gorsel: number;
  canonical: string | null;
  indekslenebilir: boolean | null;
  tiklama_derinligi: number | null;
  yetim_mi: boolean;
  schema_var_mi: boolean;
  schema_turleri: string[];
  yuklenme_ms: number | null;
  onpage_skoru: number | null;
  kontroller: Record<string, boolean>;
};

type HamSayfa = {
  url?: string;
  status_code?: number;
  location?: string;
  meta?: {
    title?: string;
    description?: string;
    canonical?: string;
    htags?: Record<string, string[]>;
    internal_links_count?: number;
    external_links_count?: number;
    images_count?: number;
    content?: { plain_text_word_count?: number };
    social_media_tags?: Record<string, string>;
  };
  page_timing?: { dom_complete?: number; duration_time?: number };
  onpage_score?: number;
  total_dom_size?: number;
  click_depth?: number;
  checks?: Record<string, boolean>;
  resource_errors?: unknown;
  broken_resources?: boolean;
};

function sayfaCevir(s: HamSayfa): TaranmisSayfa | null {
  if (!s.url) return null;

  const h1ler = s.meta?.htags?.h1 ?? [];
  const h2ler = s.meta?.htags?.h2 ?? [];
  const kontroller = s.checks ?? {};

  const schemaVar = kontroller.no_microdata === false;

  return {
    url: s.url,
    durum_kodu: s.status_code ?? null,
    title: s.meta?.title ?? null,
    title_uzunluk: s.meta?.title?.length ?? null,
    aciklama: s.meta?.description ?? null,
    aciklama_uzunluk: s.meta?.description?.length ?? null,
    h1: h1ler[0] ?? null,
    h1_sayisi: h1ler.length,
    h2_sayisi: h2ler.length,
    kelime_sayisi: s.meta?.content?.plain_text_word_count ?? null,
    ic_link: s.meta?.internal_links_count ?? null,
    dis_link: s.meta?.external_links_count ?? null,
    gorsel_sayisi: s.meta?.images_count ?? null,
    alt_metinsiz_gorsel: kontroller.no_image_alt ? 1 : 0,
    canonical: s.meta?.canonical ?? null,
    indekslenebilir: kontroller.is_indexable ?? (kontroller.no_index === true ? false : null),
    tiklama_derinligi: s.click_depth ?? null,
    yetim_mi: kontroller.is_orphan_page ?? false,
    schema_var_mi: schemaVar,
    schema_turleri: [],
    yuklenme_ms: s.page_timing?.duration_time ?? s.page_timing?.dom_complete ?? null,
    onpage_skoru: s.onpage_score ?? null,
    kontroller,
  };
}

/** Taranan sayfaları sayfalı olarak okur. */
export async function taramaSayfalari({
  gorevId,
  limit = 100,
  offset = 0,
}: {
  gorevId: string;
  limit?: number;
  offset?: number;
}): Promise<{ sayfalar: TaranmisSayfa[]; toplam: number }> {
  const gövde = [{ id: gorevId, limit, offset, order_by: ["click_depth,asc"] }];

  const veri = await yenidenDene(() =>
    dfsTekSonuc<{ total_items_count?: number; items?: HamSayfa[] }>("/on_page/pages", gövde),
  );

  return {
    sayfalar: (veri?.items ?? []).map(sayfaCevir).filter((s): s is TaranmisSayfa => s !== null),
    toplam: veri?.total_items_count ?? 0,
  };
}

/**
 * Tek bir sayfanın anlık analizi — tarama beklemeden.
 * Ücretli bir uç nokta olduğu için önbelleklenir; aynı adresi birden çok
 * kullanıcı veya modül sorguladığında tekrar ödenmez.
 */
export async function tekSayfaAnalizi(
  url: string,
  tazelik?: Tazelik,
): Promise<TaranmisSayfa | null> {
  const gövde = [
    {
      url,
      enable_javascript: false,
      load_resources: false,
      validate_micromarkup: true,
    },
  ];

  const { veri } = await onbellekli(
    { endpoint: "/on_page/instant_pages", parametreler: { url, mikro: true }, grup: "onpage", tazelik },
    async () =>
      yenidenDene(() => dfsTekSonuc<{ items?: HamSayfa[] }>("/on_page/instant_pages", gövde)),
  );

  const ilk = veri?.items?.[0];
  return ilk ? sayfaCevir(ilk) : null;
}

/**
 * Sayfaları JavaScript çalıştırarak yeniden ölçer.
 *
 * Tarama JavaScript'siz yapılır; içeriğini tarayıcıda üreten sitelerde bu
 * yöntem başlıkları göremez. Burada yalnızca önemli sayfalar, tarayıcı
 * çalıştırılarak yeniden okunur — sayfa başına on iki kat pahalı olduğu
 * için sayı çağıran tarafça sınırlanır.
 */
export async function jsIleOlc(urller: string[]): Promise<Map<string, TaranmisSayfa>> {
  const sonuc = new Map<string, TaranmisSayfa>();
  if (!urller.length) return sonuc;

  // Sağlayıcı tek istekte birden çok görev kabul eder; parça parça gönderilir.
  const PARCA = 25;
  for (let i = 0; i < urller.length; i += PARCA) {
    const dilim = urller.slice(i, i + PARCA);
    const gövde = dilim.map((url) => ({
      url,
      enable_javascript: true,
      load_resources: true,
      validate_micromarkup: false,
    }));

    try {
      const yanit = await dfsIstek<{ items?: HamSayfa[] }>(
        "/on_page/instant_pages",
        gövde,
      );

      for (const gorev of yanit?.tasks ?? []) {
        const ham = gorev.result?.[0]?.items?.[0];
        const sayfa = ham ? sayfaCevir(ham) : null;
        if (sayfa) sonuc.set(sayfa.url, sayfa);
      }
    } catch (hata) {
      // Ölçüm başarısız olursa ucuz taramadan gelen veri korunur.
      console.error("[onpage] JavaScript ile ölçüm başarısız", {
        adet: dilim.length,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  return sonuc;
}

/** Sayfadaki yapısal işaretlemeyi (schema) okur. */
export async function sayfaSchemalari(gorevId: string, url: string): Promise<string[]> {
  try {
    const gövde = [{ id: gorevId, url }];
    const veri = await dfsTekSonuc<{ items?: { microdata?: { type?: string }[] }[] }>(
      "/on_page/microdata",
      gövde,
    );
    const turler = (veri?.items ?? []).flatMap((i) => (i.microdata ?? []).map((m) => m.type).filter(Boolean));
    return [...new Set(turler as string[])];
  } catch {
    return [];
  }
}

type HamBaglanti = {
  link_from?: string;
  link_to?: string;
  page_from?: string;
  page_to?: string;
  text?: string;
  dofollow?: boolean;
};

/* ------------------------------------------------------------------ */
/* İç bağlantı grafiği                                                 */
/* ------------------------------------------------------------------ */

export type IcBaglanti = {
  kaynak: string;
  hedef: string;
  anchor: string | null;
  dofollow: boolean;
};

/**
 * Sitenin iç bağlantı grafiğini çeker: hangi sayfa hangisine bağlantı
 * veriyor ve hangi metinle.
 *
 * Bu veri olmadan bağlantı önerisi üretilemez; zaten var olan bağlantılar
 * önerilir. Uç nokta ücretsizdir (tamamlanmış tarama görevinin üzerinden
 * okunur), bu yüzden ek maliyet doğurmaz.
 */
export async function icBaglantiGrafigi({
  gorevId,
  azamiBaglanti = 20000,
}: {
  gorevId: string;
  azamiBaglanti?: number;
}): Promise<IcBaglanti[]> {
  const SAYFA = 1000;
  const toplananlar: IcBaglanti[] = [];

  for (let offset = 0; offset < azamiBaglanti; offset += SAYFA) {
    const gövde = [
      {
        id: gorevId,
        limit: SAYFA,
        offset,
        // Yalnızca site içi metin bağlantıları. Görsel ve canonical
        // bağlantıları öneri üretiminde gürültü yaratır.
        filters: [["type", "=", "anchor"], "and", ["direction", "=", "internal"]],
      },
    ];

    let veri: { total_items_count?: number; items?: HamBaglanti[] } | null = null;
    try {
      veri = await yenidenDene(() =>
        dfsTekSonuc<{ total_items_count?: number; items?: HamBaglanti[] }>(
          "/on_page/links",
          gövde,
        ),
      );
    } catch (hata) {
      // Grafik olmadan da tarama değerlidir; öneri üretimi devre dışı kalır.
      console.error("[onpage] bağlantı grafiği okunamadı", {
        gorevId,
        offset,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
      break;
    }

    const ogeler = veri?.items ?? [];
    for (const o of ogeler) {
      const kaynak = o.link_from ?? o.page_from;
      const hedef = o.link_to ?? o.page_to;
      if (!kaynak || !hedef || kaynak === hedef) continue;

      toplananlar.push({
        kaynak,
        hedef,
        anchor: (o.text ?? "").trim() || null,
        dofollow: o.dofollow !== false,
      });
    }

    const toplam = veri?.total_items_count ?? 0;
    if (ogeler.length < SAYFA || offset + SAYFA >= toplam) break;
  }

  return toplananlar;
}

/** Kırık bağlantılar. */
export async function kirikBaglantilar(gorevId: string, limit = 100) {
  const gövde = [{ id: gorevId, limit, filters: [["link_to_status_code", ">=", 400]] }];

  const veri = await dfsTekSonuc<{
    items?: { page_from?: string; link_to?: string; link_to_status_code?: number; text?: string }[];
  }>("/on_page/links", gövde);

  return (veri?.items ?? []).map((i) => ({
    kaynak: i.page_from ?? null,
    hedef: i.link_to ?? null,
    durum: i.link_to_status_code ?? null,
    metin: i.text ?? null,
  }));
}

/** Yinelenen başlık ve açıklamalar. */
export async function yinelenenEtiketler(gorevId: string, tur: "title" | "description", limit = 50) {
  const gövde = [{ id: gorevId, limit, accumulator: tur }];

  const veri = await dfsTekSonuc<{
    items?: { pages?: { url?: string; meta?: { title?: string; description?: string } }[] }[];
  }>("/on_page/duplicate_tags", gövde);

  return (veri?.items ?? []).map((grup) => ({
    sayfalar: (grup.pages ?? []).map((p) => p.url).filter(Boolean) as string[],
    deger: grup.pages?.[0]?.meta?.[tur] ?? null,
  }));
}

/* ------------------------------------------------------------------ */
/* İçerik özeti — rakip sayfa analizi için                             */
/* ------------------------------------------------------------------ */

export type SayfaIcerikOzeti = {
  url: string;
  alan_adi: string;
  title: string | null;
  h1: string | null;
  basliklar: string[];
  kelime_sayisi: number | null;
  gorsel_sayisi: number | null;
  ic_link: number | null;
  schema_var_mi: boolean;
};

/**
 * Tek bir sayfanın içerik yapısını çıkarır: başlıklar, kelime sayısı, görseller.
 * İçerik analizi rakip sayfaları için tekrar tekrar çağırdığından önbelleklenir.
 */
export async function sayfaIcerikOzeti(
  url: string,
  tazelik?: Tazelik,
): Promise<SayfaIcerikOzeti | null> {
  const gövde = [{ url, enable_javascript: false, load_resources: false }];

  const { veri } = await onbellekli(
    { endpoint: "/on_page/instant_pages", parametreler: { url }, grup: "onpage", tazelik },
    async () =>
      yenidenDene(() => dfsTekSonuc<{ items?: HamSayfa[] }>("/on_page/instant_pages", gövde)),
  );

  const s = veri?.items?.[0];
  if (!s?.url) return null;

  const htags = s.meta?.htags ?? {};
  const basliklar = [...(htags.h2 ?? []), ...(htags.h3 ?? [])]
    .map((h) => (h ?? "").trim())
    .filter((h) => h.length > 2 && h.length < 160);

  let alanAdi = "";
  try {
    alanAdi = new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    alanAdi = "";
  }

  return {
    url: s.url,
    alan_adi: alanAdi,
    title: s.meta?.title ?? null,
    h1: (htags.h1 ?? [])[0] ?? null,
    basliklar,
    kelime_sayisi: s.meta?.content?.plain_text_word_count ?? null,
    gorsel_sayisi: s.meta?.images_count ?? null,
    ic_link: s.meta?.internal_links_count ?? null,
    schema_var_mi: s.checks?.no_microdata === false,
  };
}
