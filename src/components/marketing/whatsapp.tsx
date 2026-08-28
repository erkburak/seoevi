"use client";

import type { ReactNode } from "react";

import { Buton } from "@/components/ui/button";
import { whatsappLink } from "@/config/site";
import { cn } from "@/lib/utils";

function WhatsappIkonu({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cn("size-4", className)} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.86 1.21 3.06c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.41-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23a8.19 8.19 0 0 1 8.22 8.24c0 4.54-3.7 8.23-8.23 8.23z" />
    </svg>
  );
}

/**
 * WhatsApp iletişim düğmesi.
 * Tıklamalar hangi sayfadan geldiği bilgisiyle birlikte kaydedilir.
 */
export function WhatsappButonu({
  mesaj,
  kaynak,
  paket,
  gorunum = "whatsapp",
  boyut = "md",
  tamGenislik,
  cocuk = "WhatsApp'tan Konuşalım",
  className,
}: {
  mesaj: string;
  kaynak: string;
  paket?: string;
  gorunum?: "whatsapp" | "ikincil" | "sessiz" | "cizgili";
  boyut?: "sm" | "md" | "lg";
  tamGenislik?: boolean;
  cocuk?: ReactNode;
  className?: string;
}) {
  function tiklandi() {
    void fetch("/api/olay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        olay: "whatsapp_clicked",
        kaynak,
        ozellikler: paket ? { paket } : {},
      }),
      keepalive: true,
    }).catch(() => undefined);
  }

  return (
    <Buton asChild gorunum={gorunum} boyut={boyut} tamGenislik={tamGenislik} className={className}>
      <a href={whatsappLink(mesaj)} target="_blank" rel="noopener noreferrer" onClick={tiklandi}>
        <WhatsappIkonu />
        {cocuk}
      </a>
    </Buton>
  );
}

/** Sayfa görüntüleme olayını bir kez kaydeder. */
export function SayfaOlayi({ olay, kaynak }: { olay: "pricing_viewed"; kaynak: string }) {
  if (typeof window !== "undefined") {
    const anahtar = `seoevi_olay_${olay}_${kaynak}`;
    if (!window.sessionStorage.getItem(anahtar)) {
      window.sessionStorage.setItem(anahtar, "1");
      void fetch("/api/olay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ olay, kaynak }),
        keepalive: true,
      }).catch(() => undefined);
    }
  }
  return null;
}
