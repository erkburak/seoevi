import "server-only";

import { aiJson, SISTEM_TEMELI } from "@/lib/ai/saglayici";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { sayi } from "@/lib/utils";
import type { AiOnerisi, Proje } from "@/types/database";

/**
 * Yapay zekâ görevleri.
 * Her görev, platformdaki gerçek veriyi bağlam olarak modele iletir.
 */

type HamOneri = {
  ozet: string;
  neden: string[];
  oneriler: { baslik: string; icerik: string }[];
  onerilen_title?: string;
  onerilen_aciklama?: string;
};

function oneriyeCevir(ham: HamOneri): AiOnerisi {
  return {
    ozet: ham.ozet,
    neden: Array.isArray(ham.neden) ? ham.neden.slice(0, 5) : [],
    oneriler: Array.isArray(ham.oneriler) ? ham.oneriler.slice(0, 6) : [],
    onerilen_title: ham.onerilen_title,
    onerilen_aciklama: ham.onerilen_aciklama,
    uretildi: new Date().toISOString(),
  };
}

const JSON_SEMASI = `{
  "ozet": "Tek cümlelik durum özeti",
  "neden": ["Sorunun nedenleri, en fazla 4 madde"],
  "oneriler": [{ "baslik": "Kısa başlık", "icerik": "Ne yapılacağı, tek paragraf" }],
  "onerilen_title": "Varsa önerilen sayfa başlığı, yoksa alanı yazma",
  "onerilen_aciklama": "Varsa önerilen meta açıklama, yoksa alanı yazma"
}`;

/* ------------------------------------------------------------------ */
/* 1. Aksiyonu çöz                                                     */
/* ------------------------------------------------------------------ */

export async function aksiyonuCoz({
  aksiyonId,
  proje,
}: {
  aksiyonId: string;
  proje: Proje;
}): Promise<AiOnerisi> {
  const supabase = yoneticiIstemcisi();

  const { data: aksiyon } = await supabase
    .from("seo_actions")
    .select("*")
    .eq("id", aksiyonId)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!aksiyon) throw new Error("Aksiyon bulunamadı.");

  // Aksiyonun kaynağındaki gerçek sayfa verisini bağlama ekle.
  const urller = (aksiyon.source_urls as string[]) ?? [];
  const { data: sayfalar } = urller.length
    ? await supabase
        .from("pages")
        .select("url, title, meta_description, h1, word_count, page_type, seo_score")
        .eq("project_id", proje.id)
        .in("url", urller.slice(0, 8))
    : { data: [] };

  const bağlam = `
Mağaza: ${proje.domain} (${proje.site_type})
Hedef: ${proje.primary_goal ?? "belirtilmemiş"}

Aksiyon: ${aksiyon.title}
Kategori: ${aksiyon.category}
Öncelik: ${aksiyon.priority}
Etkilenen sayfa sayısı: ${sayi(aksiyon.affected_count)}
Mevcut öneri: ${aksiyon.recommendation ?? "yok"}

Örnek sayfalar:
${(sayfalar ?? [])
  .map(
    (s) =>
      `- ${s.url}\n  Başlık: ${s.title ?? "YOK"}\n  Açıklama: ${s.meta_description ?? "YOK"}\n  H1: ${s.h1 ?? "YOK"}\n  Kelime sayısı: ${s.word_count ?? 0}\n  Sayfa türü: ${s.page_type}`,
  )
  .join("\n")}
`.trim();

  const ham = await aiJson<HamOneri>({
    sistem: `${SISTEM_TEMELI}

Görevin: Verilen SEO aksiyonunu kullanıcının kendi verisine bakarak açıklamak ve uygulanabilir bir çözüm önermek.
Önerilerin doğrudan bu mağazanın sayfalarına ait olmalı; genel geçer tavsiye verme.
Başlık önerirken Türkçe e-ticarette işe yarayan kalıpları kullan ve 60 karakteri aşma.

Yanıt şeması:
${JSON_SEMASI}`,
    kullanici: bağlam,
  });

  const oneri = oneriyeCevir(ham);

  await supabase.from("seo_actions").update({ ai_suggestion: oneri as never }).eq("id", aksiyonId);

  return oneri;
}

/* ------------------------------------------------------------------ */
/* 2. Sayfa neden düşük performanslı                                   */
/* ------------------------------------------------------------------ */

