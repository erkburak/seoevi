import "server-only";

import {
  agirliklariHesapla,
  anchorOner,
  baslikCekirdegi,
  hedefIhtiyaci,
  kaynakGucu,
  konuYakinligi,
  oneriPuani,
  sozcukler,
  type SayfaTuru,
} from "@/lib/analiz/ic-baglanti-cekirdek";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * İç bağlantı zekâsı.
 *
 * İç bağlantı SEO'da en çok bilinen, en az uygulanan iştir: bedava,
 * tamamen kendi kontrolünüzde ve etkisi hızlı görülür. Zor olan kısım
 * sorunu görmek değil, binlerce sayfa arasında NEREDEN NEREYE bağlantı
 * verileceğine karar vermektir.
 *
 * Bu modül üç soruyu birlikte cevaplar:
 *   1. Hangi sayfanın iç otoriteye ihtiyacı var? (ikinci sayfada takılanlar)
 *   2. Hangi sayfalar ona bağlantı verebilir? (aynı konuda olan, hâlihazırda
 *      bağlantı vermeyen, kendisi otorite taşıyan sayfalar)
 *   3. Bağlantı metni ne olmalı? (hedefin kelimesinden, doğal Türkçe ile)
 *
 * Ek sağlayıcı maliyeti yoktur: bağlantı grafiği tarama görevinin üzerinden
 * ücretsiz okunur, geri kalan hesap kendi verimizden yapılır.
 */

/* ------------------------------------------------------------------ */
/* Sınırlar                                                            */
/* ------------------------------------------------------------------ */

/**
 * Bir hedefe önerilecek azami yeni bağlantı.
 *
 * Tek sayfaya kısa sürede onlarca bağlantı eklemek doğal büyümeye
 * benzemez ve fayda yerine risk üretir.
 */
const HEDEF_BASINA_AZAMI = 8;

/** Bir kaynak sayfaya eklenmesi önerilecek azami yeni bağlantı. */
const KAYNAK_BASINA_AZAMI = 3;

/**
 * Asgari konu yakınlığı.
 *
 * Alakasız sayfadan verilen bağlantı ne kullanıcıya ne arama motoruna
 * bir şey söyler; eşiğin altındakiler hiç önerilmez.
 *
 * Değerin tam 0,5 olması kasıtlıdır: konu yakınlığının yarısı ana sözcük
 * eşleşmesinden geldiği için bu eşik "kaynak sayfa hedefle aynı ürün
 * ailesinde olmalı" kuralını uygular.
 */
const ASGARI_ALAKA = 0.5;

/** Bir turda ele alınacak azami hedef sayfa. */
const AZAMI_HEDEF = 60;

/* ------------------------------------------------------------------ */
/* Adres normalleştirme                                                */
/* ------------------------------------------------------------------ */

/**
 * Aynı sayfanın farklı yazımlarını tek biçime indirger.
 *
 * Bağlantı grafiği ile sayfa listesi farklı kaynaklardan geldiği için
 * "/kategori" ile "/kategori/" eşleşmezse sayfa öksüz sanılır.
 */
export function urlNormalle(url: string): string {
  const temiz = url.trim().split("#")[0];
  if (!temiz) return "";
  return temiz.length > 1 && temiz.endsWith("/") ? temiz.slice(0, -1) : temiz;
}

/**
 * Yinelenen adresleri asıl adrese indirger.
 *
 * E-ticaret yazılımları aynı sayfayı birden çok adresle sunar
 * ("?is_link=1", "?route=..."). Sayfa kendi canonical etiketinde asıl
 * adresini bildirir; bu bildirim dikkate alınmazsa aynı sayfa birden çok
 * kez öksüz sayılır ve kopyalar arasında anlamsız bağlantı önerilir.
 *
 * Yalnızca sitede gerçekten var olan bir adrese işaret eden canonical
 * kabul edilir; site dışına veya taranmamış bir adrese işaret eden
 * etiket yok sayılır.
 */
