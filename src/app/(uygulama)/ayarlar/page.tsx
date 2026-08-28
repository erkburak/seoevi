import type { Metadata } from "next";
import Link from "next/link";

import { AyarFormu } from "@/components/app/ayar-formu";
import { GscBaglantiKarti } from "@/components/app/gsc-baglanti";
import { ProjeAdiFormu, ProjeSilDugmesi } from "@/components/app/proje-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Buton } from "@/components/ui/button";
import { Ayirac, BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { gscHazirMi } from "@/lib/gsc/client";
import { gscOzeti } from "@/lib/gsc/senkron";
import { abonelikDurumu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { tarihSaat } from "@/lib/utils";
import type { ProjeAyarlari } from "@/types/database";

export const metadata: Metadata = {
  title: "Ayarlar",
  robots: { index: false, follow: false },
};

/** Ayar kaydı henüz oluşmamışsa kullanılacak varsayılanlar. */
function varsayilanAyarlar(projeId: string): ProjeAyarlari {
  return {
    project_id: projeId,
    device: "desktop",
    auto_audit: true,
    audit_frequency: "haftalik",
    max_crawl_pages: 200,
    product_url_pattern: null,
    category_url_pattern: null,
    notification_prefs: { email: true, uygulama: true },
    updated_at: new Date().toISOString(),
  };
}

export default async function AyarlarSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ gsc?: string }>;
}) {
  const { gsc } = await searchParams;
  const { kullanici, proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ data: ayarVerisi }, { limitler }, gscDurumu] = await Promise.all([
    supabase.from("project_settings").select("*").eq("project_id", proje.id).maybeSingle(),
    abonelikDurumu(kullanici.id),
    gscOzeti(proje.id),
  ]);

  const ayarlar = (ayarVerisi as ProjeAyarlari | null) ?? varsayilanAyarlar(proje.id);

  return (
    <>
      <SayfaBasligi
        baslik="Ayarlar"
        aciklama={`${proje.domain} projesinin analiz, e-ticaret ve bildirim ayarları.`}
        aksiyon={
          <Buton asChild gorunum="ikincil" boyut="sm">
            <Link href="/hesabim">Hesap Ayarları</Link>
          </Buton>
        }
      />

      <div className="space-y-9">
        {/* --- Proje --- */}
        <section>
          <BolumBasligi baslik="Proje" aciklama="Bu projenin panelde görünen adı ve adresi." />
          <div className="mt-5 max-w-lg space-y-5">
            <ProjeAdiFormu projeId={proje.id} mevcutAd={proje.name} />

            <dl className="divide-y divide-line rounded-[14px] border border-line bg-white">
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-[13px] text-ink-500">Web sitesi</dt>
                <dd className="truncate text-[13px] font-medium text-ink-900">{proje.url}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-[13px] text-ink-500">Hedef pazar</dt>
                <dd className="text-[13px] font-medium text-ink-900">
                  {proje.location_name ?? "Türkiye"} · {proje.language_name}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-[13px] text-ink-500">Son analiz</dt>
                <dd className="text-[13px] font-medium text-ink-900">
                  {proje.last_audit_at ? tarihSaat(proje.last_audit_at) : "Henüz yapılmadı"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <Ayirac />

        {/* --- Google Search Console --- */}
        <section>
          <BolumBasligi
            baslik="Google Search Console"
            aciklama="Bağlandığında tahmini trafik ve tıklama oranı, Google'ın gerçek verisiyle değişir."
          />
          <div className="mt-5">
            <GscBaglantiKarti ozet={gscDurumu} durumAnahtari={gsc} yapilandirildi={gscHazirMi()} />
          </div>
        </section>

        <Ayirac />

        {/* --- Analiz ayarları --- */}
        <AyarFormu ayarlar={ayarlar} planSayfaLimiti={limitler?.tarama_sayfa ?? 200} />

        <Ayirac />

        {/* --- Tehlikeli bölge --- */}
        <section>
          <BolumBasligi
            baslik="Projeyi silme"
            aciklama="Bu işlem geri alınamaz. Projeye ait tüm analizler ve veriler kaldırılır."
          />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-critical/20 bg-critical-soft/40 px-4 py-4">
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-ink-900">{proje.domain}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-500">
                Anahtar kelimeler, sayfa denetimleri, rakip verileri ve raporlar silinecek.
              </p>
            </div>
            <ProjeSilDugmesi projeId={proje.id} domain={proje.domain} />
          </div>
        </section>
      </div>
    </>
  );
}
