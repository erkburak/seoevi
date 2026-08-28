import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Uygulama sayfalarının ortak başlık bloğu. */
export function SayfaBasligi({
  baslik,
  aciklama,
  aksiyon,
  className,
}: {
  baslik: string;
  aciklama?: string;
  aksiyon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-900">{baslik}</h1>
        {aciklama ? (
          <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">{aciklama}</p>
        ) : null}
      </div>
      {aksiyon ? <div className="flex shrink-0 flex-wrap items-center gap-2">{aksiyon}</div> : null}
    </div>
  );
}
