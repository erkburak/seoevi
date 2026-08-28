import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Düz yüzey. Varsayılan içerik kabı — her şeyi karta koymamak için
 * sınırlı ve bilinçli kullanılır.
 */
export function Kart({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-line bg-white shadow-subtle",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Cam yüzey. Yalnızca öne çıkarılan bölümlerde kullanılır
 * (hero, skor paneli, açılır menüler).
 */
export function CamKart({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-[18px]", className)} {...props} />;
}

/** Bölüm başlığı — kart kullanmadan görsel hiyerarşi kurar. */
export function BolumBasligi({
  baslik,
  aciklama,
  sag,
  className,
}: {
  baslik: string;
  aciklama?: string;
  sag?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{baslik}</h2>
        {aciklama ? (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-400">{aciklama}</p>
        ) : null}
      </div>
      {sag ? <div className="flex shrink-0 items-center gap-2">{sag}</div> : null}
    </div>
  );
}

/** İnce ayırıcı çizgi. */
export function Ayirac({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}
