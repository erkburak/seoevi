import type { ReactNode } from "react";

import { Sparkline } from "@/components/charts";
import { Ipucu } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Ölçüm kartı. Bir sayıyı bağlamıyla birlikte gösterir:
 * değer, değişim ve gerekiyorsa mikro grafik.
 */
export function OlcumKarti({
  etiket,
  deger,
  altMetin,
  degisim,
  degisimYonu = "artis_iyi",
  ipucu,
  trend,
  vurgulu = false,
  aksiyon,
  className,
}: {
  etiket: string;
  deger: ReactNode;
  altMetin?: string;
  degisim?: number | null;
  degisimYonu?: "artis_iyi" | "azalis_iyi";
  ipucu?: string;
  trend?: number[];
  vurgulu?: boolean;
  aksiyon?: ReactNode;
  className?: string;
}) {
  const iyi =
    degisim === null || degisim === undefined || degisim === 0
      ? null
      : degisimYonu === "artis_iyi"
        ? degisim > 0
        : degisim < 0;

  return (
    <div
      className={cn(
        "rounded-[14px] border p-4 transition-shadow duration-200",
        vurgulu ? "border-ink-800 bg-ink-900 text-white" : "border-line bg-white hover:shadow-raised",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 text-[12.5px] font-medium",
            vurgulu ? "text-white/60" : "text-ink-400",
          )}
        >
          {etiket}
          {ipucu ? <Ipucu metin={ipucu} /> : null}
        </span>
        {aksiyon}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p
            className={cn(
              "tabular text-[26px] font-semibold leading-none tracking-[-0.025em]",
              vurgulu ? "text-white" : "text-ink-900",
            )}
          >
            {deger}
          </p>
          <div className="mt-2 flex items-center gap-2">
            {iyi !== null ? (
              <span
                className={cn(
                  "tabular inline-flex items-center gap-0.5 text-[12.5px] font-medium",
                  iyi ? "text-positive" : "text-critical",
                  vurgulu && (iyi ? "text-positive-soft" : "text-critical-soft"),
                )}
              >
                <span aria-hidden>{degisim! > 0 ? "↑" : "↓"}</span>
                {Math.abs(degisim!)}
                {degisimYonu === "artis_iyi" ? "" : ""}
              </span>
            ) : null}
            {altMetin ? (
              <span className={cn("text-[12px]", vurgulu ? "text-white/50" : "text-ink-400")}>{altMetin}</span>
            ) : null}
          </div>
        </div>
        {trend && trend.length > 1 ? <Sparkline degerler={trend} className="shrink-0 opacity-90" /> : null}
      </div>
    </div>
  );
}

/** Sayı + etiket ikilisi — kart kullanmadan özet satırı. */
export function OzetDegeri({
  etiket,
  deger,
  ipucu,
  className,
}: {
  etiket: string;
  deger: ReactNode;
  ipucu?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="inline-flex items-center gap-1.5 text-[12px] text-ink-400">
        {etiket}
        {ipucu ? <Ipucu metin={ipucu} /> : null}
      </p>
      <p className="tabular mt-1 text-[19px] font-semibold tracking-[-0.02em] text-ink-900">{deger}</p>
    </div>
  );
}
