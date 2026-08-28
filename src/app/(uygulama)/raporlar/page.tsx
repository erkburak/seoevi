import { FileBarChart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RaporOlusturDugmesi, RaporSilDugmesi } from "@/components/app/rapor-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { BOLUM_ADI, type RaporBolumu } from "@/lib/analiz/rapor-bolumleri";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { tarih, tarihSaat } from "@/lib/utils";
import type { Rapor } from "@/types/database";

export const metadata: Metadata = {
  title: "Raporlar",
  robots: { index: false, follow: false },
};

export default async function RaporlarSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", proje.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const raporlar = (data ?? []) as Rapor[];

  return (
    <>
      <SayfaBasligi
        baslik="Raporlar"
        aciklama="Projenizin belirli bir andaki SEO durumunu dondurup saklayın. Ekibinizle veya müşterinizle paylaşabilirsiniz."
        aksiyon={<RaporOlusturDugmesi projeAdi={proje.name} />}
      />

      {raporlar.length === 0 ? (
        <BosDurum
          ikon={FileBarChart}
          baslik="Henüz rapor oluşturulmadı."
          aciklama="İlk raporunuzu oluşturun; teknik SEO, anahtar kelimeler, rakipler ve aksiyonlar tek bir belgede toplansın."
          aksiyon={<RaporOlusturDugmesi projeAdi={proje.name} />}
        />
      ) : (
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
          {raporlar.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/raporlar/${r.id}`}
                  className="text-[14.5px] font-medium text-ink-900 transition-colors hover:text-ink-600"
                >
                  {r.title}
                </Link>
                <p className="mt-1 text-[12.5px] text-ink-400">
                  {tarihSaat(r.created_at)}
                  {r.period_start ? ` · Dönem: ${tarih(r.period_start)} – ${tarih(r.period_end)}` : " · Tüm zamanlar"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(r.sections ?? []).slice(0, 5).map((b) => (
                    <Rozet key={b}>{BOLUM_ADI[b as RaporBolumu] ?? b}</Rozet>
                  ))}
                  {(r.sections?.length ?? 0) > 5 ? (
                    <Rozet>+{(r.sections?.length ?? 0) - 5}</Rozet>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/raporlar/${r.id}`}
                  className="inline-flex h-8 items-center rounded-[8px] border border-line-strong bg-white px-3 text-[13px] font-medium text-ink-800 transition-colors hover:bg-surface-muted"
                >
                  Raporu Aç
                </Link>
                <RaporSilDugmesi raporId={r.id} baslik={r.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
