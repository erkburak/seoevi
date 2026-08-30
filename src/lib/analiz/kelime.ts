import "server-only";

import type { Tazelik } from "@/lib/dataforseo/cache";
import { alanAdiOzeti, siralananKelimeler } from "@/lib/dataforseo/labs";
import {
  bekleyenGorevSayisi,
  bekleyenSiralariTopla,
  siralariDogrula,
} from "@/lib/dataforseo/sira-dogrulama";
import { firsatSkoru } from "@/lib/scoring";
import { dogrulanacakKelimeLimiti, takipKelimeLimiti } from "@/lib/subscription";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { arasinda } from "@/lib/utils";
import type { FirsatTuru, Proje } from "@/types/database";

/**
 * Alan adının sıralama verisini işler:
 * anahtar kelimeler, sıralamalar, görünürlük ve fırsat skorları.
 */

export type KelimeAnaliziSonucu = {
  toplamKelime: number;
  ilkOn: number;
  tahminiTrafik: number;
  keywordSkoru: number;
  firsatSayisi: number;
  enIyiFirsatlar: { keyword: string; skor: number; pozisyon: number | null }[];
};

/**
 * Sıralama dağılımından anahtar kelime performans skoru üretir.
 *
 * Yalnızca sırası CANLI doğrulanmış kelimeler girdi olur; doğrulanmamış
 * kelimenin sırası bilinmediği için skora katılamaz.
 */
export function kelimePerformansSkoru(pozisyonlar: (number | null)[]): number {
  if (!pozisyonlar.length) return 0;

  const puan = pozisyonlar.reduce((t: number, p) => {
    if (p === null) return t;
    if (p <= 3) return t + 100;
    if (p <= 10) return t + 72;
    if (p <= 20) return t + 42;
    if (p <= 50) return t + 18;
    return t + 6;
  }, 0);

  return Math.round(arasinda(puan / pozisyonlar.length, 0, 100));
}

