import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* İskelet                                                             */
/* ------------------------------------------------------------------ */

export function Iskelet({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[8px]", className)} aria-hidden />;
}

export function IskeletSatirlari({ adet = 3, className }: { adet?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: adet }).map((_, i) => (
        <Iskelet key={i} className={cn("h-4", i === adet - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

export function IskeletTablo({ satir = 6, kolon = 5 }: { satir?: number; kolon?: number }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      <div className="flex gap-4 border-b border-line bg-surface-muted px-4 py-3">
        {Array.from({ length: kolon }).map((_, i) => (
          <Iskelet key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: satir }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-line px-4 py-3.5 last:border-0">
          {Array.from({ length: kolon }).map((_, c) => (
            <Iskelet key={c} className={cn("h-4 flex-1", c === 0 && "flex-[2]")} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function IskeletKartlari({ adet = 4 }: { adet?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: adet }).map((_, i) => (
        <div key={i} className="rounded-[14px] border border-line bg-white p-4">
          <Iskelet className="h-3 w-24" />
          <Iskelet className="mt-3 h-7 w-16" />
          <Iskelet className="mt-3 h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Boş durum                                                           */
/* ------------------------------------------------------------------ */

export function BosDurum({
  ikon: Ikon,
  baslik,
  aciklama,
  aksiyon,
  className,
}: {
  ikon?: LucideIcon;
  baslik: string;
  aciklama?: string;
  aksiyon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center",
        className,
      )}
    >
      {Ikon ? (
        <span className="mb-4 inline-flex size-11 items-center justify-center rounded-[12px] border border-line bg-surface-muted text-ink-400">
          <Ikon className="size-5" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-[15px] font-semibold text-ink-900">{baslik}</h3>
      {aciklama ? (
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-400">{aciklama}</p>
      ) : null}
      {aksiyon ? <div className="mt-5 flex flex-wrap justify-center gap-2">{aksiyon}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Uyarı kutusu                                                        */
/* ------------------------------------------------------------------ */

export function Uyari({
  ton = "bilgi",
  baslik,
  children,
  className,
}: {
  ton?: "bilgi" | "uyari" | "kritik" | "olumlu";
  baslik?: string;
  children: ReactNode;
  className?: string;
}) {
  const tonlar = {
    bilgi: "border-info/20 bg-info-soft text-info",
    uyari: "border-caution/20 bg-caution-soft text-caution",
    kritik: "border-critical/20 bg-critical-soft text-critical",
    olumlu: "border-positive/20 bg-positive-soft text-positive",
  } as const;

  return (
    <div className={cn("rounded-[12px] border px-4 py-3 text-[13px] leading-relaxed", tonlar[ton], className)}>
      {baslik ? <p className="mb-0.5 font-semibold">{baslik}</p> : null}
      <div className="text-ink-600">{children}</div>
    </div>
  );
}
