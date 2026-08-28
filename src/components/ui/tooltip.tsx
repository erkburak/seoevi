import { Info } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Sunucu bileşeninde de çalışan, yalnızca CSS ile konumlanan ipucu.
 * Klavye odağında da görünür.
 */
export function Ipucu({
  metin,
  children,
  yon = "ust",
  className,
}: {
  metin: string;
  children?: ReactNode;
  yon?: "ust" | "alt";
  className?: string;
}) {
  return (
    <span className={cn("group/ipucu relative inline-flex items-center", className)}>
      <span tabIndex={0} className="inline-flex cursor-help items-center text-ink-300 transition-colors hover:text-ink-500 focus-visible:text-ink-500">
        {children ?? <Info className="size-3.5" aria-hidden />}
        <span className="sr-only">{metin}</span>
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[260px] -translate-x-1/2 rounded-[10px] bg-ink-900 px-3 py-2",
          "text-[12px] font-normal leading-relaxed text-white/90 shadow-float",
          "opacity-0 transition-opacity duration-150 group-hover/ipucu:opacity-100 group-focus-within/ipucu:opacity-100",
          yon === "ust" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
        )}
      >
        {metin}
      </span>
    </span>
  );
}

/** Başlık + ipucu ikilisi. */
export function EtiketIpucu({ etiket, ipucu }: { etiket: string; ipucu: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span>{etiket}</span>
      <Ipucu metin={ipucu} />
    </span>
  );
}
