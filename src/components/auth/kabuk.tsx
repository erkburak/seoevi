import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";

/**
 * Giriş / kayıt sayfalarının ortak düzeni.
 * Solda form, sağda ürünün ne yaptığını anlatan sakin bir panel.
 */
export function AuthKabugu({
  baslik,
  aciklama,
  children,
  altBaglanti,
}: {
  baslik: string;
  aciklama: string;
  children: ReactNode;
  altBaglanti?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,44%)]">
      <div className="flex flex-col px-5 py-8 sm:px-10 lg:px-16">
        <Logo boyut={26} />

        <main id="icerik" className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[400px]">
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink-900">
              {baslik}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{aciklama}</p>

            <div className="mt-8">{children}</div>

            {altBaglanti ? (
              <div className="mt-7 text-center text-[13.5px] text-ink-500">{altBaglanti}</div>
            ) : null}
          </div>
        </main>

        <p className="text-[12px] text-ink-300">
          <Link href="/" className="hover:text-ink-600">
            Ana sayfaya dön
          </Link>
        </p>
      </div>

      <aside className="relative hidden overflow-hidden bg-ink-900 lg:block">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-center px-14">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/40">
            SEO karar destek platformu
          </p>
          <h2 className="mt-5 max-w-md text-[30px] font-semibold leading-[1.2] tracking-[-0.025em] text-white">
            &quot;Sitemi nasıl büyüteceğimi artık biliyorum.&quot;
          </h2>
          <p className="mt-5 max-w-md text-[14.5px] leading-relaxed text-white/55">
            SEO Evi mağazanızı analiz eder, rakiplerinizle karşılaştırır ve bu hafta yapmanız gereken
            işleri önem sırasına dizer.
          </p>

          <ul className="mt-10 space-y-4 border-t border-white/10 pt-8">
            {[
              ["Teknik SEO", "Tarama, indeksleme ve site mimarisi kontrolü"],
              ["Ürün ve kategori SEO", "Her sayfa için ayrı skor ve düzeltme listesi"],
              ["Merchant görünürlüğü", "Google Alışveriş için eksik ürün alanları"],
              ["AI görünürlüğü", "Marka ve ürünlerinizin yapay zekâ cevaplarındaki yeri"],
            ].map(([baslik, metin]) => (
              <li key={baslik}>
                <p className="text-[13.5px] font-medium text-white">{baslik}</p>
                <p className="mt-0.5 text-[13px] text-white/45">{metin}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

/** Form ile sosyal giriş arasındaki ayırıcı. */
export function Ayirici({ metin = "veya" }: { metin?: string }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-line" />
      <span className="text-[12px] text-ink-300">{metin}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
