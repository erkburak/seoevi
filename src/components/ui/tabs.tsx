import Link from "next/link";

import { cn, sayi } from "@/lib/utils";

export type SekmeOgesi = {
  etiket: string;
  href: string;
  sayac?: number;
};

/** URL tabanlı sekmeler — sunucuda render edilir, durum korunur. */
export function Sekmeler({
  ogeler,
  aktif,
  className,
}: {
  ogeler: SekmeOgesi[];
  aktif: string;
  className?: string;
}) {
  return (
    <div className={cn("table-scroll -mb-px border-b border-line", className)}>
      <nav className="flex min-w-max gap-1" aria-label="Sekmeler">
        {ogeler.map((o) => {
          const seciliMi = o.href === aktif;
          return (
            <Link
              key={o.href}
              href={o.href}
              aria-current={seciliMi ? "page" : undefined}
              className={cn(
                "relative inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                seciliMi
                  ? "border-ink-900 text-ink-900"
                  : "border-transparent text-ink-400 hover:border-ink-200 hover:text-ink-700",
              )}
            >
              {o.etiket}
              {o.sayac !== undefined ? (
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 py-0.5 text-[11px] font-medium",
                    seciliMi ? "bg-ink-900 text-white" : "bg-ink-50 text-ink-500",
                  )}
                >
                  {sayi(o.sayac)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/** Filtre şeridi — sorgu parametresi ile çalışır. */
export function FiltreSeridi({
  ogeler,
  aktif,
  className,
}: {
  ogeler: { etiket: string; href: string; sayac?: number }[];
  aktif: string;
  className?: string;
}) {
  return (
    <div className={cn("table-scroll", className)}>
      <div className="flex min-w-max items-center gap-1.5">
        {ogeler.map((o) => {
          const seciliMi = o.href === aktif;
          return (
            <Link
              key={o.href}
              href={o.href}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                seciliMi
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line bg-white text-ink-600 hover:border-ink-200 hover:bg-surface-muted",
              )}
            >
              {o.etiket}
              {o.sayac !== undefined ? (
                <span className={cn("tabular text-[11.5px]", seciliMi ? "text-white/60" : "text-ink-400")}>
                  {sayi(o.sayac)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
