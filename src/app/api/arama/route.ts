import { NextResponse, type NextRequest } from "next/server";

import { ARAMA_HEDEFLERI } from "@/config/navigation";
import { aktifProjeGetir } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { urlYolu } from "@/lib/utils";

export type AramaSonucu = {
  tur: string;
  turAdi: string;
  baslik: string;
  altMetin: string | null;
  href: string;
};

/** Türkçe karakterleri sadeleştirip küçük harfe çevirir. */
function sadelestir(metin: string): string {
  const harita: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", I: "i", İ: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return metin
    .split("")
    .map((c) => harita[c] ?? c)
    .join("")
    .toLowerCase();
}

/**
 * Modül ve sayfa eşleşmeleri.
 * Kullanıcının analiz verisi henüz oluşmamışken bile arama sonuç üretir.
 */
function sayfaEslesmeleri(sorgu: string): AramaSonucu[] {
  const q = sadelestir(sorgu);

  return ARAMA_HEDEFLERI.filter((h) => {
    if (sadelestir(h.baslik).includes(q)) return true;
    if (sadelestir(h.aciklama).includes(q)) return true;
    return h.terimler.some((t) => sadelestir(t).includes(q));
  })
    .slice(0, 5)
    .map((h) => ({
      tur: "sayfa_gecis",
      turAdi: "Sayfa",
      baslik: h.baslik,
      altMetin: h.aciklama,
      href: h.href,
    }));
}

/**
 * Platform içi genel arama.
 * Aktif projedeki anahtar kelime, sayfa, ürün, rakip ve aksiyonlarda arar.
 */
export async function GET(istek: NextRequest) {
  const sorgu = (istek.nextUrl.searchParams.get("q") ?? "").trim();
  if (sorgu.length < 2) return NextResponse.json({ sonuclar: [] });

  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ hata: "Oturum bulunamadı." }, { status: 401 });

  const sayfalarSonucu = sayfaEslesmeleri(sorgu);

  const { aktif } = await aktifProjeGetir(user.id);
  if (!aktif) return NextResponse.json({ sonuclar: sayfalarSonucu });

  const kalip = `%${sorgu}%`;

  const [kelimeler, sayfalar, urunler, kategoriler, rakipler, aksiyonlar] = await Promise.all([
    supabase
      .from("keywords")
      .select("id, keyword, search_volume")
      .eq("project_id", aktif.id)
      .ilike("keyword", kalip)
      .order("search_volume", { ascending: false, nullsFirst: false })
      .limit(6),
    supabase
      .from("pages")
      .select("id, url, title")
      .eq("project_id", aktif.id)
      .or(`url.ilike.${kalip},title.ilike.${kalip}`)
      .limit(5),
    supabase
      .from("products")
      .select("id, url, name, seo_score")
      .eq("project_id", aktif.id)
      .or(`url.ilike.${kalip},name.ilike.${kalip}`)
      .limit(5),
    supabase
      .from("categories")
      .select("id, url, name")
      .eq("project_id", aktif.id)
      .or(`url.ilike.${kalip},name.ilike.${kalip}`)
      .limit(4),
    supabase
      .from("competitors")
      .select("id, domain")
      .eq("project_id", aktif.id)
      .ilike("domain", kalip)
      .limit(4),
    supabase
      .from("seo_actions")
      .select("id, title, category")
      .eq("project_id", aktif.id)
      .ilike("title", kalip)
      .limit(4),
  ]);

  const sonuclar: AramaSonucu[] = [
    ...sayfalarSonucu,
    ...(kelimeler.data ?? []).map((k) => ({
      tur: "kelime",
      turAdi: "Anahtar kelime",
      baslik: k.keyword,
      altMetin: k.search_volume ? `${new Intl.NumberFormat("tr-TR").format(k.search_volume)} aylık arama` : null,
      href: `/anahtar-kelimeler/${k.id}`,
    })),
    ...(urunler.data ?? []).map((u) => ({
      tur: "urun",
      turAdi: "Ürün",
      baslik: u.name ?? urlYolu(u.url),
      altMetin: urlYolu(u.url),
      href: `/urun-seo/${u.id}`,
    })),
    ...(kategoriler.data ?? []).map((k) => ({
      tur: "kategori",
      turAdi: "Kategori",
      baslik: k.name ?? urlYolu(k.url),
      altMetin: urlYolu(k.url),
      href: `/kategori-seo/${k.id}`,
    })),
    ...(sayfalar.data ?? []).map((s) => ({
      tur: "sayfa",
      turAdi: "Sayfa",
      baslik: s.title ?? urlYolu(s.url),
      altMetin: urlYolu(s.url),
      href: `/sayfa-analizi/${s.id}`,
    })),
    ...(rakipler.data ?? []).map((r) => ({
      tur: "rakip",
      turAdi: "Rakip",
      baslik: r.domain,
      altMetin: null,
      href: `/rakip-analizi/${r.id}`,
    })),
    ...(aksiyonlar.data ?? []).map((a) => ({
      tur: "aksiyon",
      turAdi: "Aksiyon",
      baslik: a.title,
      altMetin: null,
      href: `/aksiyon-merkezi?aksiyon=${a.id}`,
    })),
  ];

  // Projede hiç analiz verisi yoksa arayüz bunu kullanıcıya açıklar.
  const { count: veriSayisi } = await supabase
    .from("keywords")
    .select("id", { count: "exact", head: true })
    .eq("project_id", aktif.id);

  return NextResponse.json({
    sonuclar: sonuclar.slice(0, 20),
    veriVar: (veriSayisi ?? 0) > 0,
  });
}