function kanonikCozucu(
  sayfalar: { url: string; canonical_url?: string | null }[],
): (url: string) => string {
  const bilinen = new Set(sayfalar.map((s) => urlNormalle(s.url)));
  const harita = new Map<string, string>();

  for (const s of sayfalar) {
    const url = urlNormalle(s.url);
    const kanonik = s.canonical_url ? urlNormalle(s.canonical_url) : "";
    if (kanonik && kanonik !== url && bilinen.has(kanonik)) {
      harita.set(url, kanonik);
    }
  }

  return (url: string) => {
    const n = urlNormalle(url);
    // Tek adım yeter: canonical zinciri beklenmez, döngü riski doğurmaz.
    return harita.get(n) ?? n;
  };
}

/* ------------------------------------------------------------------ */
/* Grafiğin kaydı                                                      */
/* ------------------------------------------------------------------ */

export type HamBaglantiKaydi = {
  kaynak: string;
  hedef: string;
  anchor: string | null;
  dofollow: boolean;
};

/**
 * Taramadan gelen bağlantı grafiğini saklar.
 *
 * Aynı sayfa çifti arasında birden çok bağlantı olabilir (menü + gövde);
 * çift bazında tekilleştirilip sayısı tutulur.
 */
export async function baglantiGrafiginiKaydet(
  projeId: string,
  baglantilar: HamBaglantiKaydi[],
): Promise<number> {
  const supabase = yoneticiIstemcisi();

  const birlesik = new Map<
    string,
    { kaynak: string; hedef: string; anchor: string | null; sayi: number; dofollow: boolean }
  >();

  for (const b of baglantilar) {
    const kaynak = urlNormalle(b.kaynak);
    const hedef = urlNormalle(b.hedef);
    if (!kaynak || !hedef || kaynak === hedef) continue;

    const anahtar = `${kaynak}\n${hedef}`;
    const mevcut = birlesik.get(anahtar);
    if (mevcut) {
      mevcut.sayi += 1;
      // Boş menü bağlantısı yerine metinli olanı örnek al.
      if (!mevcut.anchor && b.anchor) mevcut.anchor = b.anchor;
      if (b.dofollow) mevcut.dofollow = true;
    } else {
      birlesik.set(anahtar, {
        kaynak,
        hedef,
        anchor: b.anchor,
        sayi: 1,
        dofollow: b.dofollow,
      });
    }
  }

  if (!birlesik.size) return 0;

  // Tarama her seferinde grafiğin tamamını verir; eski kayıtlar silinmezse
  // kaldırılmış bağlantılar sonsuza kadar var sanılır.
  await supabase.from("internal_links").delete().eq("project_id", projeId);

  const satirlar = [...birlesik.values()].map((b) => ({
    project_id: projeId,
    kaynak_url: b.kaynak,
    hedef_url: b.hedef,
    anchor: b.anchor,
    link_sayisi: b.sayi,
    dofollow: b.dofollow,
  }));

  for (let i = 0; i < satirlar.length; i += 500) {
    const { error } = await supabase.from("internal_links").insert(satirlar.slice(i, i + 500));
    if (error) {
      console.error("[ic-baglanti] grafik yazılamadı", { mesaj: error.message });
      break;
    }
  }

  return satirlar.length;
}

/* ------------------------------------------------------------------ */
/* Öneri üretimi                                                       */
/* ------------------------------------------------------------------ */

type SayfaKaydi = {
  url: string;
  canonical_url: string | null;
  path: string | null;
  page_type: string | null;
  title: string | null;
  h1: string | null;
  word_count: number | null;
  internal_links_count: number | null;
};

type HedefAdayi = {
  url: string;
  baslik: string | null;
  tur: SayfaTuru;
  keyword: string | null;
  hacim: number | null;
  pozisyon: number | null;
  gelenLink: number;
  ihtiyac: number;
};

export type UretimSonucu = {
  hedefSayisi: number;
  oneriSayisi: number;
};

