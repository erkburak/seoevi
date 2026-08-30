import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { alanAdiCikar } from "@/lib/utils";

import { dfsIstek, dfsTekSonuc, dfsTumSonuclar, yenidenDene } from "./client";

/**
 * Takip edilen kelimelerin sırasını CANLI aramayla doğrular.
 *
 * Neden gerekli: Labs'in `ranked_keywords` ucu canlı arama değil, geçmişe
 * dayalı bir veritabanıdır. Ölçtüğümüz gerçek örneklerde kayıtlar 44–104
 * gün eskiydi; "13. sıradasınız" denen kelimede site canlı SERP'in ilk 67
 * organik sonucunda hiç yoktu, yalnızca görsel paketinde geçiyordu. O
 * veriyi güncel sıra diye göstermek kullanıcıyı yanıltır.
 *
 * Neden kuyruk: aynı sorgu canlı uçta derinlik 30 için $0.006, kuyrukta
 * $0.0018. Üç kat fark paket limitlerini doğrudan belirliyor.
 *
 * Kuyruğun bedeli gecikmedir: ölçtüğümüz tamamlanma süresi 3–6 dakika,
 * analiz işinin tamamına tanınan süre ise 5 dakika. Bu yüzden akış
 * "aç ve bekle" değil, "aç, kaydet, sonra topla" biçimindedir —
 * {@link saglayici_gorevleri} tablosu sayesinde ödenen hiçbir görev ziyan
 * olmaz.
 */

/** Sağlayıcının tek istekte kabul ettiği azami görev sayısı. */
const OBEK = 100;

/**
 * Kaç sonuç derinliğine bakılacağı.
 *
 * Fiyat sonuç başına $0.00006 ile doğrusal artar (20 → $0.0012,
 * 30 → $0.0018, 100 → $0.006). Derinlik 30 organik ilk ~28'i, yani ilk üç
 * sayfayı kapsar. Daha derini hem pahalı hem de eyleme dönüştürülemez:
 * 60. sıradaki kelime için verilecek karar 30. sıradakinden farklı değil.
 */
const DERINLIK = 30;

/**
 * Görev açtıktan sonra sonucu beklemek için harcanacak azami süre.
 *
 * Kısa tutulur: analiz işinin tamamı 5 dakikayla sınırlı ve bu yalnızca
 * bir modül. Bu sürede gelmeyen sonuçlar tabloda kalır, akışın ilerleyen
 * adımlarında toplanır.
 */
const ILK_BEKLEME = 45_000;

/** İki yoklama arasındaki bekleme. */
const YOKLAMA_ARASI = 8_000;

/** Bu yaştan eski bekleyen görev yeniden açılır; sonucu bayatlamıştır. */
const GOREV_OMRU_SAAT = 24;

export type DogrulanmisSira = {
  keyword: string;
  /**
   * Organik sıra. İlk {@link DERINLIK} sonuç içinde çıkmıyorsa `null` —
   * bu "bilmiyoruz" değil, "ilk 30'da değil" demektir.
   */
  pozisyon: number | null;
  url: string | null;
  /** Ölçümün yapıldığı an; kullanıcıya bu tarih gösterilir. */
  olculdu_at: string;
};

type HamGorevSonucu = {
  keyword?: string;
  datetime?: string;
  items?: {
    type?: string;
    rank_group?: number | null;
    domain?: string | null;
    url?: string | null;
  }[];
};

function bekle(ms: number): Promise<void> {
  return new Promise((c) => setTimeout(c, ms));
}

/** Bir görev sonucundan bizim organik sıramızı çıkarır. */
function sirayiCikar(
  sonuc: HamGorevSonucu,
  bizimAlanAdi: string,
  kelime: string,
): DogrulanmisSira {
  const hedef = bizimAlanAdi.replace(/^www\./, "");

  /*
   * Yalnızca organik öğeler sıralama sayılır. Görsel paketi, videolar ve
   * "insanlar bunu da soruyor" kutusu da SERP'te yer tutar; görselde
   * çıkmak organik sırada çıkmak değildir.
   */
  const bizimki = (sonuc.items ?? []).find((o) => {
    if (o.type !== "organic") return false;
    const ad = o.domain ? o.domain.replace(/^www\./, "") : alanAdiCikar(o.url);
    return ad === hedef;
  });

  return {
    keyword: sonuc.keyword ?? kelime,
    pozisyon: bizimki?.rank_group ?? null,
    url: bizimki?.url ?? null,
    olculdu_at: sonuc.datetime ? new Date(sonuc.datetime).toISOString() : new Date().toISOString(),
  };
}

