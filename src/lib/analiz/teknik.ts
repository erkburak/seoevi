import "server-only";

import {
  icBaglantiGrafigi,
  taramaOzeti,
  taramaSayfalari,
  type TaranmisSayfa,
} from "@/lib/dataforseo/onpage";
import { teknikSkor, urunSkoru, kategoriSkoru, type SayfaSinyali } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { baglantiGrafiginiKaydet, oneriUret } from "@/lib/analiz/ic-baglanti";
import { kaliplariTahminEt, sayfaTuruBelirle } from "@/lib/analiz/siniflandirma";
import type { Etki, Onem, Proje, SayfaTuru } from "@/types/database";

/**
 * Tarama sonuçlarını sayfalara, teknik sorunlara ve skorlara dönüştürür.
 */

type SorunTanimi = {
  kod: string;
  kategori: string;
  onem: Onem;
  baslik: string;
  aciklama: string;
  oneri: string;
  etki: Etki;
  /** Sayfa bu koşulu sağlıyorsa sorun vardır. */
  kosul: (s: TaranmisSayfa) => boolean;
};

const SORUN_TANIMLARI: SorunTanimi[] = [
  {
    kod: "title_eksik",
    kategori: "meta",
    onem: "kritik",
    baslik: "Başlık etiketi eksik",
    aciklama: "Sayfada title etiketi bulunmuyor. Google arama sonucunda gösterecek başlık üretemiyor.",
    oneri: "Hedef anahtar kelimeyi başa alan, 50-60 karakterlik bir başlık ekleyin.",
    etki: "cok_yuksek",
    kosul: (s) => !s.title,
  },
  {
    kod: "title_kisa",
    kategori: "meta",
    onem: "uyari",
    baslik: "Başlık çok kısa",
    aciklama: "Başlık 25 karakterin altında; arama sonuçlarında yeterli bağlam vermiyor.",
    oneri: "Ürün/kategori adını, ayırt edici özelliği ve marka adını başlığa ekleyin.",
    etki: "orta",
    kosul: (s) => Boolean(s.title && (s.title_uzunluk ?? 0) < 25),
  },
  {
    kod: "title_uzun",
    kategori: "meta",
    onem: "uyari",
    baslik: "Başlık çok uzun",
    aciklama: "Başlık 65 karakterin üzerinde; arama sonucunda kesiliyor.",
    oneri: "Başlığı 60 karakterin altına indirin ve hedef kelimeyi başa taşıyın.",
    etki: "orta",
    kosul: (s) => (s.title_uzunluk ?? 0) > 65,
  },
  {
    kod: "aciklama_eksik",
    kategori: "meta",
    onem: "uyari",
    baslik: "Meta açıklama eksik",
    aciklama: "Sayfada meta description yok; tıklama oranını doğrudan etkiler.",
    oneri: "Satın alma gerekçesini içeren 120-155 karakterlik bir açıklama yazın.",
    etki: "yuksek",
    kosul: (s) => !s.aciklama,
  },
  {
    kod: "aciklama_uzun",
    kategori: "meta",
    onem: "bilgi",
    baslik: "Meta açıklama çok uzun",
    aciklama: "Açıklama 165 karakteri aşıyor ve kesiliyor.",
    oneri: "Açıklamayı 155 karakterin altına indirin.",
    etki: "dusuk",
    kosul: (s) => (s.aciklama_uzunluk ?? 0) > 165,
  },
  {
    kod: "h1_eksik",
    kategori: "baslik",
    onem: "kritik",
    baslik: "H1 başlığı yok",
    aciklama: "Sayfanın ana başlığı işaretlenmemiş.",
    oneri: "Sayfanın konusunu anlatan tek bir H1 başlığı ekleyin.",
    etki: "yuksek",
    kosul: (s) => s.h1_sayisi === 0,
  },
  {
    kod: "h1_coklu",
    kategori: "baslik",
    onem: "uyari",
    baslik: "Birden fazla H1",
    aciklama: "Sayfada birden çok H1 var; başlık hiyerarşisi belirsizleşiyor.",
    oneri: "Tek H1 bırakın, diğerlerini H2'ye çevirin.",
    etki: "orta",
    kosul: (s) => s.h1_sayisi > 1,
  },
  {
    kod: "ince_icerik",
    kategori: "baslik",
    onem: "uyari",
    baslik: "İçerik yetersiz",
    aciklama: "Sayfada 150 kelimeden az metin var; arama motoru için bağlam oluşmuyor.",
    oneri: "Özgün açıklama, kullanım bilgisi ve sık sorulan sorular ekleyin.",
    etki: "yuksek",
    kosul: (s) => (s.kelime_sayisi ?? 0) > 0 && (s.kelime_sayisi ?? 0) < 150,
  },
  {
    kod: "indekslenemez",
    kategori: "indeksleme",
    onem: "kritik",
    baslik: "Sayfa indekslenemiyor",
    aciklama: "noindex ya da robots kuralı nedeniyle sayfa arama sonuçlarına giremiyor.",
    oneri: "Bu sayfanın indekslenmesi gerekiyorsa noindex kuralını kaldırın.",
    etki: "cok_yuksek",
    kosul: (s) => s.indekslenebilir === false,
  },
  {
    kod: "canonical_eksik",
    kategori: "indeksleme",
    onem: "uyari",
    baslik: "Canonical etiketi yok",
    aciklama: "Canonical tanımlı değil; varyant adreslerde içerik tekrarı riski var.",
    oneri: "Her sayfaya kendi canonical adresini ekleyin.",
    etki: "orta",
    kosul: (s) => !s.canonical,
  },
  {
    kod: "hatali_durum",
    kategori: "tarama",
    onem: "kritik",
    baslik: "Sayfa hata veriyor",
    aciklama: "Sayfa 4xx veya 5xx durum kodu döndürüyor.",
    oneri: "Sayfayı düzeltin veya çalışan bir adrese kalıcı yönlendirme yapın.",
    etki: "cok_yuksek",
    kosul: (s) => (s.durum_kodu ?? 200) >= 400,
  },
  {
    kod: "alt_metin_eksik",
    kategori: "gorsel",
    onem: "uyari",
    baslik: "Görsel alt metni eksik",
    aciklama: "Sayfadaki bazı görsellerde alt metni tanımlı değil.",
    oneri: "Her görsele içeriği anlatan alt metni ekleyin; görsel aramadan trafik getirir.",
    etki: "orta",
    kosul: (s) => s.alt_metinsiz_gorsel > 0,
  },
  {
    kod: "schema_eksik",
    kategori: "schema",
    onem: "uyari",
    baslik: "Yapısal veri yok",
    aciklama: "Sayfada schema işaretlemesi bulunamadı.",
    oneri: "Ürün sayfalarında Product, kategori sayfalarında ItemList schema kullanın.",
    etki: "yuksek",
    kosul: (s) => !s.schema_var_mi,
  },
  {
    kod: "yetim_sayfa",
    kategori: "mimari",
    onem: "uyari",
    baslik: "Yetim sayfa",
    aciklama: "Sayfaya site içinden hiç bağlantı verilmemiş.",
    oneri: "İlgili kategori ve içerik sayfalarından bu sayfaya bağlantı ekleyin.",
    etki: "orta",
    kosul: (s) => s.yetim_mi,
  },
  {
    kod: "derin_sayfa",
    kategori: "mimari",
    onem: "bilgi",
    baslik: "Sayfa çok derinde",
    aciklama: "Ana sayfadan 4 tıklamadan uzakta; tarama önceliği düşüyor.",
    oneri: "Menü veya iç bağlantılarla sayfayı yüzeye taşıyın.",
    etki: "dusuk",
    kosul: (s) => (s.tiklama_derinligi ?? 0) > 4,
  },
  {
    kod: "ic_link_az",
    kategori: "link",
    onem: "bilgi",
    baslik: "İç bağlantı az",
    aciklama: "Sayfaya 3'ten az iç bağlantı geliyor.",
    oneri: "İlgili ürün ve içerik sayfalarından bağlantı verin.",
    etki: "dusuk",
    kosul: (s) => (s.ic_link ?? 0) < 3,
  },
];

