import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ETICARET_SEKMELERI } from "@/config/navigation";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { DagilimSeridi } from "@/components/charts";
import { Buton } from "@/components/ui/button";
import { BosDurum } from "@/components/ui/feedback";
import { OlcumKarti } from "@/components/ui/metric";
import { SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, urlYolu } from "@/lib/utils";
import type { ProjeSkorlari } from "@/types/database";

export const metadata: Metadata = {
  title: "E-ticaret SEO",
  robots: { index: false, follow: false },
};

export default async function EticaretSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ data: urunler }, { data: kategoriler }] = await Promise.all([
    supabase.from("products").select("id, url, name, seo_score").eq("project_id", proje.id).limit(2000),
    supabase.from("categories").select("id, url, name, seo_score").eq("project_id", proje.id).limit(1000),
  ]);

  const urunListesi = urunler ?? [];
  const kategoriListesi = kategoriler ?? [];
  const skorlar = (proje.scores ?? {}) as ProjeSkorlari;

  if (!urunListesi.length && !kategoriListesi.length) {
    return (
      <>
        <SayfaBasligi
          baslik="E-ticaret SEO"
          aciklama="Ürün ve kategori sayfalarınızın arama performansı."
        />
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/e-ticaret" className="mb-6" />
        <BosDurum
          ikon={ShoppingBag}
          baslik="Henüz ürün veya kategori sayfası bulunamadı."
          aciklama="Site taramasını çalıştırın; ürün ve kategori sayfalarınız otomatik tespit edilip ayrı ayrı puanlansın."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      </>
    );
  }

  const ortalama = (liste: { seo_score: number | null }[]) => {
    const gecerli = liste.filter((x) => x.seo_score !== null);
    if (!gecerli.length) return null;
    return Math.round(gecerli.reduce((t, x) => t + (x.seo_score ?? 0), 0) / gecerli.length);
  };

  const urunOrt = ortalama(urunListesi);
  const kategoriOrt = ortalama(kategoriListesi);

  const dagilim = (liste: { seo_score: number | null }[]) => ({
    iyi: liste.filter((x) => (x.seo_score ?? 0) >= 80).length,
    orta: liste.filter((x) => (x.seo_score ?? 0) >= 55 && (x.seo_score ?? 0) < 80).length,
    zayif: liste.filter((x) => (x.seo_score ?? 0) < 55).length,
  });

  const urunDagilim = dagilim(urunListesi);
  const enZayifUrunler = [...urunListesi]
    .filter((u) => u.seo_score !== null)
    .sort((a, b) => (a.seo_score ?? 0) - (b.seo_score ?? 0))
    .slice(0, 8);

  return (
    <>
      <SayfaBasligi
        baslik="E-ticaret SEO"
        aciklama="Ürün ve kategori sayfalarınızın arama performansı ve eksikleri."
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/e-ticaret" className="mb-6" />

      <div className="space-y-9">
        <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="flex items-center gap-4">
              <SkorHalkasi skor={skorlar.eticaret ?? null} boyut={92} etiket="E-ticaret" />
              <div>
                <p className="text-[13px] font-medium text-ink-900">E-ticaret skoru</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                  Ürün ve kategori sayfalarının ağırlıklı ortalaması.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <OlcumKarti etiket="Ürün sayfası" deger={sayi(urunListesi.length)} />
            <OlcumKarti etiket="Ürün skor ortalaması" deger={urunOrt !== null ? `${urunOrt}/100` : "—"} />
            <OlcumKarti etiket="Kategori sayfası" deger={sayi(kategoriListesi.length)} />
            <OlcumKarti
              etiket="Kategori skor ortalaması"
              deger={kategoriOrt !== null ? `${kategoriOrt}/100` : "—"}
            />
          </div>
        </section>

        <section>
          <BolumBasligi
            baslik="Ürün skor dağılımı"
            aciklama="Skoru 55'in altında olan sayfalar öncelikli olarak ele alınmalı."
            sag={
              <Buton asChild gorunum="ikincil" boyut="sm">
                <Link href="/urun-seo">Ürünleri Gör</Link>
              </Buton>
            }
          />
          <div className="mt-4 rounded-[14px] border border-line bg-white p-5">
            <DagilimSeridi
              dilimler={[
                { etiket: "İyi (80+)", deger: urunDagilim.iyi, renk: "var(--color-positive)" },
                { etiket: "Geliştirilebilir (55-79)", deger: urunDagilim.orta, renk: "var(--color-caution)" },
                { etiket: "Zayıf (<55)", deger: urunDagilim.zayif, renk: "var(--color-critical)" },
              ]}
            />
          </div>
        </section>

        {enZayifUrunler.length ? (
          <section>
            <BolumBasligi
              baslik="Önce bunlara bakın"
              aciklama="En düşük skorlu ürün sayfaları."
            />
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {enZayifUrunler.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link href={`/urun-seo/${u.id}`} className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-ink-900 hover:underline">
                      {u.name ?? urlYolu(u.url)}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-ink-400">{urlYolu(u.url)}</span>
                  </Link>
                  <span
                    className={`tabular shrink-0 rounded-[7px] px-2 py-0.5 text-[13px] font-semibold ${
                      (u.seo_score ?? 0) < 55
                        ? "bg-critical-soft text-critical"
                        : "bg-caution-soft text-caution"
                    }`}
                  >
                    {u.seo_score ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
