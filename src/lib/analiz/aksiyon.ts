import "server-only";

import { pazaryeriRadariCalistir } from "@/lib/analiz/pazaryeri";
import { stokCakismalariniBul } from "@/lib/analiz/stok";
import { etkiSeviyesi } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sayi } from "@/lib/utils";
import type { Etki, Oncelik, Onem, Proje, SayfaTuru, Zorluk } from "@/types/database";

/**
 * Aksiyon üretimi.
 *
 * Bulguları tek tek listelemek yerine anlamlı gruplara toplar ve
 * "şimdi ne yapmalıyım" sorusuna cevap veren bir liste üretir.
 */

const SAYFA_TURU_ADI: Record<SayfaTuru, string> = {
  anasayfa: "ana sayfa",
  urun: "ürün sayfası",
  kategori: "kategori sayfası",
  icerik: "içerik sayfası",
  diger: "sayfa",
};

const ONEM_ONCELIK: Record<Onem, Oncelik> = {
  kritik: "kritik",
  uyari: "yuksek",
  bilgi: "orta",
};

const KOD_ZORLUK: Record<string, Zorluk> = {
  title_eksik: "kolay",
  title_kisa: "kolay",
  title_uzun: "kolay",
  aciklama_eksik: "kolay",
  aciklama_uzun: "kolay",
  h1_eksik: "kolay",
  h1_coklu: "kolay",
  alt_metin_eksik: "kolay",
  canonical_eksik: "orta",
  indekslenemez: "orta",
  hatali_durum: "orta",
  schema_eksik: "zor",
  ince_icerik: "zor",
  yetim_sayfa: "orta",
  derin_sayfa: "zor",
  ic_link_az: "orta",
};

const KATEGORI_ADI: Record<string, string> = {
  meta: "teknik",
  baslik: "icerik",
  tarama: "teknik",
  indeksleme: "teknik",
  link: "teknik",
  gorsel: "teknik",
  schema: "teknik",
  mimari: "teknik",
};

export type AksiyonUretimSonucu = {
  olusturulan: number;
  kritik: number;
};

/**
 * Bir aksiyonda saklanacak azami adres.
 *
 * Kullanıcı "hangi sayfalar" sorusunun cevabını burada arar; sekiz adres
 * göstermek işi yapılamaz kılar. Sınır yalnızca kaydın makul boyutta
 * kalması için vardır.
 */
const AZAMI_ADRES = 200;

