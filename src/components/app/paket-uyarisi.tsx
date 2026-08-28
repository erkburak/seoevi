import { Lock } from "lucide-react";
import Link from "next/link";

import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { Buton } from "@/components/ui/button";
import { WHATSAPP_MESSAGES } from "@/config/site";

/**
 * Özellik mevcut pakete dahil değilse gösterilir.
 * Çalışmayan bir düğme yerine net bir yükseltme yolu sunar.
 */
export function PaketUyarisi({
  ozellik,
  aciklama,
}: {
  ozellik: string;
  aciklama: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-white/60 px-6 py-14 text-center">
      <span className="mb-4 inline-flex size-11 items-center justify-center rounded-[12px] border border-line bg-surface-muted text-ink-400">
        <Lock className="size-5" aria-hidden />
      </span>
      <h3 className="text-[15px] font-semibold text-ink-900">{ozellik} paketinize dahil değil</h3>
      <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-400">{aciklama}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Buton asChild>
          <Link href="/hesabim">Paketleri İncele</Link>
        </Buton>
        <WhatsappButonu
          mesaj={WHATSAPP_MESSAGES.ozel}
          kaynak="paket_uyarisi"
          gorunum="ikincil"
          cocuk="WhatsApp'tan Konuşalım"
        />
      </div>
    </div>
  );
}
