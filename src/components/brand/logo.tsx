"use client";

import Link from "next/link";

import { useMarka } from "@/components/brand/marka-saglayici";
import { cn } from "@/lib/utils";

/**
 * SEO Evi markası.
 * Sembol: yükselen üç kolon ve arama noktası — sıralama ve bulunurluk.
 */
export function LogoIsareti({ className, boyut = 28 }: { className?: string; boyut?: number }) {
  return (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 28 28"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <rect width="28" height="28" rx="7.5" fill="var(--color-ink-900)" />
      <rect x="7" y="15" width="3" height="6" rx="1.5" fill="white" fillOpacity="0.55" />
      <rect x="12.5" y="11" width="3" height="10" rx="1.5" fill="white" fillOpacity="0.78" />
      <rect x="18" y="7" width="3" height="14" rx="1.5" fill="white" />
      <circle cx="19.5" cy="7.5" r="3.25" fill="var(--color-ink-900)" />
      <circle cx="19.5" cy="7.5" r="1.9" fill="white" />
    </svg>
  );
}

export function Logo({
  className,
  altMetin = false,
  href = "/",
  boyut = 28,
}: {
  className?: string;
  altMetin?: boolean;
  href?: string | null;
  boyut?: number;
}) {
  const marka = useMarka();

  // Yetkili bir logo yüklediyse marka adı ve sembol yerine o kullanılır.
  if (marka.logoUrl) {
    const gorsel = (
      // Yüklenen görselin boyutu bilinmediği için img kullanılır.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={marka.logoUrl}
        alt="SEO Evi"
        style={{ height: marka.logoYukseklik }}
        className={cn("w-auto object-contain", className)}
      />
    );

    if (!href) return gorsel;
    return (
      <Link href={href} className="inline-flex rounded-[8px] transition-opacity hover:opacity-80">
        {gorsel}
      </Link>
    );
  }

  const icerik = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoIsareti boyut={boyut} />
      <span className="flex flex-col leading-none">
        <span
          className="font-semibold tracking-[-0.02em] text-ink-900"
          style={{ fontSize: boyut * 0.62 }}
        >
          SEO Evi
        </span>
        {altMetin ? (
          <span className="mt-1 text-[10.5px] font-medium tracking-[0.02em] text-ink-400">
            E-ticaret SEO&apos;nun yeni nesli
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return icerik;

  return (
    <Link href={href} className="inline-flex rounded-[8px] transition-opacity hover:opacity-80">
      {icerik}
    </Link>
  );
}