export type TeknikAnalizSonucu = {
  taranan: number;
  sayfaTurleri: Record<SayfaTuru, number>;
  skor: number;
  kirilim: Record<string, number>;
  kritikSorun: number;
  toplamSorun: number;
  urunSkorOrtalamasi: number | null;
  kategoriSkorOrtalamasi: number | null;
  eticaretSkoru: number | null;
};

/**
 * Tarama sonucunu veritabanına işler:
 * sayfalar, ürünler, kategoriler, teknik sorunlar ve skorlar.
 */
export async function taramaSonucunuIsle({
  proje,
  gorevId,
}: {
  proje: Proje;
  gorevId: string;
}): Promise<TeknikAnalizSonucu> {
  const supabase = yoneticiIstemcisi();

  const { data: ayarlar } = await supabase
    .from("project_settings")
    .select("product_url_pattern, category_url_pattern, max_crawl_pages")
    .eq("project_id", proje.id)
    .maybeSingle();

  const ozet = await taramaOzeti(gorevId);
  const maksSayfa = Math.min(ayarlar?.max_crawl_pages ?? 200, ozet.taranan_sayfa || 200);

  // Sayfaları parça parça oku.
  const tumSayfalar: TaranmisSayfa[] = [];
  for (let offset = 0; offset < maksSayfa; offset += 100) {
    const { sayfalar } = await taramaSayfalari({ gorevId, limit: 100, offset });
    if (!sayfalar.length) break;
    tumSayfalar.push(...sayfalar);
    if (sayfalar.length < 100) break;
  }

  if (!tumSayfalar.length) {
    return {
      taranan: 0,
      sayfaTurleri: { anasayfa: 0, urun: 0, kategori: 0, icerik: 0, diger: 0 },
      skor: 0,
      kirilim: {},
      kritikSorun: 0,
      toplamSorun: 0,
      urunSkorOrtalamasi: null,
      kategoriSkorOrtalamasi: null,
      eticaretSkoru: null,
    };
  }

  // Kalıpları tespit et ve kaydet.
  const kaliplar = kaliplariTahminEt(tumSayfalar.map((s) => s.url));
  const urunKalibi = ayarlar?.product_url_pattern ?? kaliplar.urunKalibi;
  const kategoriKalibi = ayarlar?.category_url_pattern ?? kaliplar.kategoriKalibi;

  if (!ayarlar?.product_url_pattern && urunKalibi) {
    await supabase
      .from("project_settings")
      .update({ product_url_pattern: urunKalibi, category_url_pattern: kategoriKalibi })
      .eq("project_id", proje.id);
  }

  // Sayfa kayıtları
  const sayfaTurleri: Record<SayfaTuru, number> = {
    anasayfa: 0,
    urun: 0,
    kategori: 0,
    icerik: 0,
    diger: 0,
  };

  const sayfaKayitlari = tumSayfalar.map((s) => {
    const tur = sayfaTuruBelirle(s.url, { urunKalibi, kategoriKalibi });
    sayfaTurleri[tur]++;

    let yol = s.url;
    try {
      yol = new URL(s.url).pathname;
    } catch {
      /* adres ayrıştırılamadı */
    }

    return {
      project_id: proje.id,
      url: s.url,
      path: yol,
      page_type: tur,
      status_code: s.durum_kodu,
      title: s.title,
      title_length: s.title_uzunluk,
      meta_description: s.aciklama,
      meta_description_length: s.aciklama_uzunluk,
      h1: s.h1,
      h1_count: s.h1_sayisi,
      h2_count: s.h2_sayisi,
      word_count: s.kelime_sayisi,
      internal_links_count: s.ic_link,
      external_links_count: s.dis_link,
      images_count: s.gorsel_sayisi,
      images_without_alt: s.alt_metinsiz_gorsel,
      canonical_url: s.canonical,
      is_indexable: s.indekslenebilir,
      click_depth: s.tiklama_derinligi,
      is_orphan: s.yetim_mi,
      has_schema: s.schema_var_mi,
      schema_types: s.schema_turleri as never,
      load_time_ms: s.yuklenme_ms,
      onpage_score: s.onpage_skoru,
      checks: s.kontroller as never,
      last_crawled_at: new Date().toISOString(),
    };
  });

  await supabase.from("pages").upsert(sayfaKayitlari, { onConflict: "project_id,url" });

  // Sayfa kimliklerini al
  const { data: kayitliSayfalar } = await supabase
    .from("pages")
    .select("id, url, page_type")
    .eq("project_id", proje.id);

  const urlKimlik = new Map((kayitliSayfalar ?? []).map((s) => [s.url, s.id]));

  /* ---------------- Teknik sorunlar ---------------- */

  // Önce bu tarama öncesindeki açık sorunları çözüldü olarak işaretle,
  // yeniden bulunanlar tekrar açılacak.
  await supabase
    .from("technical_issues")
    .update({ status: "cozuldu", resolved_at: new Date().toISOString() })
    .eq("project_id", proje.id)
    .eq("status", "acik");

  const sorunlar: Record<string, unknown>[] = [];
  for (const s of tumSayfalar) {
    for (const tanim of SORUN_TANIMLARI) {
      if (!tanim.kosul(s)) continue;
      sorunlar.push({
        project_id: proje.id,
        page_id: urlKimlik.get(s.url) ?? null,
        url: s.url,
        code: tanim.kod,
        category: tanim.kategori,
        severity: tanim.onem,
        title: tanim.baslik,
        description: tanim.aciklama,
        recommendation: tanim.oneri,
        impact: tanim.etki,
        status: "acik",
        detected_at: new Date().toISOString(),
      });
    }
  }

  if (sorunlar.length) {
    // Aynı sayfa+kod için tekrar oluşmaması adına önce siliyoruz.
    await supabase.from("technical_issues").delete().eq("project_id", proje.id).eq("status", "cozuldu");
    for (let i = 0; i < sorunlar.length; i += 500) {
      await supabase.from("technical_issues").insert(sorunlar.slice(i, i + 500) as never);
    }
  }

  /* ---------------- Ürün ve kategori kayıtları ---------------- */

  const urunSayfalari = tumSayfalar.filter(
    (s) => sayfaTuruBelirle(s.url, { urunKalibi, kategoriKalibi }) === "urun",
  );
  const kategoriSayfalari = tumSayfalar.filter(
    (s) => sayfaTuruBelirle(s.url, { urunKalibi, kategoriKalibi }) === "kategori",
  );

  const urunSkorlari: number[] = [];
  if (urunSayfalari.length) {
    const kayitlar = urunSayfalari.map((s) => {
      const { skor, kontroller } = urunSkoru({
        ad: s.h1 ?? s.title,
        title: s.title,
        titleUzunluk: s.title_uzunluk,
        aciklamaUzunluk: s.kelime_sayisi ? s.kelime_sayisi * 6 : null,
        metaAciklamaUzunluk: s.aciklama_uzunluk,
        h1: s.h1,
        gorselSayisi: s.gorsel_sayisi,
        altMetinsizGorsel: s.alt_metinsiz_gorsel,
        ozellikSayisi: null,
        marka: null,
        gtin: null,
        mpn: null,
        sku: null,
        fiyat: null,
        stokDurumu: null,
        yorumSayisi: null,
        urunSchemaVarMi: s.schema_var_mi,
        breadcrumbVarMi: s.schema_var_mi,
        canonical: s.canonical,
        icLink: s.ic_link,
      });
      urunSkorlari.push(skor);

      return {
        project_id: proje.id,
        page_id: urlKimlik.get(s.url) ?? null,
        url: s.url,
        name: s.h1 ?? s.title,
        images_count: s.gorsel_sayisi,
        has_product_schema: s.schema_var_mi,
        has_breadcrumb: s.schema_var_mi,
        description_length: s.kelime_sayisi ? s.kelime_sayisi * 6 : null,
        seo_score: skor,
        checks: { kontroller } as never,
        last_analyzed_at: new Date().toISOString(),
      };
    });

    for (let i = 0; i < kayitlar.length; i += 500) {
      await supabase.from("products").upsert(kayitlar.slice(i, i + 500) as never, { onConflict: "project_id,url" });
    }
  }

  const kategoriSkorlari: number[] = [];
  if (kategoriSayfalari.length) {
    const kayitlar = kategoriSayfalari.map((s) => {
      const { skor, kontroller } = kategoriSkoru({
        title: s.title,
        titleUzunluk: s.title_uzunluk,
        metaAciklamaUzunluk: s.aciklama_uzunluk,
        h1: s.h1,
        aciklamaUzunluk: s.kelime_sayisi ? s.kelime_sayisi * 6 : null,
        urunSayisi: null,
        altKategoriSayisi: null,
        icLink: s.ic_link,
        hedefKelime: null,
      });
      kategoriSkorlari.push(skor);

      return {
        project_id: proje.id,
        page_id: urlKimlik.get(s.url) ?? null,
        url: s.url,
        name: s.h1 ?? s.title,
        description_length: s.kelime_sayisi ? s.kelime_sayisi * 6 : null,
        internal_links_count: s.ic_link,
        seo_score: skor,
        checks: { kontroller } as never,
        last_analyzed_at: new Date().toISOString(),
      };
    });

    for (let i = 0; i < kayitlar.length; i += 500) {
      await supabase.from("categories").upsert(kayitlar.slice(i, i + 500) as never, { onConflict: "project_id,url" });
    }
  }

  /* ---------------- Skorlar ---------------- */

  const sinyaller: SayfaSinyali[] = tumSayfalar.map((s) => ({
    durumKodu: s.durum_kodu,
    title: s.title,
    titleUzunluk: s.title_uzunluk,
    aciklama: s.aciklama,
    aciklamaUzunluk: s.aciklama_uzunluk,
    h1Sayisi: s.h1_sayisi,
    kelimeSayisi: s.kelime_sayisi,
    icLink: s.ic_link,
    gorselSayisi: s.gorsel_sayisi,
    altMetinsizGorsel: s.alt_metinsiz_gorsel,
    canonical: s.canonical,
    indekslenebilir: s.indekslenebilir,
    tiklamaDerinligi: s.tiklama_derinligi,
    yetimMi: s.yetim_mi,
    schemaVarMi: s.schema_var_mi,
  }));

  const { skor, kirilim } = teknikSkor(sinyaller);

  const ortalama = (liste: number[]) =>
    liste.length ? Math.round(liste.reduce((t, x) => t + x, 0) / liste.length) : null;

  const urunOrt = ortalama(urunSkorlari);
  const kategoriOrt = ortalama(kategoriSkorlari);
  const eticaret =
    urunOrt !== null || kategoriOrt !== null
      ? Math.round(((urunOrt ?? kategoriOrt)! * 0.65 + (kategoriOrt ?? urunOrt)! * 0.35))
      : null;

  /* ---------------- İç bağlantı grafiği ---------------- */

  // Bağlantı grafiği tarama görevinin üzerinden ücretsiz okunur. Grafik
  // olmadan bağlantı önerisi üretilemez; zaten var olan bağlantılar
  // önerilir. Hata hâlinde tarama sonucu yine de geçerlidir.
  try {
    const baglantilar = await icBaglantiGrafigi({ gorevId });
    if (baglantilar.length) {
      await baglantiGrafiginiKaydet(proje.id, baglantilar);
      await oneriUret(proje.id);
    }
  } catch (hata) {
    console.error("[teknik] iç bağlantı önerileri üretilemedi", {
      projeId: proje.id,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
  }

  return {
    taranan: tumSayfalar.length,
    sayfaTurleri,
    skor,
    kirilim: kirilim as unknown as Record<string, number>,
    kritikSorun: sorunlar.filter((s) => s.severity === "kritik").length,
    toplamSorun: sorunlar.length,
    urunSkorOrtalamasi: urunOrt,
    kategoriSkorOrtalamasi: kategoriOrt,
    eticaretSkoru: eticaret,
  };
}
