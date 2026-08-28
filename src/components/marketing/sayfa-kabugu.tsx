import type { ReactNode } from "react";

import { PazarlamaAltbilgisi } from "@/components/marketing/footer";
import { PazarlamaBasligi } from "@/components/marketing/header";
import { sunucuIstemcisi } from "@/lib/supabase/server";

/**
 * Herkese açık sayfaların ortak düzeni.
 * Başlık, içerik ve altbilgi; giriş durumu sunucuda okunur.
 */
export async function PazarlamaKabugu({ children }: { children: ReactNode }) {
  const supabase = await sunucuIstemcisi();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      <PazarlamaBasligi girisYapildi={Boolean(user)} />
      <main id="icerik">{children}</main>
      <PazarlamaAltbilgisi />
    </>
  );
}

/** Sayfa üst bloğu — başlık ve açıklama. */
export function SayfaGirisi({
  ustBaslik,
  baslik,
  aciklama,
  children,
}: {
  ustBaslik?: string;
  baslik: string;
  aciklama?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-surface-muted/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8 lg:py-20">
        {ustBaslik ? (
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-400">
            {ustBaslik}
          </p>
        ) : null}
        <h1 className="mt-3 text-[30px] font-semibold leading-[1.15] tracking-[-0.03em] text-ink-900 sm:text-[40px]">
          {baslik}
        </h1>
        {aciklama ? (
          <p className="mx-auto mt-5 max-w-2xl text-[15.5px] leading-relaxed text-ink-500">
            {aciklama}
          </p>
        ) : null}
        {children ? <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div> : null}
      </div>
    </section>
  );
}

/** Ortalanmış içerik kabı. */
export function Icerik({
  children,
  genislik = "orta",
  className = "",
}: {
  children: ReactNode;
  genislik?: "dar" | "orta" | "genis";
  className?: string;
}) {
  const genislikler = {
    dar: "max-w-2xl",
    orta: "max-w-4xl",
    genis: "max-w-6xl",
  } as const;

  return (
    <div className={`mx-auto ${genislikler[genislik]} px-5 py-16 lg:px-8 lg:py-20 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Yasal metinlerin ortak biçimi.
 * Uzun metinleri okunaklı tutmak için satır uzunluğu sınırlanır.
 */
export function YasalMetin({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6 text-[14.5px] leading-[1.75] text-ink-600 [&_a]:font-medium [&_a]:text-ink-900 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-[17px] [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink-900 [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink-900 [&_li]:mb-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
      {children}
    </div>
  );
}