export async function sayfayiAnaliz({
  sayfaId,
  proje,
}: {
  sayfaId: string;
  proje: Proje;
}): Promise<AiOnerisi> {
  const supabase = yoneticiIstemcisi();

  const { data: sayfa } = await supabase
    .from("pages")
    .select("*")
    .eq("id", sayfaId)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!sayfa) throw new Error("Sayfa bulunamadı.");

  const [{ data: sorunlar }, { data: siralamalar }] = await Promise.all([
    supabase
      .from("technical_issues")
      .select("title, severity, recommendation")
      .eq("page_id", sayfaId)
      .eq("status", "acik")
      .limit(15),
    supabase
      .from("keyword_rankings")
      .select("position, keywords(keyword, search_volume)")
      .eq("project_id", proje.id)
      .eq("url", sayfa.url)
      .eq("is_competitor", false)
      .order("position", { ascending: true })
      .limit(10),
  ]);

  type SiralamaSatiri = {
    position: number | null;
    keywords: { keyword: string; search_volume: number | null } | { keyword: string; search_volume: number | null }[] | null;
  };

  const kelimeMetni = ((siralamalar ?? []) as unknown as SiralamaSatiri[])
    .map((s) => {
      const k = Array.isArray(s.keywords) ? s.keywords[0] : s.keywords;
      return k ? `- ${k.keyword}: ${s.position}. sıra, ${sayi(k.search_volume ?? 0)} aylık arama` : null;
    })
    .filter(Boolean)
    .join("\n");

  const bağlam = `
Mağaza: ${proje.domain}
Sayfa: ${sayfa.url}
Sayfa türü: ${sayfa.page_type}
Başlık: ${sayfa.title ?? "YOK"} (${sayfa.title_length ?? 0} karakter)
Meta açıklama: ${sayfa.meta_description ?? "YOK"} (${sayfa.meta_description_length ?? 0} karakter)
H1: ${sayfa.h1 ?? "YOK"}
Kelime sayısı: ${sayfa.word_count ?? 0}
İç bağlantı: ${sayfa.internal_links_count ?? 0}
Yapısal veri: ${sayfa.has_schema ? "var" : "yok"}
Tıklama derinliği: ${sayfa.click_depth ?? "bilinmiyor"}
İndekslenebilir: ${sayfa.is_indexable === false ? "hayır" : "evet"}

Açık teknik sorunlar:
${(sorunlar ?? []).map((s) => `- [${s.severity}] ${s.title}`).join("\n") || "yok"}

Bu sayfanın sıralandığı kelimeler:
${kelimeMetni || "Bu sayfa henüz hiçbir kelimede sıralanmıyor."}
`.trim();

  const ham = await aiJson<HamOneri>({
    sistem: `${SISTEM_TEMELI}

Görevin: Bu sayfanın arama performansının neden düşük olduğunu verilere dayanarak açıklamak ve somut düzeltmeler önermek.
Sayfanın sıralandığı kelimeleri dikkate alarak yeni bir başlık ve meta açıklama öner.
Başlık en fazla 60, açıklama en fazla 155 karakter olsun.

Yanıt şeması:
${JSON_SEMASI}`,
    kullanici: bağlam,
  });

  return oneriyeCevir(ham);
}

/* ------------------------------------------------------------------ */
/* 3. Ürün sayfası önerisi                                             */
/* ------------------------------------------------------------------ */

export async function urunuAnaliz({
  urunId,
  proje,
}: {
  urunId: string;
  proje: Proje;
}): Promise<AiOnerisi> {
  const supabase = yoneticiIstemcisi();

  const { data: urun } = await supabase
    .from("products")
    .select("*, pages(title, meta_description, h1, word_count)")
    .eq("id", urunId)
    .eq("project_id", proje.id)
    .maybeSingle();

  if (!urun) throw new Error("Ürün bulunamadı.");

  const sayfa = Array.isArray(urun.pages) ? urun.pages[0] : urun.pages;
  const kontroller = (urun.checks as { kontroller?: { ad: string; gecti: boolean; oneri: string }[] })?.kontroller ?? [];
  const eksikler = kontroller.filter((k) => !k.gecti);

  const bağlam = `
Mağaza: ${proje.domain}
Ürün adresi: ${urun.url}
Ürün adı: ${urun.name ?? "bilinmiyor"}
Marka: ${urun.brand ?? "YOK"}
Fiyat: ${urun.price ?? "YOK"}
GTIN: ${urun.gtin ?? "YOK"}
Ürün schema: ${urun.has_product_schema ? "var" : "yok"}
SEO skoru: ${urun.seo_score ?? 0}/100
Sayfa başlığı: ${sayfa?.title ?? "YOK"}
Meta açıklama: ${sayfa?.meta_description ?? "YOK"}
H1: ${sayfa?.h1 ?? "YOK"}
Metin uzunluğu: ${sayfa?.word_count ?? 0} kelime

Karşılanmayan kontroller:
${eksikler.map((k) => `- ${k.ad}: ${k.oneri}`).join("\n") || "yok"}
`.trim();

  const ham = await aiJson<HamOneri>({
    sistem: `${SISTEM_TEMELI}

Görevin: Bu ürün sayfasının arama ve Google Alışveriş görünürlüğünü artıracak somut düzeltmeleri sıralamak.
Türkçe e-ticaret aramalarında işe yarayan başlık kalıplarını kullan (marka + model + ayırt edici özellik + "Fiyatı" gibi).
Başlık en fazla 60, açıklama en fazla 155 karakter olsun.

Yanıt şeması:
${JSON_SEMASI}`,
    kullanici: bağlam,
  });

  return oneriyeCevir(ham);
}