/** Hesapta tamamlanmış görevlerin kimlikleri. */
async function hazirGorevler(): Promise<Set<string>> {
  try {
    const satirlar = await dfsTumSonuclar<{ id?: string }>(
      "/serp/google/organic/tasks_ready",
      undefined,
      "GET",
    );
    return new Set(satirlar.map((s) => s.id).filter((i): i is string => Boolean(i)));
  } catch {
    return new Set();
  }
}

type BekleyenGorev = { id: string; task_id: string; hedef: string };

/** Bu projede açılmış ama sonucu okunmamış görevler. */
async function bekleyenler(projeId: string): Promise<BekleyenGorev[]> {
  const supabase = yoneticiIstemcisi();
  const esik = new Date(Date.now() - GOREV_OMRU_SAAT * 3_600_000).toISOString();

  const { data } = await supabase
    .from("saglayici_gorevleri")
    .select("id, task_id, hedef")
    .eq("project_id", projeId)
    .eq("tur", "serp")
    .is("collected_at", null)
    .gte("posted_at", esik);

  return (data ?? []) as BekleyenGorev[];
}

/** Bu projede sonucu hâlâ beklenen görev sayısı. */
export async function bekleyenGorevSayisi(projeId: string): Promise<number> {
  return (await bekleyenler(projeId)).length;
}

/**
 * Hazır olan bekleyen görevlerin sonuçlarını okur ve okunmuş işaretler.
 *
 * Görev açmaz, ücret doğurmaz: yalnızca ödenmiş sonuçları toplar.
 */
export async function bekleyenSiralariTopla({
  projeId,
  bizimAlanAdi,
}: {
  projeId: string;
  bizimAlanAdi: string;
}): Promise<Map<string, DogrulanmisSira>> {
  const acikGorevler = await bekleyenler(projeId);
  if (!acikGorevler.length) return new Map();

  const hazir = await hazirGorevler();
  const okunacaklar = acikGorevler.filter((g) => hazir.has(g.task_id));
  if (!okunacaklar.length) return new Map();

  const supabase = yoneticiIstemcisi();
  const sonuclar = new Map<string, DogrulanmisSira>();
  const okunanlar: string[] = [];

  for (const gorev of okunacaklar) {
    try {
      const veri = await dfsTekSonuc<HamGorevSonucu>(
        `/serp/google/organic/task_get/advanced/${gorev.task_id}`,
        undefined,
        "GET",
      );
      if (veri) sonuclar.set(gorev.hedef, sirayiCikar(veri, bizimAlanAdi, gorev.hedef));
      okunanlar.push(gorev.id);
    } catch {
      // Tek bir görev okunamazsa diğerleri etkilenmemeli; satır açık
      // kalır ve ömrü dolana kadar yeniden denenir.
    }
  }

  if (okunanlar.length) {
    await supabase
      .from("saglayici_gorevleri")
      .update({ collected_at: new Date().toISOString() })
      .in("id", okunanlar);
  }

  return sonuclar;
}

/**
 * Verilen kelimelerin organik sırasını doğrular.
 *
 * Önce ödenmiş bekleyen sonuçlar toplanır, sonra eksik kelimeler için
 * görev açılır ve kısa bir süre beklenir. Bu sürede gelmeyenler tabloda
 * kalır; {@link bekleyenSiralariTopla} ile sonradan toplanır.
 *
 * Dönen haritada bulunmayan kelime "henüz ölçülemedi" demektir; sırası
 * `null` olan kelime ise ölçüldü ama ilk {@link DERINLIK} sonuçta yok
 * demektir. İkisi farklı şeylerdir ve arayüzde farklı gösterilir.
 */