export async function aksiyonlariUret(proje: Proje): Promise<AksiyonUretimSonucu> {
  const supabase = yoneticiIstemcisi();

  // Tamamlanmış aksiyonlar korunur; yalnızca bekleyenler yenilenir.
  await supabase
    .from("seo_actions")
    .delete()
    .eq("project_id", proje.id)
    .eq("status", "bekliyor");

  const aksiyonlar: Record<string, unknown>[] = [];

  /* ---------------- 1. Teknik sorunlar ---------------- */

  const { data: sorunlar } = await supabase
    .from("technical_issues")
    .select("code, category, severity, title, recommendation, url, page_id, pages(page_type)")
    .eq("project_id", proje.id)
    .eq("status", "acik")
    .limit(5000);

  type SorunSatiri = {
    code: string;
    category: string;
    severity: Onem;
    title: string;
    recommendation: string | null;
    url: string | null;
    pages: { page_type: SayfaTuru } | { page_type: SayfaTuru }[] | null;
  };

  const gruplar = new Map<
    string,
    { sorun: SorunSatiri; urller: string[]; sayfaTuru: SayfaTuru }
  >();

  for (const ham of (sorunlar ?? []) as unknown as SorunSatiri[]) {
    const sayfa = Array.isArray(ham.pages) ? ham.pages[0] : ham.pages;
    const sayfaTuru = sayfa?.page_type ?? "diger";
    const anahtar = `${ham.code}:${sayfaTuru}`;

    const mevcut = gruplar.get(anahtar);
    if (mevcut) {
      if (ham.url) mevcut.urller.push(ham.url);
    } else {
      gruplar.set(anahtar, { sorun: ham, urller: ham.url ? [ham.url] : [], sayfaTuru });
    }
  }

  // Yüksek trafik potansiyeli olan sayfaları belirle
  const { data: firsatliSayfalar } = await supabase
    .from("keyword_opportunities")
    .select("keyword_id, score, keywords(keyword)")
    .eq("project_id", proje.id)
    .gte("score", 65)
    .limit(500);

  const yuksekPotansiyelSayisi = (firsatliSayfalar ?? []).length;

  for (const [anahtar, grup] of gruplar) {
    const adet = grup.urller.length || 1;
    const etki = etkiSeviyesi(adet, 0);
    const sayfaAdi = SAYFA_TURU_ADI[grup.sayfaTuru];

    const baslik =
      grup.sayfaTuru === "diger"
        ? `${sayi(adet)} sayfada ${grup.sorun.title.toLocaleLowerCase("tr-TR")}`
        : `${sayi(adet)} ${sayfaAdi}nda ${grup.sorun.title.toLocaleLowerCase("tr-TR")}`;

    aksiyonlar.push({
      project_id: proje.id,
      title: baslik,
      description: grup.sorun.recommendation,
      recommendation: grup.sorun.recommendation,
      category: KATEGORI_ADI[grup.sorun.category] ?? grup.sorun.category,
      priority: ONEM_ONCELIK[grup.sorun.severity],
      impact: etki,
      effort: KOD_ZORLUK[grup.sorun.code] ?? "orta",
      status: "bekliyor",
      affected_count: adet,
      source_urls: grup.urller.slice(0, AZAMI_ADRES) as never,
      dedupe_key: anahtar,
      data: { kod: grup.sorun.code, sayfa_turu: grup.sayfaTuru } as never,
    });
  }

  /* ---------------- 2. Hızlı kazanım kelimeleri ---------------- */

  const { data: hizliKazanimlar } = await supabase
    .from("keyword_opportunities")
    .select("score, potential_traffic, current_position, keywords(keyword)")
    .eq("project_id", proje.id)
    .eq("opportunity_type", "hizli_kazanim")
    .eq("status", "acik")
    .order("score", { ascending: false })
    .limit(100);

  if (hizliKazanimlar?.length) {
    const toplamTrafik = hizliKazanimlar.reduce((t, k) => t + (k.potential_traffic ?? 0), 0);
    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(hizliKazanimlar.length)} anahtar kelime 11-30. sıralar arasında`,
      description:
        "Bu kelimeler ilk sayfaya çok yakın. İçerik güncellemesi ve iç bağlantı ile kısa sürede kazanç sağlanabilir.",
      recommendation:
        "Sıralayan sayfaların başlığını hedef kelimeyle güçlendirin, içeriği güncelleyin ve güçlü sayfalardan iç bağlantı verin.",
      category: "keyword",
      priority: "yuksek" as Oncelik,
      impact: etkiSeviyesi(hizliKazanimlar.length, toplamTrafik) as Etki,
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: hizliKazanimlar.length,
      dedupe_key: "hizli_kazanim",
      data: { tahmini_trafik: toplamTrafik } as never,
    });
  }

  /* ---------------- 3. Rakip açığı ---------------- */

  const { count: rakipAcigi } = await supabase
    .from("keyword_opportunities")
    .select("id", { count: "exact", head: true })
    .eq("project_id", proje.id)
    .eq("opportunity_type", "rakip_acigi")
    .eq("status", "acik");

  if (rakipAcigi && rakipAcigi > 0) {
    aksiyonlar.push({
      project_id: proje.id,
      title: `Rakiplerinizin önde olduğu ${sayi(rakipAcigi)} kelime bulundu`,
      description:
        "Rakipleriniz bu kelimelerde sizden önde sıralanıyor. Düşük rekabetli olanlardan başlamak en hızlı sonucu verir.",
      recommendation:
        "Rakip Analizi ekranından kelime boşluğunu inceleyin; ticari niyeti yüksek ve rekabeti düşük kelimelere öncelik verin.",
      category: "keyword",
      priority: "yuksek" as Oncelik,
      impact: etkiSeviyesi(rakipAcigi, 0) as Etki,
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: rakipAcigi,
      dedupe_key: "rakip_acigi",
      data: {} as never,
    });
  }

  /* ---------------- 4. Zayıf ürün sayfaları ---------------- */

  const { data: zayifUrunler, count: zayifUrunSayisi } = await supabase
    .from("products")
    .select("url, seo_score", { count: "exact" })
    .eq("project_id", proje.id)
    .lt("seo_score", 60)
    .order("seo_score", { ascending: true })
    .limit(AZAMI_ADRES);

  if (zayifUrunSayisi && zayifUrunSayisi > 0) {
    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(zayifUrunSayisi)} ürün sayfasının SEO skoru 60'ın altında`,
      description:
        "Bu ürün sayfalarında başlık, açıklama, yapısal veri veya görsel eksikleri var. Ürün sayfaları satışa en yakın sayfalardır.",
      recommendation:
        "Ürün SEO ekranından en düşük skorlu sayfalardan başlayın; önce yapısal veri ve başlık düzeltmelerini yapın.",
      category: "urun",
      priority: "kritik" as Oncelik,
      impact: etkiSeviyesi(zayifUrunSayisi, 0) as Etki,
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: zayifUrunSayisi,
      source_urls: (zayifUrunler ?? []).map((u) => u.url).slice(0, AZAMI_ADRES) as never,
      dedupe_key: "zayif_urun",
      data: {} as never,
    });
  }

  /* ---------------- 5. Zayıf kategori sayfaları ---------------- */

  const { data: zayifKategoriler, count: zayifKategoriSayisi } = await supabase
    .from("categories")
    .select("url, seo_score", { count: "exact" })
    .eq("project_id", proje.id)
    .lt("seo_score", 60)
    .order("seo_score", { ascending: true })
    .limit(AZAMI_ADRES);

  if (zayifKategoriSayisi && zayifKategoriSayisi > 0) {
    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(zayifKategoriSayisi)} kategori sayfasında içerik fırsatı`,
      description:
        "Kategori sayfalarınızda özgün metin ve iç bağlantı eksik. Kategori sayfaları en yüksek hacimli kelimeleri hedefler.",
      recommendation:
        "Her kategoriye tek bir hedef kelime atayın ve 400+ karakterlik seçim rehberi metni ekleyin.",
      category: "kategori",
      priority: "yuksek" as Oncelik,
      impact: etkiSeviyesi(zayifKategoriSayisi, 0) as Etki,
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: zayifKategoriSayisi,
      source_urls: (zayifKategoriler ?? []).map((k) => k.url).slice(0, AZAMI_ADRES) as never,
      dedupe_key: "zayif_kategori",
      data: {} as never,
    });
  }

  /* ---------------- 6. Merchant eksikleri ---------------- */

  const { data: merchant } = await supabase
    .from("merchant_audits")
    .select("missing_fields, health_score")
    .eq("project_id", proje.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (merchant && (merchant.health_score ?? 100) < 80) {
    const eksikler = (merchant.missing_fields as string[]) ?? [];
    aksiyonlar.push({
      project_id: proje.id,
      title: `Google Alışveriş için eksik ürün alanları var`,
      description: eksikler.length
        ? `Eksik alanlar: ${eksikler.join(", ")}. Bu alanlar olmadan ürünleriniz Alışveriş sonuçlarında eşleşmiyor.`
        : "Merchant sağlık skorunuz düşük.",
      recommendation:
        "Öncelikle GTIN ve marka alanlarını doldurun; bunlar Alışveriş eşleştirmesinin en güçlü sinyalleridir.",
      category: "merchant",
      priority: "yuksek" as Oncelik,
      impact: "yuksek" as Etki,
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: eksikler.length || 1,
      dedupe_key: "merchant_eksik",
      data: { eksikler } as never,
    });
  }

  /* ---------------- 7. Stok–sıralama çakışması ---------------- */
  /*
   * E-ticarette sessizce en çok para kaybettiren durum: ürün Google'da
   * sıralanıyor, trafik alıyor, ama stokta yok. Ziyaretçi boş dönüyor.
   */
  const stok = await stokCakismalariniBul({ proje, limit: 50 });

  if (stok.cakisanUrun > 0) {
    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(stok.cakisanUrun)} ürün sıralanıyor ama stokta yok`,
      description:
        `Bu ürünler Google'da toplam ${sayi(stok.toplamKelime)} kelimede sıralanıyor ve ayda ` +
        `yaklaşık ${sayi(stok.toplamKayipZiyaret)} ziyaret alıyor. Ziyaretçiler geliyor ama ` +
        `satın alamıyor; artan hemen çıkma oranı zamanla sıralamayı da düşürür.`,
      recommendation:
        "Stoğu yakında gelecek ürünlerde sayfayı açık tutup 'tükendi, haber ver' formu ekleyin. " +
        "Kalıcı olarak tükenen ürünlerde sayfayı silmek yerine en yakın alternatife 301 yönlendirin; " +
        "böylece biriken sıralama gücü korunur.",
      category: "eticaret",
      priority: (stok.toplamKayipZiyaret > 200 ? "kritik" : "yuksek") as Oncelik,
      impact: etkiSeviyesi(stok.cakisanUrun, stok.toplamKayipZiyaret),
      effort: "orta" as Zorluk,
      status: "bekliyor",
      affected_count: stok.cakisanUrun,
      source_urls: stok.satirlar.slice(0, AZAMI_ADRES).map((s) => s.url) as never,
      dedupe_key: "stok_cakismasi",
      data: {
        kayip_ziyaret: stok.toplamKayipZiyaret,
        kelime_sayisi: stok.toplamKelime,
      } as never,
    });
  }

  /* ---------------- 8. Pazaryeri baskısı ---------------- */
  /*
   * Türkiye'ye özgü asıl rekabet: kendi ürününüzde pazaryerinin sizi
   * geçmesi. Satış oluyor ama komisyonlu kanaldan; bu doğrudan kâr kaybı.
   */
  const radar = await pazaryeriRadariCalistir({ proje });

  if (radar.baskiAltindaKelime > 0 && radar.oyuncuOzeti.length) {
    const enGuclu = radar.oyuncuOzeti[0];
    const pazaryerleri = radar.oyuncuOzeti.filter((o) => o.tur === "pazaryeri");

    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(radar.baskiAltindaKelime)} kelimede pazaryeri sizin üstünüzde`,
      description:
        `En baskın oyuncu ${enGuclu.ad}: ${sayi(enGuclu.ustteKelime)} kelimede sizden önde. ` +
        `Toplamda ayda yaklaşık ${sayi(radar.toplamKayip)} ziyaret bu nedenle kaybediliyor.` +
        (pazaryerleri.length
          ? ` Bu kelimelerde satış olmuyor değil — komisyonlu kanaldan oluyor.`
          : ""),
      recommendation:
        "Pazaryerinin geçemeyeceği alanlara yüklenin: ürün sayfanızda daha derin teknik özellik, " +
        "gerçek kullanıcı yorumu, karşılaştırma tablosu ve kullanım rehberi bulundurun. " +
        "Marka + model aramalarında kendi sayfanızın öne çıkması için yapısal veriyi eksiksiz tamamlayın.",
      category: "rakip",
      priority: (radar.toplamKayip > 300 ? "kritik" : "yuksek") as Oncelik,
      impact: etkiSeviyesi(radar.baskiAltindaKelime, radar.toplamKayip),
      effort: "zor" as Zorluk,
      status: "bekliyor",
      affected_count: radar.baskiAltindaKelime,
      dedupe_key: "pazaryeri_baskisi",
      data: {
        toplam_kayip: radar.toplamKayip,
        oyuncular: radar.oyuncuOzeti.slice(0, 8),
      } as never,
    });
  }

  /* ---------------- 9. İç bağlantı fırsatları ---------------- */
  /*
   * İç bağlantı, dış bağlantının aksine tamamen kendi kontrolünüzdedir:
   * ücretsiz, hızlı ve kimseden izin gerektirmez. Bu yüzden aksiyon
   * listesinde "kolay" iş olarak yer alır.
   */
  const { data: baglantiOnerileri } = await supabase
    .from("link_suggestions")
    .select("hedef_url, hedef_pozisyon, skor")
    .eq("project_id", proje.id)
    .eq("durum", "yeni")
    .order("skor", { ascending: false })
    .limit(500);

  if (baglantiOnerileri?.length) {
    const hedefler = new Set(baglantiOnerileri.map((o) => o.hedef_url));
    const vurmaMesafesi = baglantiOnerileri.filter(
      (o) => o.hedef_pozisyon !== null && Number(o.hedef_pozisyon) > 10 && Number(o.hedef_pozisyon) <= 20,
    ).length;

    aksiyonlar.push({
      project_id: proje.id,
      title: `${sayi(hedefler.size)} sayfanız iç bağlantıyla yukarı taşınabilir`,
      description:
        `${sayi(baglantiOnerileri.length)} bağlantı fırsatı bulundu.` +
        (vurmaMesafesi > 0
          ? ` Bunların ${sayi(vurmaMesafesi)} tanesi ikinci sayfada takılı kalmış sayfalara ait — ilk sayfaya en yakın kazanç burada.`
          : ""),
      recommendation:
        "İç Bağlantı sayfasındaki önerileri açın: her biri hangi sayfaya girip hangi metinle " +
        "nereye bağlantı vereceğinizi söyler. Bağlantı metnini hedef sayfanın kelimesinden seçin, " +
        "aynı metni tekrar tekrar kullanmayın.",
      category: "teknik",
      priority: (vurmaMesafesi >= 5 ? "yuksek" : "orta") as Oncelik,
      impact: etkiSeviyesi(hedefler.size, 0),
      effort: "kolay" as Zorluk,
      status: "bekliyor",
      affected_count: hedefler.size,
      source_urls: [...hedefler].slice(0, AZAMI_ADRES) as never,
      dedupe_key: "ic_baglanti_firsati",
      data: { oneri_sayisi: baglantiOnerileri.length, vurma_mesafesi: vurmaMesafesi } as never,
    });
  }

  /* ---------------- Kaydet ---------------- */

  if (!aksiyonlar.length) {
    return { olusturulan: 0, kritik: 0 };
  }

  void yuksekPotansiyelSayisi;

  /*
   * Toplu ekle-veya-güncelle işleminde tüm satırların aynı alan kümesini
   * taşıması gerekir: bir alan yalnızca bazı satırlarda varsa, diğerleri
   * için sütun varsayılanı DEĞİL açık NULL yazılır ve NOT NULL kısıtı
   * ihlal edilir. Bu yüzden varsayılanlar burada tamamlanır.
   */
  const kayitlar = aksiyonlar.map((a) => ({
    source_urls: [] as never,
    data: {} as never,
    affected_count: 1,
    status: "bekliyor",
    ...a,
  }));

  for (let i = 0; i < kayitlar.length; i += 200) {
    const { error } = await supabase
      .from("seo_actions")
      .upsert(kayitlar.slice(i, i + 200) as never, { onConflict: "project_id,dedupe_key" });
    if (error) {
      console.error("[aksiyon] kayıt hatası", { mesaj: error.message });
    }
  }

  return {
    olusturulan: aksiyonlar.length,
    kritik: aksiyonlar.filter((a) => a.priority === "kritik").length,
  };
}