export async function kelimeAnaliziYap({
  proje,
  limit = 500,
  tazelik,
}: {
  proje: Proje;
  limit?: number;
  tazelik?: Tazelik;
}): Promise<KelimeAnaliziSonucu> {
  const supabase = yoneticiIstemcisi();
  const locationCode = proje.location_code ?? 2792;

  const [ozet, kelimeler] = await Promise.all([
    alanAdiOzeti({ domain: proje.domain, locationCode, languageCode: proje.language_code, tazelik }),
    siralananKelimeler({
      domain: proje.domain,
      locationCode,
      languageCode: proje.language_code,
      limit,
      tazelik,
    }),
  ]);

  if (!kelimeler.length) {
    return {
      toplamKelime: ozet.organik_kelime,
      // Hiç kelime yoksa ölçüm de yapılmamıştır; Labs özetindeki eski
      // sayıyı göstermek olmayan bir başarıyı bildirmek olur.
      ilkOn: 0,
      tahminiTrafik: ozet.tahmini_trafik,
      keywordSkoru: 0,
      firsatSayisi: 0,
      enIyiFirsatlar: [],
    };
  }

  /* ---------------- Anahtar kelimeler ---------------- */

  /*
   * Labs yüzlerce kelime döndürür ve hepsi saklanır — satır başına ek
   * ücret ödenmediği için bu veriyi atmak israf olur. Ancak yalnızca
   * paketin izin verdiği kadarı TAKİBE alınır; gerisi kayıtlı kalır ve
   * yükseltme panelinde "kaç kelime daha var" olarak gösterilir.
   *
   * Hangi kelimelerin takip edileceği rastgele değil, fırsat skoruna göre
   * belirlenir: kullanıcı sınırlı hakkını en kazançlı kelimelerde kullanır.
   */
  const { limit: takipLimiti } = await takipKelimeLimiti(proje.user_id, proje.id);

  // Kullanıcının kendi eklediği kelimeler onun açık tercihidir; analiz
  // bunları takipten düşürmez ve kalan hak üzerinden hesap yapar.
  const { data: elleEklenen } = await supabase
    .from("keywords")
    .select("keyword")
    .eq("project_id", proje.id)
    .eq("is_tracked", true)
    .eq("source", "arastirma");

  const korunanlar = new Set((elleEklenen ?? []).map((k) => k.keyword));
  const kalanHak = Math.max(0, takipLimiti - korunanlar.size);

  const degerSirasi = [...kelimeler]
    .map((k) => ({
      keyword: k.keyword,
      skor: firsatSkoru({
        aramaHacmi: k.arama_hacmi,
        zorluk: k.zorluk,
        rekabet: k.rekabet,
        mevcutPozisyon: k.pozisyon,
        amac: k.amac,
        serpOzellikSayisi: 0,
        alisverisVar: false,
        rakipSayisi: 0,
        alanAdiGucu: null,
      }).skor,
    }))
    .filter((k) => !korunanlar.has(k.keyword))
    .sort((a, b) => b.skor - a.skor);

  const takipEdilecek = new Set(degerSirasi.slice(0, kalanHak).map((k) => k.keyword));

  const kelimeKayitlari = kelimeler.map((k) => ({
    project_id: proje.id,
    keyword: k.keyword,
    search_volume: k.arama_hacmi,
    cpc: k.cpc,
    competition: k.rekabet,
    competition_level:
      k.rekabet === null ? null : k.rekabet < 0.34 ? "dusuk" : k.rekabet < 0.67 ? "orta" : "yuksek",
    difficulty: k.zorluk,
    intent: k.amac,
    is_tracked: korunanlar.has(k.keyword) || takipEdilecek.has(k.keyword),
    // Elle eklenmiş kelimenin kaynağı korunur; aksi hâlde bir sonraki
    // analizde kullanıcı tercihi olduğu bilgisi kaybolur.
    source: korunanlar.has(k.keyword) ? "arastirma" : "labs",
    // Mevsimsellik analizi bu alandan beslenir.
    trend: k.trend as never,
    location_code: locationCode,
    language_code: proje.language_code,
    last_refreshed_at: new Date().toISOString(),
  }));

  for (let i = 0; i < kelimeKayitlari.length; i += 500) {
    await supabase
      .from("keywords")
      .upsert(kelimeKayitlari.slice(i, i + 500) as never, { onConflict: "project_id,keyword" });
  }

  const { data: kayitli } = await supabase
    .from("keywords")
    .select("id, keyword")
    .eq("project_id", proje.id);

  const kelimeKimlik = new Map((kayitli ?? []).map((k) => [k.keyword, k.id]));

  /* ---------------- Sıra doğrulama ---------------- */

  /*
   * Sıralar Labs'ten alınamaz.
   *
   * `ranked_keywords` canlı arama değil, geçmişe dayalı bir veritabanıdır.
   * Ölçtüğümüz gerçek örneklerde kayıtlar 44–104 gün eskiydi ve "13.
   * sıradasınız" denen kelimede site canlı SERP'in ilk 67 organik
   * sonucunda hiç yoktu. Bu yüzden gösterilen her sıra, kuyruklu SERP
   * göreviyle o an ölçülmüş olmak zorundadır.
   *
   * Doğrulama maliyetli olduğu için pakete bağlıdır. Hak, kullanıcının
   * kendi eklediği kelimelere önce verilir (bunlar onun açık tercihidir),
   * kalanı fırsat skoruna göre dağıtılır.
   */
  const dogrulamaLimiti = await dogrulanacakKelimeLimiti(proje.user_id);

  const skorHaritasi = new Map(degerSirasi.map((d) => [d.keyword, d.skor]));

  const dogrulanacaklar = kelimeler
    .filter((k) => korunanlar.has(k.keyword) || takipEdilecek.has(k.keyword))
    .sort((a, b) => {
      const aElle = korunanlar.has(a.keyword) ? 1 : 0;
      const bElle = korunanlar.has(b.keyword) ? 1 : 0;
      if (aElle !== bElle) return bElle - aElle;
      return (skorHaritasi.get(b.keyword) ?? 0) - (skorHaritasi.get(a.keyword) ?? 0);
    })
    .slice(0, dogrulamaLimiti)
    .map((k) => k.keyword);

  const dogrulanan = dogrulanacaklar.length
    ? await siralariDogrula({
        projeId: proje.id,
        kelimeler: dogrulanacaklar,
        locationCode,
        languageCode: proje.language_code,
        bizimAlanAdi: proje.domain,
      })
    : new Map<string, { keyword: string; pozisyon: number | null; url: string | null; olculdu_at: string }>();

  /** Doğrulanmış sıra; kelime ölçülmediyse `undefined`. */
  const olculenSira = (kelime: string) => dogrulanan.get(kelime);

  /* ---------------- Sıralamalar ---------------- */

  /*
   * Önceki sıra kendi ölçüm geçmişimizden alınır.
   *
   * Sağlayıcı önceki sırayı yalnızca mutlak ölçekte veriyor; onu organik
   * sırayla karşılaştırmak uydurma bir değişim üretir ("28. sıradan 14.
   * sıraya" gibi). Kendi kayıtlarımız her zaman aynı ölçektedir.
   */
  const { data: sonOlcumler } = await supabase
    .from("keyword_rankings")
    .select("keyword_id, position, checked_at")
    .eq("project_id", proje.id)
    .eq("is_competitor", false)
    .order("checked_at", { ascending: false })
    .limit(2000);

  const oncekiSira = new Map<string, number>();
  for (const o of sonOlcumler ?? []) {
    // Sıralı geldiği için ilk görülen kayıt en yenisidir.
    if (o.position !== null && !oncekiSira.has(o.keyword_id)) {
      oncekiSira.set(o.keyword_id, o.position);
    }
  }

  const labsKaydi = new Map(kelimeler.map((k) => [k.keyword, k]));

  /*
   * Yalnızca ölçülen kelimeler için sıralama kaydı açılır. Ölçülmemiş bir
   * kelimenin sırası bilinmiyor demektir; boş kayıt açmak "sıra yok" ile
   * "bakmadık" arasındaki farkı yok eder.
   */
  const siralamalar = [...dogrulanan.values()]
    .filter((d) => kelimeKimlik.has(d.keyword))
    .map((d) => ({
      project_id: proje.id,
      keyword_id: kelimeKimlik.get(d.keyword)!,
      domain: proje.domain,
      is_competitor: false,
      position: d.pozisyon,
      previous_position: oncekiSira.get(kelimeKimlik.get(d.keyword)!) ?? null,
      url: d.url,
      device: "desktop",
      // Tahmini trafik sıradan türetilir; ilk 30'da değilsek sıfırdır.
      etv: d.pozisyon === null ? 0 : (labsKaydi.get(d.keyword)?.etv ?? null),
      checked_at: d.olculdu_at,
    }));

  for (let i = 0; i < siralamalar.length; i += 500) {
    await supabase.from("keyword_rankings").insert(siralamalar.slice(i, i + 500) as never);
  }

  /* ---------------- Fırsat skorları ---------------- */

  // Not: Fırsat skoru burada SERP çağrısı yapmadan, mevcut sinyallerle
  // hesaplanır. Kullanıcı bir kelimenin detayını açtığında SERP verisi
  // canlı çekilir ve skor SERP yapısıyla birlikte yenilenir.
  const firsatlar = kelimeler
    .filter((k) => kelimeKimlik.has(k.keyword) && (k.arama_hacmi ?? 0) > 0)
    .map((k) => {
      /*
       * Mevcut sıra yalnızca doğrulanmış kelimelerde bilinir. Labs'in eski
       * sırasını buraya vermek, "11-20 arasındasınız, biraz itin" gibi
       * doğrulanmamış bir iddia üretirdi; ölçmediğimiz kelimede sıra
       * bilinmiyor kabul edilir ve skor hacim/zorluk üzerinden çıkar.
       */
      const olculen = olculenSira(k.keyword);
      const mevcutPozisyon = olculen ? olculen.pozisyon : null;

      const sonuc = firsatSkoru({
        aramaHacmi: k.arama_hacmi,
        zorluk: k.zorluk,
        rekabet: k.rekabet,
        mevcutPozisyon,
        amac: k.amac,
        serpOzellikSayisi: 0,
        alisverisVar: false,
        rakipSayisi: 0,
        alanAdiGucu: null,
      });

      // "Hızlı kazanım" bir sıra iddiasıdır; ancak ölçülmüşse verilebilir.
      const tur: FirsatTuru =
        mevcutPozisyon !== null && mevcutPozisyon > 10 && mevcutPozisyon <= 20
          ? "hizli_kazanim"
          : "genel";

      return {
        project_id: proje.id,
        keyword_id: kelimeKimlik.get(k.keyword)!,
        score: sonuc.skor,
        potential_traffic: sonuc.tahminiTrafik,
        current_position: mevcutPozisyon,
        target_position: sonuc.hedefPozisyon,
        reason: sonuc.gerekce,
        signals: sonuc.sinyaller as never,
        opportunity_type: tur,
        status: "acik",
        keyword: k.keyword,
        _skor: sonuc.skor,
      };
    })
    .sort((a, b) => b._skor - a._skor);

  const kaydedilecek = firsatlar.slice(0, 300).map(({ keyword: _k, _skor, ...rest }) => {
    void _k;
    void _skor;
    return rest;
  });

  if (kaydedilecek.length) {
    for (let i = 0; i < kaydedilecek.length; i += 300) {
      await supabase
        .from("keyword_opportunities")
        .upsert(kaydedilecek.slice(i, i + 300) as never, {
          onConflict: "project_id,keyword_id,opportunity_type",
        });
    }
  }

  const olculenPozisyonlar = [...dogrulanan.values()].map((d) => d.pozisyon);

  return {
    toplamKelime: ozet.organik_kelime || kelimeler.length,
    /*
     * "İlk 10'da N kelimeniz var" bir sıra iddiasıdır; Labs özetinden
     * alınırsa aylar öncesine ait olur. Yalnızca bu analizde ölçülmüş
     * kelimeler sayılır.
     */
    ilkOn: olculenPozisyonlar.filter((p) => p !== null && p <= 10).length,
    tahminiTrafik: ozet.tahmini_trafik,
    keywordSkoru: kelimePerformansSkoru(olculenPozisyonlar),
    firsatSayisi: firsatlar.filter((f) => f._skor >= 60).length,
    enIyiFirsatlar: firsatlar.slice(0, 5).map((f) => ({
      keyword: f.keyword,
      skor: f._skor,
      pozisyon: f.current_position,
    })),
  };
}


