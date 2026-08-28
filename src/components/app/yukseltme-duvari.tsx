import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

import { Buton } from "@/components/ui/button";

/**
 * Paket sınırının bittiği yerde görünen yükseltme paneli.
 *
 * Tasarımın iki kuralı var:
 *
 * 1. Gizlenen veri istemciye hiç gönderilmez. CSS ile bulanıklaştırma
 *    paywall değildir; bulanık satırın gerçek içeriği HTML'de durur ve
 *    geliştirici araçlarını açan herkes okur. Bu yüzden aşağıdaki hayalet
 *    satırlar gerçek veri taşımaz, yalnızca biçim gösterir.
 *
 * 2. Genel bir "yükseltin" çağrısı yerine gizlenenin değeri rakamla
 *    söylenir. Kullanıcı neyi kaçırdığını bilmeden karar veremez.
 *
 * Panel yalnızca gerçekten gizlenmiş kayıt varken çizilir; olmayan veriyi
 * varmış gibi göstermez.
 */

export type DuvarOlcumu = {
  etiket: string;
  deger: string;
  /** Öne çıkarılacak ölçüm — en ikna edici olan. */
  vurgulu?: boolean;
};

export function YukseltmeDuvari({
  gizliSayi,
  baslik,
  aciklama,
  olcumler = [],
  hedefPlanAdi,
}: {
  gizliSayi: number;
  baslik: string;
  aciklama: string;
  olcumler?: DuvarOlcumu[];
  hedefPlanAdi: string | null;
}) {
  if (gizliSayi <= 0) return null;

  return (
    <section className="relative mt-3">
      {/* Hayalet satırlar: yalnızca biçim, veri taşımaz. */}
      <div aria-hidden className="pointer-events-none select-none space-y-2">
        {[0.5, 0.28, 0.12].map((saydamlik, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-[10px] border border-line bg-white px-4 py-3.5"
            style={{ opacity: saydamlik }}
          >
            <div className="h-3 flex-1 rounded-full bg-ink-100" style={{ maxWidth: "26%" }} />
            <div className="h-3 w-14 rounded-full bg-ink-100" />
            <div className="h-3 w-10 rounded-full bg-ink-100" />
            <div className="h-3 w-12 rounded-full bg-ink-100" />
            <div className="h-3 w-16 rounded-full bg-ink-100" />
            <div className="hidden h-3 w-24 rounded-full bg-ink-100 sm:block" />
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-[14px] border border-ink-200 bg-white p-5 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-ink-900">
                <Lock className="size-3.5 text-white" aria-hidden />
              </span>
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
                {baslik}
              </h3>
            </div>

            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">{aciklama}</p>

            {olcumler.length ? (
              <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                {olcumler.map((o) => (
                  <div key={o.etiket}>
                    <dt className="text-[12px] text-ink-400">{o.etiket}</dt>
                    <dd
                      className={
                        o.vurgulu
                          ? "tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em] text-ink-900"
                          : "tabular mt-0.5 text-[19px] font-semibold tracking-[-0.02em] text-ink-600"
                      }
                    >
                      {o.deger}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          <div className="shrink-0">
            <Buton asChild>
              <Link href="/fiyatlandirma">
                {hedefPlanAdi ? `${hedefPlanAdi} paketine geçin` : "Paketleri görün"}
                <ArrowRight aria-hidden />
              </Link>
            </Buton>
          </div>
        </div>
      </div>
    </section>
  );
}