/**
 * Bağlantı önerilerini üretir ve saklar.
 *
 * Kullanıcının daha önce "uyguladım" veya "yoksay" dediği çiftler yeniden
 * önerilmez; verilen karar her turda geri gelirse liste güvenilirliğini
 * kaybeder.
 */
export async function oneriUret(projeId: string): Promise<UretimSonucu> {
  const supabase = yoneticiIstemcisi();

  const [{ data: sayfaVerisi }, { data: linkVerisi }, { data: kelimeVerisi }, { data: kararlar }] =
    await Promise.all([
      supabase
        .from("pages")
        .select("url, path, page_type, title, h1, word_count, internal_links_count, canonical_url")
        .eq("project_id", projeId)
        .limit(5000),
      supabase
        .from("internal_links")
        .select("kaynak_url, hedef_url")
        .eq("project_id", projeId)
        .limit(50000),
      supabase
        .from("kelime_ozet")
        .select("keyword, search_volume, position, url")
        .eq("project_id", projeId)
        .not("url", "is", null)
        .limit(2000),
      supabase
        .from("link_suggestions")
        .select("kaynak_url, hedef_url")
        .eq("project_id", projeId)
        .neq("durum", "yeni"),
    ]);

  const sayfalar = (sayfaVerisi ?? []) as SayfaKaydi[];
  if (sayfalar.length < 2) return { hedefSayisi: 0, oneriSayisi: 0 };

  /*
   * Grafik yoksa hangi bağlantının hâlihazırda var olduğu bilinemez ve
   * öneri üretmek, mevcut bağlantıları yeniden önermek anlamına gelir.
   * Bu yüzden tarama yapılmadan öneri üretilmez.
   */
  if (!linkVerisi?.length) return { hedefSayisi: 0, oneriSayisi: 0 };

  const coz = kanonikCozucu(sayfalar);

  /* --- Bağlantı grafiği --- */
  const gelen = new Map<string, number>();
  const giden = new Map<string, number>();
  const mevcutCift = new Set<string>();

  for (const l of linkVerisi ?? []) {
    const k = coz(l.kaynak_url);
    const h = coz(l.hedef_url);
    // Yinelenen adresler asıl adrese indiğinde kendine bağlantıya dönüşür.
    if (k === h) continue;
    gelen.set(h, (gelen.get(h) ?? 0) + 1);
    giden.set(k, (giden.get(k) ?? 0) + 1);
    mevcutCift.add(`${k}\n${h}`);
  }

  /* --- Sayfa başına en değerli kelime --- */
  const enIyiKelime = new Map<string, { keyword: string; hacim: number | null; pozisyon: number | null }>();
  for (const k of kelimeVerisi ?? []) {
    if (!k.url || !k.keyword) continue;
    const url = coz(k.url);
    const hacim = k.search_volume ?? 0;
    const mevcut = enIyiKelime.get(url);
    if (!mevcut || hacim > (mevcut.hacim ?? 0)) {
      enIyiKelime.set(url, {
        keyword: k.keyword,
        hacim: k.search_volume,
        pozisyon: k.position === null || k.position === undefined ? null : Number(k.position),
      });
    }
  }

  /* --- Ayırt edicilik ağırlıkları --- */
  const metinler = new Map<string, string[]>();
  for (const s of sayfalar) {
    const url = coz(s.url);
    if (metinler.has(url)) continue;
    metinler.set(url, sozcukler([s.title, s.h1, s.path].filter(Boolean).join(" ")));
  }
  const agirlik = agirliklariHesapla([...metinler.values()]);

  /* --- Hedef adayları --- */
  const kararVerilen = new Set(
    (kararlar ?? []).map((k) => `${urlNormalle(k.kaynak_url)}\n${urlNormalle(k.hedef_url)}`),
  );

  /*
   * Açlık mutlak değil görelidir. Menüsü geniş bir sitede her sayfa
   * onlarca bağlantı alır; orada 5 bağlantılı sayfa açtır. Menüsü dar bir
   * sitede aynı sayfa gayet iyi durumdadır. Bu yüzden ölçek sitenin
   * kendi ortancasından alınır.
   */
  const gelenDagilimi = [...metinler.keys()]
    .map((url) => gelen.get(url) ?? 0)
    .sort((a, b) => a - b);
  const ortancaGelen = gelenDagilimi.length
    ? gelenDagilimi[Math.floor(gelenDagilimi.length / 2)]
    : 0;
  const aclikEsigi = Math.max(1, ortancaGelen * 0.5);

  const hedefler: HedefAdayi[] = [];
  const eklenenHedef = new Set<string>();

  for (const s of sayfalar) {
    const url = coz(s.url);
    // Yinelenen adres asıl sayfayla aynı hedefe düşer; bir kez ele alınır.
    if (eklenenHedef.has(url)) continue;
    eklenenHedef.add(url);

    const tur = (s.page_type ?? "diger") as SayfaTuru;
    // Ana sayfa zaten sitenin en çok bağlantı alan sayfasıdır.
    if (tur === "anasayfa") continue;

    const kelime = enIyiKelime.get(url) ?? null;
    const gelenSayi = gelen.get(url) ?? 0;

    /*
     * Kelime verisi olmayan sayfa da hedef olabilir: iç bağlantının
     * değeri sıralama verisine bağlı değildir. Anahtar kelime analizi
     * henüz çalışmamış bir sitede tek ölçüt, sayfanın site ortalamasına
     * göre ne kadar aç kaldığıdır.
     */
    if (!kelime && gelenSayi >= aclikEsigi) continue;

    hedefler.push({
      url,
      baslik: s.title ?? s.h1,
      tur,
      keyword: kelime?.keyword ?? null,
      hacim: kelime?.hacim ?? null,
      pozisyon: kelime?.pozisyon ?? null,
      gelenLink: gelenSayi,
      ihtiyac: hedefIhtiyaci({
        hacim: kelime?.hacim ?? null,
        pozisyon: kelime?.pozisyon ?? null,
        gelenLink: gelenSayi,
        referansLink: ortancaGelen,
      }),
    });
  }

  hedefler.sort((a, b) => b.ihtiyac - a.ihtiyac);
  const secilenHedefler = hedefler.slice(0, AZAMI_HEDEF);

  /* --- Kaynak eşleştirme --- */
  const kaynakYuku = new Map<string, number>();
  const oneriler: {
    project_id: string;
    kaynak_url: string;
    hedef_url: string;
    keyword: string | null;
    anchor_metni: string;
    skor: number;
    gerekce: string;
    hedef_pozisyon: number | null;
    hedef_hacim: number | null;
  }[] = [];

  for (const hedef of secilenHedefler) {
    const hedefSozcukler = sozcukler(
      hedef.keyword ?? baslikCekirdegi(hedef.baslik) ?? hedef.url,
    );
    if (!hedefSozcukler.length) continue;

    const adaylar: { sayfa: SayfaKaydi; url: string; alaka: number; skor: number; guc: number }[] = [];

    const elenenKaynak = new Set<string>();
    for (const s of sayfalar) {
      const kaynakUrl = coz(s.url);
      if (kaynakUrl === hedef.url) continue;
      if (elenenKaynak.has(kaynakUrl)) continue;
      elenenKaynak.add(kaynakUrl);
      if (mevcutCift.has(`${kaynakUrl}\n${hedef.url}`)) continue;
      if (kararVerilen.has(`${kaynakUrl}\n${hedef.url}`)) continue;
      if ((kaynakYuku.get(kaynakUrl) ?? 0) >= KAYNAK_BASINA_AZAMI) continue;

      const alaka = konuYakinligi(hedefSozcukler, metinler.get(kaynakUrl) ?? [], agirlik);
      if (alaka < ASGARI_ALAKA) continue;

      const guc = kaynakGucu({
        gelenLink: gelen.get(kaynakUrl) ?? 0,
        gidenLink: giden.get(kaynakUrl) ?? s.internal_links_count ?? 0,
        kelimeSayisi: s.word_count,
      });

      adaylar.push({
        sayfa: s,
        url: kaynakUrl,
        alaka,
        guc,
        skor: oneriPuani({ ihtiyac: hedef.ihtiyac, alaka, guc }),
      });
    }

    adaylar.sort((a, b) => b.skor - a.skor);

    adaylar.slice(0, HEDEF_BASINA_AZAMI).forEach((aday, sira) => {
      kaynakYuku.set(aday.url, (kaynakYuku.get(aday.url) ?? 0) + 1);

      oneriler.push({
        project_id: projeId,
        kaynak_url: aday.url,
        hedef_url: hedef.url,
        keyword: hedef.keyword,
        anchor_metni: anchorOner({
          // Kelime verisi yoksa metin başlıktan üretilir; ham başlık
          // kampanya ve marka eki taşıdığı için önce ayıklanır.
          keyword: hedef.keyword ?? baslikCekirdegi(hedef.baslik),
          sayfaTuru: hedef.tur,
          sira,
        }),
        skor: aday.skor,
        gerekce: gerekceYaz({ hedef, alaka: aday.alaka, kaynakGelen: gelen.get(aday.url) ?? 0 }),
        hedef_pozisyon: hedef.pozisyon,
        hedef_hacim: hedef.hacim,
      });
    });
  }

  /* --- Kayıt --- */
  await supabase.from("link_suggestions").delete().eq("project_id", projeId).eq("durum", "yeni");

  for (let i = 0; i < oneriler.length; i += 500) {
    const { error } = await supabase
      .from("link_suggestions")
      .upsert(oneriler.slice(i, i + 500), { onConflict: "project_id,kaynak_url,hedef_url" });
    if (error) {
      console.error("[ic-baglanti] öneri yazılamadı", { mesaj: error.message });
      break;
    }
  }

  return { hedefSayisi: secilenHedefler.length, oneriSayisi: oneriler.length };
}

