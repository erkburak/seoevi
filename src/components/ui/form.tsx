import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const ALAN_STILI =
  "h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 transition-colors focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5 disabled:bg-surface-muted disabled:text-ink-400";

export function Alan({
  etiket,
  hata,
  yardim,
  id,
  className,
  sagEk,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  etiket: string;
  hata?: string;
  yardim?: string;
  sagEk?: ReactNode;
}) {
  const alanId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={alanId} className="text-[13px] font-medium text-ink-700">
          {etiket}
        </label>
        {sagEk}
      </div>
      <input
        id={alanId}
        aria-invalid={hata ? true : undefined}
        aria-describedby={hata ? `${alanId}-hata` : yardim ? `${alanId}-yardim` : undefined}
        className={cn(ALAN_STILI, hata && "border-critical focus:border-critical focus:ring-critical/10", className)}
        {...props}
      />
      {hata ? (
        <p id={`${alanId}-hata`} className="text-[12.5px] text-critical">
          {hata}
        </p>
      ) : yardim ? (
        <p id={`${alanId}-yardim`} className="text-[12.5px] text-ink-400">
          {yardim}
        </p>
      ) : null}
    </div>
  );
}

export function SecimAlani({
  etiket,
  hata,
  yardim,
  id,
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiket: string; hata?: string; yardim?: string }) {
  const alanId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={alanId} className="block text-[13px] font-medium text-ink-700">
        {etiket}
      </label>
      <select
        id={alanId}
        className={cn(ALAN_STILI, "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%236B778F%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10", hata && "border-critical", className)}
        {...props}
      >
        {children}
      </select>
      {hata ? <p className="text-[12.5px] text-critical">{hata}</p> : yardim ? <p className="text-[12.5px] text-ink-400">{yardim}</p> : null}
    </div>
  );
}

export function MetinAlani({
  etiket,
  hata,
  yardim,
  id,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { etiket: string; hata?: string; yardim?: string }) {
  const alanId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={alanId} className="block text-[13px] font-medium text-ink-700">
        {etiket}
      </label>
      <textarea
        id={alanId}
        className={cn(
          "min-h-28 w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-900 placeholder:text-ink-300 transition-colors focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5",
          hata && "border-critical",
          className,
        )}
        {...props}
      />
      {hata ? <p className="text-[12.5px] text-critical">{hata}</p> : yardim ? <p className="text-[12.5px] text-ink-400">{yardim}</p> : null}
    </div>
  );
}

/** Seçenek kartı — onboarding gibi akışlarda radyo yerine kullanılır. */
export function SecenekKarti({
  secili,
  baslik,
  aciklama,
  ikon,
  onClick,
  tip = "button",
}: {
  secili: boolean;
  baslik: string;
  aciklama?: string;
  ikon?: ReactNode;
  onClick?: () => void;
  tip?: "button" | "submit";
}) {
  return (
    <button
      type={tip}
      onClick={onClick}
      aria-pressed={secili}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition-all duration-150",
        secili
          ? "border-ink-900 bg-ink-900/[0.03] shadow-subtle"
          : "border-line bg-white hover:border-ink-200 hover:bg-surface-muted",
      )}
    >
      {ikon ? (
        <span
          className={cn(
            "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-[9px] border transition-colors",
            secili ? "border-ink-800 bg-ink-900 text-white" : "border-line bg-surface-muted text-ink-400",
          )}
        >
          {ikon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-medium text-ink-900">{baslik}</span>
        {aciklama ? <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-400">{aciklama}</span> : null}
      </span>
      <span
        className={cn(
          "mt-1 size-4 shrink-0 rounded-full border transition-all",
          secili ? "border-[5px] border-ink-900" : "border-line-strong group-hover:border-ink-300",
        )}
        aria-hidden
      />
    </button>
  );
}