/**
 * Sonradan tamamlanan sıra ölçümlerini toplar ve kaydeder.
 *
 * Kuyruklu SERP görevleri 3–6 dakikada tamamlanıyor; analiz işinin tamamı
 * ise 5 dakikayla sınırlı. Kelime adımında beklenemeyen sonuçlar bu
 * işlevle toplanır. Yeni görev açmaz, ücret doğurmaz: yalnızca ödenmiş
 * sonuçları okur.
 */
export async function bekleyenSiralariIsle(
  proje: Proje,
): Promise<{ toplanan: number; bekleyen: number }> {
  const supabase = yoneticiIstemcisi();

  const toplanan = await bekleyenSiralariTopla({
    projeId: proje.id,
    bizimAlanAdi: proje.domain,
  });

  if (!toplanan.size) {
    return { toplanan: 0, bekleyen: await bekleyenGorevSayisi(proje.id) };
  }

  const { data: kayitli } = await supabase
    .from("keywords")
    .select("id, keyword")
    .eq("project_id", proje.id);

  const kelimeKimlik = new Map((kayitli ?? []).map((k) => [k.keyword, k.id]));

  // Önceki sıra kendi ölçüm geçmişimizden; sağlayıcının mutlak ölçekli
  // değeri organik sırayla karşılaştırılamaz.
  const { data: sonOlcumler } = await supabase
    .from("keyword_rankings")
    .select("keyword_id, position, checked_at")
    .eq("project_id", proje.id)
    .eq("is_competitor", false)
    .order("checked_at", { ascending: false })
    .limit(2000);

  const oncekiSira = new Map<string, number>();
  for (const o of sonOlcumler ?? []) {
    if (o.position !== null && !oncekiSira.has(o.keyword_id)) {
      oncekiSira.set(o.keyword_id, o.position);
    }
  }

  const satirlar = [...toplanan.values()]
    .filter((d) => kelimeKimlik.has(d.keyword))
    .map((d) => ({
      project_id: proje.id,
      keyword_id: kelimeKimlik.get(d.keyword)!,
      domain: proje.domain,
      is_competitor: false,
      position: d.pozisyon,
      previous_position: oncekiSira.get(kelimeKimlik.get(d.keyword)!) ?? null,
      url: d.url,
      device: "desktop",
      etv: d.pozisyon === null ? 0 : null,
      checked_at: d.olculdu_at,
    }));

  for (let i = 0; i < satirlar.length; i += 500) {
    await supabase.from("keyword_rankings").insert(satirlar.slice(i, i + 500) as never);
  }

  // Fırsat kayıtlarındaki sıra da tazelenir; aksi hâlde tablo "ölçülmedi"
  // demeye devam eder.
  for (const d of toplanan.values()) {
    const kimlik = kelimeKimlik.get(d.keyword);
    if (!kimlik) continue;
    await supabase
      .from("keyword_opportunities")
      .update({ current_position: d.pozisyon })
      .eq("project_id", proje.id)
      .eq("keyword_id", kimlik);
  }

  return { toplanan: satirlar.length, bekleyen: await bekleyenGorevSayisi(proje.id) };
}
