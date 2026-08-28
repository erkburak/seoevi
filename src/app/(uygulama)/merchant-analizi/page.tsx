import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ETICARET_SEKMELERI } from "@/config/navigation";
import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { CubukGrafik } from "@/components/charts";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { projeBaglami } from "@/lib/projects";
import { ozellikVarMi } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { para, sayi, tarih, urlYolu } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Merchant Analizi",
  robots: { index: false, follow: false },
};

export default async function MerchantAnaliziSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const izinli = await ozellikVarMi(kullanici.id, "merchant");
  const supabase = await sunucuIstemcisi();

  const [{ data: ozet }, { data: urunDenetimleri }, { data: calisanIs }] = await Promise.all([
    supabase
      .from("merchant_audits")
      .select("*")
      .eq("project_id", proje.id)
      .is("product_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("merchant_audits")
      .select("*, products(id, name, url, price, currency)")
      .eq("project_id", proje.id)
      .not("product_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .eq("job_type", "merchant")
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const baslik = (
    <SayfaBasligi
      baslik="Merchant Analizi"
      aciklama="Ürünlerinizin Google Alışveriş sonuçlarında görünmesi için gereken alanların durumu."
      aksiyon={
        izinli ? (
          <ModulAnaliziButonu
            projeId={proje.id}
            tur="merchant"
            etiket="Merchant Analizini Çalıştır"
            calisanIsId={calisanIs?.id ?? null}
          />
        ) : null
      }
    />
  );

  if (!izinli) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/merchant-analizi" className="mb-6" />
        <PaketUyarisi
          ozellik="Merchant analizi"
          aciklama="Google Alışveriş görünürlüğü ve ürün veri kalitesi analizi Profesyonel paketten itibaren kullanılabilir."
        />
      </>
    );
  }

  if (!ozet) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/merchant-analizi" className="mb-6" />
        <BosDurum
          ikon={ShoppingBag}
          baslik="Henüz Merchant analizi yapılmadı."
          aciklama="Analizi çalıştırın; ürünlerinizin GTIN, marka, fiyat ve stok alanları kontrol edilsin, Alışveriş sonuçlarındaki durumunuz ölçülsün."
          aksiyon={
            <ModulAnaliziButonu
              projeId={proje.id}
              tur="merchant"
              etiket="Merchant Analizini Çalıştır"
              calisanIsId={calisanIs?.id ?? null}
            />
          }
        />
      </>
    );
  }

  const veri = (ozet.data ?? {}) as {
    incelenen_urun?: number;
    sorgulanan_urun?: number;
    gorunur_urun?: number;
    eksik_dagilimi?: { alan: string; adet: number }[];
  };

  type DenetimSatiri = {
    id: string;
    health_score: number | null;
    shopping_visible: boolean;
    shopping_position: number | null;
    seller_count: number | null;
    price_position: string | null;
    missing_fields: string[];
    competitors: { alan_adi: string; fiyat: number | null; baslik: string | null }[];
    products: { id: string; name: string | null; url: string; price: number | null; currency: string | null } | null;
  };

  const denetimler = ((urunDenetimleri ?? []) as unknown as DenetimSatiri[]).map((d) => ({
    ...d,
    products: Array.isArray(d.products) ? d.products[0] : d.products,
  }));

  return (
    <>
      {baslik}
      <Sekmeler ogeler={ETICARET_SEKMELERI} aktif="/merchant-analizi" className="mb-6" />

      <div className="space-y-9">
        <section className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="flex items-center gap-4">
              <SkorHalkasi skor={ozet.health_score} boyut={92} etiket="Sağlık" />
              <div>
                <p className="text-[13px] font-medium text-ink-900">Merchant sağlık skoru</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                  Ürün verilerinizin Alışveriş gereksinimlerini karşılama oranı.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
            <OzetDegeri etiket="İncelenen ürün" deger={sayi(veri.incelenen_urun ?? 0)} />
            <OzetDegeri
              etiket="Alışveriş'te sorgulanan"
              deger={sayi(veri.sorgulanan_urun ?? 0)}
              ipucu="Maliyeti sınırlamak için öncelikli ürünler canlı olarak sorgulanır."
            />
            <OzetDegeri etiket="Alışveriş'te görünen" deger={sayi(veri.gorunur_urun ?? 0)} />
            <OzetDegeri etiket="Son analiz" deger={tarih(ozet.created_at)} />
          </div>
        </section>

        {veri.eksik_dagilimi?.length ? (
          <section>
            <BolumBasligi
              baslik="En sık eksik alanlar"
              aciklama="Bu alanlar tamamlanmadan ürünler Alışveriş sonuçlarında eşleşmez."
            />
            <div className="mt-4 rounded-[14px] border border-line bg-white p-5">
              <CubukGrafik
                veri={veri.eksik_dagilimi.map((e) => ({ etiket: e.alan, deger: e.adet }))}
                vurgulanan="GTIN"
              />
            </div>
          </section>
        ) : null}

        {denetimler.length ? (
          <section>
            <BolumBasligi
              baslik="Ürün bazlı sonuçlar"
              aciklama="Canlı Alışveriş sorgusu yapılan ürünler ve rakip fiyat konumu."
            />
            <div className="mt-4 space-y-3">
              {denetimler.map((d) => (
                <article key={d.id} className="rounded-[14px] border border-line bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      {d.products ? (
                        <Link
                          href={`/urun-seo/${d.products.id}`}
                          className="block truncate text-[14px] font-medium text-ink-900 hover:underline"
                        >
                          {d.products.name ?? urlYolu(d.products.url)}
                        </Link>
                      ) : (
                        <p className="text-[14px] font-medium text-ink-900">Ürün</p>
                      )}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Rozet ton={d.shopping_visible ? "olumlu" : "uyari"} nokta>
                          {d.shopping_visible
                            ? `Alışveriş'te ${d.shopping_position ?? "-"}. sırada`
                            : "Alışveriş'te görünmüyor"}
                        </Rozet>
                        {d.seller_count ? <Rozet>{sayi(d.seller_count)} satıcı</Rozet> : null}
                        {d.price_position ? (
                          <Rozet ton={d.price_position === "en_ucuz" ? "olumlu" : d.price_position === "pahali" ? "kritik" : "notr"}>
                            {d.price_position === "en_ucuz"
                              ? "En uygun fiyatlardan"
                              : d.price_position === "pahali"
                                ? "Pahalı tarafta"
                                : "Ortalama fiyat"}
                          </Rozet>
                        ) : null}
                      </div>
                    </div>
                    <span className="tabular shrink-0 rounded-[7px] bg-surface-muted px-2 py-0.5 text-[13px] font-semibold text-ink-900">
                      {d.health_score ?? "—"}
                    </span>
                  </div>

                  {d.missing_fields?.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                      <span className="text-[12px] text-ink-400">Eksikler:</span>
                      {d.missing_fields.map((a) => (
                        <Rozet key={a} ton="uyari">
                          {a}
                        </Rozet>
                      ))}
                    </div>
                  ) : null}

                  {d.competitors?.length ? (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-2 text-[12px] text-ink-400">Aynı üründe rakipler</p>
                      <ul className="grid gap-1.5 sm:grid-cols-2">
                        {d.competitors.slice(0, 6).map((c, i) => (
                          <li key={`${c.alan_adi}-${i}`} className="flex items-center justify-between gap-2 text-[12.5px]">
                            <span className="truncate text-ink-600">{c.alan_adi || "—"}</span>
                            <span className="tabular shrink-0 font-medium text-ink-800">{para(c.fiyat)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