/** Öneriyi kullanıcıya tek cümlede gerekçelendirir. */
function gerekceYaz({
  hedef,
  alaka,
  kaynakGelen,
}: {
  hedef: HedefAdayi;
  alaka: number;
  kaynakGelen: number;
}): string {
  const parcalar: string[] = [];

  if (hedef.pozisyon !== null && hedef.pozisyon > 10 && hedef.pozisyon <= 30) {
    parcalar.push(`Hedef ${Math.round(hedef.pozisyon)}. sırada — ilk sayfaya bir adım uzakta`);
  } else if (hedef.pozisyon !== null && hedef.pozisyon <= 10) {
    parcalar.push(`Hedef ${Math.round(hedef.pozisyon)}. sırada, yukarı taşınabilir`);
  } else if (hedef.gelenLink === 0) {
    parcalar.push("Hedef sayfa hiç iç bağlantı almıyor");
  } else {
    parcalar.push("Hedef sayfa yeterince iç bağlantı almıyor");
  }

  parcalar.push(
    hedef.gelenLink === 0
      ? "şu an sıfır bağlantısı var"
      : `şu an ${hedef.gelenLink} bağlantı alıyor`,
  );

  parcalar.push(
    alaka >= 0.75 ? "kaynak sayfa aynı konuda" : "kaynak sayfa konu olarak yakın",
  );

  if (kaynakGelen >= 5) parcalar.push(`ve kendisi ${kaynakGelen} bağlantı alıyor`);

  return `${parcalar.join(", ")}.`;
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export type BaglantiOnerisi = {
  id: string;
  kaynakUrl: string;
  kaynakBaslik: string | null;
  anchorMetni: string;
  skor: number;
  gerekce: string | null;
  durum: "yeni" | "uygulandi" | "yoksayildi";
};

export type HedefGrubu = {
  hedefUrl: string;
  hedefBaslik: string | null;
  keyword: string | null;
  hacim: number | null;
  pozisyon: number | null;
  mevcutGelenLink: number;
  oneriler: BaglantiOnerisi[];
};

export type IcBaglantiOzeti = {
  /** Tarama yapılmadıysa grafik yoktur ve öneri üretilemez. */
  grafikVarMi: boolean;
  incelenenSayfa: number;
  toplamBaglanti: number;
  oksuzSayfa: number;
  ortalamaGelenLink: number;
  bekleyenOneri: number;
  uygulananOneri: number;
  gruplar: HedefGrubu[];
};

export async function icBaglantiOzeti(projeId: string): Promise<IcBaglantiOzeti> {
  const supabase = yoneticiIstemcisi();

  const [{ data: sayfaVerisi }, { data: linkVerisi }, { data: oneriVerisi }] = await Promise.all([
    supabase
      .from("pages")
      .select("url, title, h1, canonical_url")
      .eq("project_id", projeId)
      .limit(5000),
    supabase
      .from("internal_links")
      .select("kaynak_url, hedef_url")
      .eq("project_id", projeId)
      .limit(50000),
    supabase
      .from("link_suggestions")
      .select("*")
      .eq("project_id", projeId)
      .order("skor", { ascending: false })
      .limit(500),
  ]);

  const sayfalar = sayfaVerisi ?? [];
  const linkler = linkVerisi ?? [];
  const oneriKayitlari = oneriVerisi ?? [];

  // Yinelenen adresler asıl sayfada toplanır; aksi hâlde aynı sayfa
  // birden çok kez sayılır ve öksüz sayısı gerçekte olduğundan yüksek
  // görünür.
  const coz = kanonikCozucu(sayfalar);
  const asilSayfalar = new Map<string, string | null>();
  for (const s of sayfalar) {
    const url = coz(s.url);
    if (!asilSayfalar.has(url)) asilSayfalar.set(url, s.title ?? s.h1);
  }
  const basliklar = asilSayfalar;

  const gelen = new Map<string, number>();
  for (const l of linkler) {
    const k = coz(l.kaynak_url);
    const h = coz(l.hedef_url);
    if (k === h) continue;
    gelen.set(h, (gelen.get(h) ?? 0) + 1);
  }

  const oksuz = [...asilSayfalar.keys()].filter((url) => !gelen.has(url)).length;
  const ortalama = asilSayfalar.size ? linkler.length / asilSayfalar.size : 0;

  /* --- Hedefe göre gruplama --- */
  const gruplar = new Map<string, HedefGrubu>();

  for (const o of oneriKayitlari) {
    if (o.durum === "yoksayildi") continue;
    const hedefUrl = coz(o.hedef_url);

    let grup = gruplar.get(hedefUrl);
    if (!grup) {
      grup = {
        hedefUrl,
        hedefBaslik: basliklar.get(hedefUrl) ?? null,
        keyword: o.keyword,
        hacim: o.hedef_hacim,
        pozisyon: o.hedef_pozisyon === null ? null : Number(o.hedef_pozisyon),
        mevcutGelenLink: gelen.get(hedefUrl) ?? 0,
        oneriler: [],
      };
      gruplar.set(hedefUrl, grup);
    }

    const kaynakUrl = coz(o.kaynak_url);
    grup.oneriler.push({
      id: o.id,
      kaynakUrl,
      kaynakBaslik: basliklar.get(kaynakUrl) ?? null,
      anchorMetni: o.anchor_metni,
      skor: o.skor,
      gerekce: o.gerekce,
      durum: o.durum,
    });
  }

  const sirali = [...gruplar.values()].sort((a, b) => {
    const enIyi = (g: HedefGrubu) => Math.max(...g.oneriler.map((o) => o.skor), 0);
    return enIyi(b) - enIyi(a);
  });

  return {
    grafikVarMi: linkler.length > 0,
    incelenenSayfa: asilSayfalar.size,
    toplamBaglanti: linkler.length,
    oksuzSayfa: oksuz,
    ortalamaGelenLink: Math.round(ortalama * 10) / 10,
    bekleyenOneri: oneriKayitlari.filter((o) => o.durum === "yeni").length,
    uygulananOneri: oneriKayitlari.filter((o) => o.durum === "uygulandi").length,
    gruplar: sirali,
  };
}
