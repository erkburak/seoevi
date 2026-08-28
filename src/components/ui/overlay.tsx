"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

function useKapatmaTuslari(acik: boolean, kapat: () => void) {
  useEffect(() => {
    if (!acik) return;
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") kapat();
    }
    document.addEventListener("keydown", tus);
    const onceki = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = onceki;
    };
  }, [acik, kapat]);
}

/** Ortada açılan pencere. */
export function Pencere({
  acik,
  kapat,
  baslik,
  aciklama,
  children,
  altBolum,
  genislik = "md",
}: {
  acik: boolean;
  kapat: () => void;
  baslik: string;
  aciklama?: string;
  children: ReactNode;
  altBolum?: ReactNode;
  genislik?: "sm" | "md" | "lg";
}) {
  const kutu = useRef<HTMLDivElement>(null);
  useKapatmaTuslari(acik, kapat);

  useEffect(() => {
    if (acik) kutu.current?.focus();
  }, [acik]);

  if (!acik || typeof document === "undefined") return null;

  const genislikler = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" } as const;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="animate-fade absolute inset-0 bg-ink-950/25 backdrop-blur-[2px]" onClick={kapat} aria-hidden />
      <div
        ref={kutu}
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
        tabIndex={-1}
        className={cn(
          "animate-rise relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[20px] border border-line bg-white shadow-float sm:rounded-[18px]",
          genislikler[genislik],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink-900">{baslik}</h2>
            {aciklama ? <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{aciklama}</p> : null}
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="-mr-1 -mt-1 rounded-[8px] p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {altBolum ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3.5">
            {altBolum}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** Kenardan açılan panel. */
export function Panel({
  acik,
  kapat,
  baslik,
  aciklama,
  children,
  altBolum,
  taraf = "sag",
}: {
  acik: boolean;
  kapat: () => void;
  baslik: string;
  aciklama?: string;
  children: ReactNode;
  altBolum?: ReactNode;
  taraf?: "sag" | "sol";
}) {
  useKapatmaTuslari(acik, kapat);

  if (!acik || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="animate-fade absolute inset-0 bg-ink-950/25 backdrop-blur-[2px]" onClick={kapat} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={baslik}
        className={cn(
          "animate-drawer absolute inset-y-0 flex w-full max-w-[520px] flex-col border-line bg-white shadow-float",
          taraf === "sag" ? "right-0 border-l" : "left-0 border-r",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink-900">{baslik}</h2>
            {aciklama ? <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{aciklama}</p> : null}
          </div>
          <button
            type="button"
            onClick={kapat}
            aria-label="Kapat"
            className="-mr-1 -mt-1 rounded-[8px] p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {altBolum ? (
          <div className="flex items-center justify-end gap-2 border-t border-line bg-surface-muted px-5 py-3.5">
            {altBolum}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