export async function siralariDogrula({
  projeId,
  kelimeler,
  locationCode,
  languageCode = "tr",
  bizimAlanAdi,
  ilkBekleme = ILK_BEKLEME,
  yoklamaArasi = YOKLAMA_ARASI,
}: {
  projeId: string;
  kelimeler: string[];
  locationCode: number;
  languageCode?: string;
  bizimAlanAdi: string;
  ilkBekleme?: number;
  /** Testlerde kısaltılabilsin diye açık tutulur. */
  yoklamaArasi?: number;
}): Promise<Map<string, DogrulanmisSira>> {
  const benzersiz = [...new Set(kelimeler)].filter((k) => k.trim().length > 0);
  if (!benzersiz.length) return new Map();

  const supabase = yoneticiIstemcisi();
  const sonuclar = await bekleyenSiralariTopla({ projeId, bizimAlanAdi });

  /*
   * Halihazırda açık görevi olan kelime için ikinci görev açılmaz —
   * açmak aynı ölçüm için ikinci kez ödemek olurdu.
   */
  const acikKelimeler = new Set((await bekleyenler(projeId)).map((g) => g.hedef));
  const eksikler = benzersiz.filter((k) => !sonuclar.has(k) && !acikKelimeler.has(k));

  /* ---------------- Görevleri aç ---------------- */

  const gorevKelimesi = new Map<string, string>();

  for (let i = 0; i < eksikler.length; i += OBEK) {
    const dilim = eksikler.slice(i, i + OBEK);
    const gövde = dilim.map((keyword) => ({
      keyword,
      location_code: locationCode,
      language_code: languageCode,
      device: "desktop",
      depth: DERINLIK,
      priority: 1,
    }));

    try {
      const yanit = await yenidenDene(() =>
        dfsIstek<never>("/serp/google/organic/task_post", gövde),
      );

      // Görevler gönderilen sırayla döner; kelimeyle eşlemek için bu şart.
      (yanit.tasks ?? []).forEach((g, sira) => {
        const kelime = dilim[sira];
        if (g.id && kelime) gorevKelimesi.set(g.id, kelime);
      });
    } catch (hata) {
      console.error("[sira] görevler açılamadı", {
        adet: dilim.length,
        mesaj: hata instanceof Error ? hata.message : String(hata),
      });
    }
  }

  // Kimlikler HEMEN kaydedilir: bu satır yazılmazsa, sonuç zamanında
  // gelmediğinde ödenmiş görev bir daha bulunamaz.
  if (gorevKelimesi.size) {
    await supabase.from("saglayici_gorevleri").insert(
      [...gorevKelimesi.entries()].map(([task_id, hedef]) => ({
        project_id: projeId,
        tur: "serp",
        hedef,
        task_id,
      })) as never,
    );
  }

  /* ---------------- Kısa süre bekle ---------------- */

  const bekleyenKimlikler = new Set(gorevKelimesi.keys());
  const bitis = Date.now() + ilkBekleme;

  while (bekleyenKimlikler.size && Date.now() < bitis) {
    await bekle(yoklamaArasi);

    const hazir = await hazirGorevler();
    const okunacaklar = [...bekleyenKimlikler].filter((id) => hazir.has(id));
    if (!okunacaklar.length) continue;

    const okunanTaskIdler: string[] = [];
    for (const id of okunacaklar) {
      const kelime = gorevKelimesi.get(id)!;
      try {
        const veri = await dfsTekSonuc<HamGorevSonucu>(
          `/serp/google/organic/task_get/advanced/${id}`,
          undefined,
          "GET",
        );
        if (veri) sonuclar.set(kelime, sirayiCikar(veri, bizimAlanAdi, kelime));
        okunanTaskIdler.push(id);
      } catch {
        // Sonraki toplamada yeniden denenir.
      }
      bekleyenKimlikler.delete(id);
    }

    if (okunanTaskIdler.length) {
      await supabase
        .from("saglayici_gorevleri")
        .update({ collected_at: new Date().toISOString() })
        .in("task_id", okunanTaskIdler);
    }
  }

  return sonuclar;
}
