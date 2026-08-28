import "server-only";

import { sayfaIcerikOzeti, type SayfaIcerikOzeti } from "@/lib/dataforseo/onpage";
import type { Tazelik } from "@/lib/dataforseo/cache";
import { serpGetir } from "@/lib/dataforseo/serp";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { alanAdiCikar } from "@/lib/utils";
import type { AramaAmaci, Proje } from "@/types/database";

/**
 * İçerik analizi.
 *
 * Bir anahtar kelimenin arama sonuçlarındaki güçlü sayfaları inceler;
 * ortak konuları, başlık yapısını, soruları ve içerik boşluklarını çıkarır.
 * Amaç rapor üretmek değil, "bu sayfayı nasıl yazmalıyım" sorusuna cevap vermek.
 */

/** İncelenecek rakip sayfa sayısı — maliyet ve derinlik dengesi. */
const INCELENEN_SAYFA = 6;

/** Türkçe ve İngilizce durak kelimeler; konu çıkarımında elenir. */
const DURAK_KELIMELER = new Set([
  "ve", "ile", "için", "bir", "bu", "da", "de", "ki", "mi", "mı", "mu", "mü",
  "en", "çok", "daha", "gibi", "olan", "olarak", "ama", "veya", "her", "ne",
  "nasıl", "nedir", "hangi", "kaç", "var", "yok", "the", "and", "for", "with",
  "you", "your", "are", "how", "what", "why", "can", "all", "new", "top",
  "içinde", "üzerine", "kadar", "sonra", "önce", "şu", "o", "biz", "siz",
  "olur", "olabilir", "yapılır", "edilir", "tüm", "diğer", "ayrıca", "ise",
]);

function kelimeler(metin: string): string[] {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 3 && k.length <= 28 && !DURAK_KELIMELER.has(k) && !/^\d+$/.test(k));
}

/** Aynı başlığın küçük varyasyonlarını tek sayar. */
/**
 * Kendini tekrar eden başlıkları sadeleştirir.
 *
 * Bazı temalarda aynı metin hem görünen hem ekran okuyucu etiketinde
 * bulunur ve ayrıştırıcı bunları yan yana getirir: "DESTEK DESTEK".
 */
export function tekrariSadelestir(metin: string): string {
  const temiz = metin.trim().replace(/\s+/g, " ");
  const yari = Math.floor(temiz.length / 2);
  const ilk = temiz.slice(0, yari).trim();
  const son = temiz.slice(yari).trim();
  return ilk.length > 2 && ilk.toLocaleLowerCase("tr") === son.toLocaleLowerCase("tr")
    ? ilk
    : temiz;
}