/* ------------------------------------------------------------------ */
/* 4. İçerik stratejisi                                                */
/* ------------------------------------------------------------------ */

export type IcerikStratejisi = {
  arama_amaci: string;
  onerilen_baslik: string;
  alt_basliklar: string[];
  konular: string[];
  sorular: string[];
  ic_baglanti_onerileri: string[];
  ozet: string;
};

export async function icerikStratejisiUret({
  keyword,
  proje,
  serpBaslıklari = [],
  sorular = [],
  ortalamaKelime,
}: {
  keyword: string;
  proje: Proje;
  serpBaslıklari?: string[];
  sorular?: string[];
  ortalamaKelime?: number | null;
}): Promise<IcerikStratejisi> {
  const supabase = yoneticiIstemcisi();

  const { data: kelime } = await supabase
    .from("keywords")
    .select("search_volume, difficulty, intent")
    .eq("project_id", proje.id)
    .eq("keyword", keyword)
    .maybeSingle();

  const { data: kategoriler } = await supabase
    .from("categories")
    .select("url, name")
    .eq("project_id", proje.id)
    .limit(12);

  const bağlam = `
Mağaza: ${proje.domain} (${proje.site_type})
Hedef anahtar kelime: ${keyword}
Aylık arama hacmi: ${sayi(kelime?.search_volume ?? 0)}
Zorluk: ${kelime?.difficulty ?? "bilinmiyor"}
Arama amacı: ${kelime?.intent ?? "bilinmiyor"}
Rakip sayfaların ortalama uzunluğu: ${ortalamaKelime ? `${sayi(ortalamaKelime)} kelime` : "bilinmiyor"}

Arama sonuçlarındaki başlıklar:
${serpBaslıklari.slice(0, 10).map((b) => `- ${b}`).join("\n") || "veri yok"}

Kullanıcıların sorduğu sorular:
${sorular.slice(0, 8).map((s) => `- ${s}`).join("\n") || "veri yok"}

Sitedeki kategoriler (iç bağlantı için):
${(kategoriler ?? []).map((k) => `- ${k.name ?? k.url} (${k.url})`).join("\n") || "veri yok"}
`.trim();

  return aiJson<IcerikStratejisi>({
    sistem: `${SISTEM_TEMELI}

Görevin: Bu anahtar kelime için bir içerik planı çıkarmak.
Rakip başlıklarındaki ortak konuları yakala, eksik kalan açıları öner.
İç bağlantı önerilerini yalnızca verilen kategori adreslerinden seç.

Yanıt şeması:
{
  "arama_amaci": "Kullanıcının bu aramada ne aradığı, tek cümle",
  "onerilen_baslik": "Sayfa başlığı, en fazla 60 karakter",
  "alt_basliklar": ["H2 başlıkları, 5-8 madde"],
  "konular": ["Mutlaka ele alınması gereken konular"],
  "sorular": ["Cevaplanması gereken sorular"],
  "ic_baglanti_onerileri": ["Bağlantı verilecek adresler"],
  "ozet": "İçeriğin nasıl farklılaşacağı, iki cümle"
}`,
    kullanici: bağlam,
  });
}

/* ------------------------------------------------------------------ */
/* 5. Başlık ve açıklama üretimi (ücretsiz araçlar)                    */
/* ------------------------------------------------------------------ */

export type MetaOnerisi = { oneriler: { metin: string; uzunluk: number; not: string }[] };

export async function metaUret({
  tur,
  konu,
  anahtarKelime,
  marka,
}: {
  tur: "title" | "description";
  konu: string;
  anahtarKelime?: string;
  marka?: string;
}): Promise<MetaOnerisi> {
  const sinir = tur === "title" ? 60 : 155;
  const ad = tur === "title" ? "sayfa başlığı" : "meta açıklama";

  return aiJson<MetaOnerisi>({
    sistem: `${SISTEM_TEMELI}

Görevin: Türkçe e-ticaret siteleri için ${ad} önerileri üretmek.
Her öneri en fazla ${sinir} karakter olmalı. Anahtar kelimeyi başa yerleştir.
Birbirinden farklı 5 öneri ver: biri fiyat odaklı, biri model/çeşit odaklı, biri fayda odaklı olsun.

Yanıt şeması:
{ "oneriler": [{ "metin": "...", "uzunluk": 58, "not": "Neden işe yarar, kısa" }] }`,
    kullanici: `Sayfa konusu: ${konu}
Hedef anahtar kelime: ${anahtarKelime || konu}
Marka: ${marka || "belirtilmemiş"}`,
    azamiJeton: 1200,
  });
}
