import { Slot } from "@radix-ui/react-slot";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Gorunum = "birincil" | "ikincil" | "sessiz" | "cizgili" | "tehlike" | "whatsapp";
type Boyut = "sm" | "md" | "lg";

const GORUNUMLER: Record<Gorunum, string> = {
  birincil:
    "bg-ink-900 text-white shadow-[0_1px_2px_rgba(12,17,29,0.16)] hover:bg-ink-800 active:bg-ink-950 disabled:bg-ink-300",
  ikincil:
    "bg-white text-ink-800 border border-line-strong shadow-subtle hover:bg-surface-muted hover:border-ink-200 active:bg-surface-sunken",
  sessiz: "text-ink-600 hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100",
  cizgili: "border border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white",
  tehlike: "bg-critical text-white hover:opacity-90 active:opacity-100",
  whatsapp:
    "bg-[#128C7E] text-white hover:bg-[#0f7a6d] active:bg-[#0c6659] shadow-[0_1px_2px_rgba(12,17,29,0.16)]",
};

const BOYUTLAR: Record<Boyut, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[8px]",
  md: "h-10 px-4 text-sm gap-2 rounded-[10px]",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-[12px]",
};

export type ButonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  gorunum?: Gorunum;
  boyut?: Boyut;
  tamGenislik?: boolean;
  yukleniyor?: boolean;
  asChild?: boolean;
  children?: ReactNode;
};

export function Buton({
  gorunum = "birincil",
  boyut = "md",
  tamGenislik = false,
  yukleniyor = false,
  asChild = false,
  className,
  children,
  disabled,
  ...props
}: ButonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap font-medium",
        "transition-[background-color,color,border-color,transform,opacity] duration-150 ease-[var(--ease-out-soft)]",
        "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-55",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        GORUNUMLER[gorunum],
        BOYUTLAR[boyut],
        tamGenislik && "w-full",
        className,
      )}
      disabled={disabled || yukleniyor}
      {...props}
    >
      {yukleniyor ? (
        <>
          <span
            aria-hidden
            className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
          />
          <span>Bekleyin…</span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