function normalizeBaslik(baslik: string): string {
  return baslik.toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

export type IcerikAnaliziSonucu = {
  analizId: string | null;
  keyword: string;
  aramaAmaci: AramaAmaci | null;
  ortalamaKelime: number | null;
  bizimKelimeSayisi: number | null;
  bizimUrl: string | null;
  bizimPozisyon: number | null;
  ortakKonular: { konu: string; kapsam: number }[];
  basliklar: string[];
  sorular: string[];
  semantikTerimler: { terim: string; siklik: number }[];
  rakipSayfalar: { url: string; alan_adi: string; kelime_sayisi: number | null; pozisyon: number | null }[];
  bosluklar: string[];
  incelenenSayfa: number;
};

/**
 * Bir anahtar kelime için içerik analizi yapar ve sonucu kaydeder.
 * Sonuç içerik fırsatı olarak da saklanır; Aksiyon Merkezi bunu kullanır.
 */
export async function icerikAnaliziYap({
  proje,
  keyword,
  rakipler = [],
  tazelik,
}: {
  proje: Proje;
  keyword: string;
  rakipler?: string[];
  tazelik?: Tazelik;
}): Promise<IcerikAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const locationCode = proje.location_code ?? 2792;

  /* ---------------- 1. Arama sonuçları ---------------- */

  const serp = await serpGetir({
    keyword,
    locationCode,
    languageCode: proje.language_code,
    bizimAlanAdi: proje.domain,
    rakipler,
    derinlik: 20,
    tazelik,
  });

  const organikler = serp.ogeler
    .filter((o) => o.tur === "organic" && o.url)
    .sort((a, b) => (a.pozisyon ?? 99) - (b.pozisyon ?? 99));

  const rakipOgeler = organikler.filter((o) => !o.bizim_mi).slice(0, INCELENEN_SAYFA);
  const bizimOge = organikler.find((o) => o.bizim_mi) ?? null;

  /* ---------------- 2. Sayfa içerikleri ---------------- */

  const hedefler = [...rakipOgeler.map((o) => o.url!), ...(bizimOge?.url ? [bizimOge.url] : [])];

  const icerikler = await Promise.all(
    hedefler.map(async (url) => {
      try {
        return await sayfaIcerikOzeti(url, tazelik);
      } catch (hata) {
        // Tek bir sayfanın okunamaması analizi durdurmaz.
        console.warn("[icerik] sayfa okunamadı", {
          url,
          mesaj: hata instanceof Error ? hata.message : String(hata),
        });
        return null;
      }
    }),
  );

  const gecerliler = icerikler.filter((i): i is SayfaIcerikOzeti => i !== null);
  const bizimIcerik = bizimOge?.url
    ? (gecerliler.find((i) => i.url === bizimOge.url) ?? null)
    : null;
  const rakipIcerikler = gecerliler.filter((i) => i.url !== bizimOge?.url);

  /* ---------------- 3. Kelime sayısı ---------------- */

  const sayilar = rakipIcerikler
    .map((i) => i.kelime_sayisi)
    .filter((s): s is number => typeof s === "number" && s > 0);

  const ortalamaKelime = sayilar.length
    ? Math.round(sayilar.reduce((t, s) => t + s, 0) / sayilar.length)
    : null;

  /* ---------------- 4. Ortak konular ---------------- */

  // Bir terimin kaç farklı rakip sayfada geçtiği = kapsam.
  const belgeSayaci = new Map<string, number>();
  const toplamSayac = new Map<string, number>();

  for (const icerik of rakipIcerikler) {
    const metin = [icerik.title ?? "", icerik.h1 ?? "", ...icerik.basliklar].join(" ");
    const tekil = new Set(kelimeler(metin));

    for (const k of tekil) {
      belgeSayaci.set(k, (belgeSayaci.get(k) ?? 0) + 1);
    }
    for (const k of kelimeler(metin)) {
      toplamSayac.set(k, (toplamSayac.get(k) ?? 0) + 1);
    }
  }

  const anaKelimeler = new Set(kelimeler(keyword));
  const sayfaSayisi = Math.max(1, rakipIcerikler.length);

  const ortakKonular = [...belgeSayaci.entries()]
    .filter(([terim, adet]) => adet >= 2 && !anaKelimeler.has(terim))
    .map(([konu, adet]) => ({ konu, kapsam: Math.round((adet / sayfaSayisi) * 100) }))
    .sort((a, b) => b.kapsam - a.kapsam)
    .slice(0, 20);

  const semantikTerimler = [...toplamSayac.entries()]
    .filter(([terim]) => !anaKelimeler.has(terim))
    .map(([terim, siklik]) => ({ terim, siklik }))
    .sort((a, b) => b.siklik - a.siklik)
    .slice(0, 30);

  /* ---------------- 5. Başlıklar ---------------- */


  const baslikSayaci = new Map<string, { metin: string; adet: number }>();
  for (const icerik of rakipIcerikler) {
    for (const b of icerik.basliklar) {
      const anahtar = normalizeBaslik(b);
      const mevcut = baslikSayaci.get(anahtar);
      if (mevcut) mevcut.adet += 1;
      else baslikSayaci.set(anahtar, { metin: b, adet: 1 });
    }
  }

  /*
   * Site kabuğunu ayıkla.
   *
   * Bir e-ticaret sayfasındaki h2/h3 etiketlerinin çoğu içerik değildir:
   * menü, filtre paneli, altbilgi ve kategori listeleri de bu etiketleri
   * kullanır. Sıklığa göre azalan sıralayıp ilk sıraları almak, tam da bu
   * kabuğu "rakiplerin kullandığı başlıklar" diye sunar — kullanıcı kendi
   * içerik planını "DESTEK", "ÖZEL SAYFALAR", "Hızlı Filtreler" gibi
   * öğelere göre kurmaya çalışır.
   *
   * Ayırt edici işaret şudur: kabuk neredeyse HER sayfada aynıdır, gerçek
   * içerik başlığı ise bazı sayfalarda bulunur. Bu yüzden sayfaların
   * büyük çoğunluğunda geçen başlıklar elenir.
   */
  const analizEdilenSayfa = rakipIcerikler.length;
  const KABUK_ESIGI = 0.6;

  const basliklar = [...baslikSayaci.values()]
    .filter((b) => analizEdilenSayfa < 3 || b.adet / analizEdilenSayfa < KABUK_ESIGI)
    .sort((a, b) => b.adet - a.adet)
    .slice(0, 25)
    .map((b) => tekrariSadelestir(b.metin))
    .filter((b) => b.length > 2);

  /* ---------------- 6. Sorular ---------------- */

  const sorular = [...new Set([...serp.sorular, ...serp.ilgili_aramalar.filter((a) => /\?|nasıl|nedir|hangi|kaç|neden/i.test(a))])].slice(0, 15);

  /* ---------------- 7. İçerik boşlukları ---------------- */

  // Rakiplerin çoğunun ele aldığı, bizim sayfamızda geçmeyen konular.
  const bizimMetin = bizimIcerik
    ? new Set(kelimeler([bizimIcerik.title ?? "", bizimIcerik.h1 ?? "", ...bizimIcerik.basliklar].join(" ")))
    : null;

  const bosluklar = ortakKonular
    .filter((k) => k.kapsam >= 50)
    .filter((k) => (bizimMetin ? !bizimMetin.has(k.konu) : true))
    .slice(0, 12)
    .map((k) => k.konu);

  const rakipSayfalar = rakipOgeler.map((o) => {
    const icerik = rakipIcerikler.find((i) => i.url === o.url);
    return {
      url: o.url!,
      alan_adi: o.alan_adi ?? alanAdiCikar(o.url),
      kelime_sayisi: icerik?.kelime_sayisi ?? null,
      pozisyon: o.pozisyon,
    };
  });

  /* ---------------- 8. Kayıt ---------------- */

  const { data: kayit, error } = await supabase
    .from("content_analysis")
    .insert({
      project_id: proje.id,
      keyword,
      search_intent: aramaAmaciTahmini(keyword, serp.alisveris_var),
      avg_word_count: ortalamaKelime,
      common_topics: ortakKonular as never,
      headings: basliklar as never,
      questions: sorular as never,
      semantic_terms: semantikTerimler as never,
      competitor_pages: rakipSayfalar as never,
      gaps: bosluklar as never,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[icerik] analiz kaydedilemedi", { keyword, mesaj: error.message });
  }

  const analizId = kayit?.id ?? null;

  /* ---------------- 9. İçerik fırsatı ---------------- */

  if (analizId) {
    await icerikFirsatiKaydet({
      projeId: proje.id,
      analizId,
      keyword,
      basliklar,
      sorular,
      bosluklar,
      ortalamaKelime,
      bizimPozisyon: bizimOge?.pozisyon ?? null,
    });
  }

  return {
    analizId,
    keyword,
    aramaAmaci: aramaAmaciTahmini(keyword, serp.alisveris_var),
    ortalamaKelime,
    bizimKelimeSayisi: bizimIcerik?.kelime_sayisi ?? null,
    bizimUrl: bizimOge?.url ?? null,
    bizimPozisyon: bizimOge?.pozisyon ?? null,
    ortakKonular,
    basliklar,
    sorular,
    semantikTerimler,
    rakipSayfalar,
    bosluklar,
    incelenenSayfa: rakipIcerikler.length,
  };
}

/** Kelime ve SERP yapısından arama amacını tahmin eder. */
function aramaAmaciTahmini(keyword: string, alisverisVar: boolean): AramaAmaci {
  const k = keyword.toLocaleLowerCase("tr-TR");

  if (/\b(satın al|sipariş|sepete|fiyat|indirim|kampanya|ucuz)\b/.test(k)) return "islem";
  if (alisverisVar || /\b(model|modelleri|çeşitleri|en iyi|karşılaştırma|önerileri)\b/.test(k)) {
    return "ticari";
  }
  if (/\b(nasıl|nedir|neden|ne demek|rehber|anlamı)\b/.test(k)) return "bilgi";
  return "ticari";
}

/** Analiz sonucundan uygulanabilir bir içerik planı üretir. */
async function icerikFirsatiKaydet({
  projeId,
  analizId,
  keyword,
  basliklar,
  sorular,
  bosluklar,
  ortalamaKelime,
  bizimPozisyon,
}: {
  projeId: string;
  analizId: string;
  keyword: string;
  basliklar: string[];
  sorular: string[];
  bosluklar: string[];
  ortalamaKelime: number | null;
  bizimPozisyon: number | null;
}): Promise<void> {
  const supabase = yoneticiIstemcisi();

  // Aynı kelime için açık bir fırsat varsa tekrar oluşturulmaz.
  const { data: mevcut } = await supabase
    .from("content_opportunities")
    .select("id")
    .eq("project_id", projeId)
    .eq("keyword", keyword)
    .eq("status", "acik")
    .maybeSingle();

  const buyukHarf = keyword.charAt(0).toLocaleUpperCase("tr-TR") + keyword.slice(1);
  const baslikOnerisi = bizimPozisyon
    ? `${buyukHarf} — İçeriği güncelleyin`
    : `${buyukHarf}: Kapsamlı Rehber`;

  // Plan, önce kapatılması gereken boşluklarla başlar; sonra rakiplerin ortak başlıkları gelir.
  const anaHatlar = [
    ...(ortalamaKelime
      ? [`Hedef içerik uzunluğu: yaklaşık ${ortalamaKelime} kelime (rakip ortalaması)`]
      : []),
    ...bosluklar.map((b) => `"${b}" konusunu ele alan bir bölüm ekleyin`),
    ...basliklar.slice(0, 8),
  ];

  const plan = {
    project_id: projeId,
    analysis_id: analizId,
    keyword,
    title_suggestion: baslikOnerisi,
    outline: anaHatlar as never,
    questions: sorular as never,
    internal_links: [] as never,
    estimated_traffic: null,
    difficulty: null,
    status: "acik" as const,
  };

  if (mevcut) {
    await supabase.from("content_opportunities").update(plan).eq("id", mevcut.id);
    return;
  }

  const { error } = await supabase.from("content_opportunities").insert(plan);
  if (error) {
    console.error("[icerik] fırsat kaydedilemedi", { keyword, mesaj: error.message });
  }
}
