import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Buton } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sayfa bulunamadı",
  robots: { index: false, follow: false },
};

const BAGLANTILAR = [
  { etiket: "Google Sıra Bulucu", href: "/google-sira-bulucu" },
  { etiket: "Ücretsiz SEO analizi", href: "/ucretsiz-seo-analizi" },
  { etiket: "E-ticaret SEO", href: "/e-ticaret-seo" },
  { etiket: "Fiyatlandırma", href: "/fiyatlandirma" },
  { etiket: "İletişim", href: "/iletisim" },
];

export default function BulunamadiSayfasi() {
  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo boyut={26} />

      <main id="icerik" className="flex flex-1 items-center py-10">
        <div className="mx-auto w-full max-w-lg text-center">
          <p className="tabular text-[13px] font-semibold uppercase tracking-[0.08em] text-ink-300">
            404
          </p>
          <h1 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink-900 sm:text-[32px]">
            Aradığınız sayfayı bulamadık.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-500">
            Belki de Google&apos;da daha iyi sıralanan bir sayfaya ihtiyacınız vardır.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Buton asChild>
              <Link href="/genel-bakis">Genel Bakışa Dön</Link>
            </Buton>
            <Buton asChild gorunum="ikincil">
              <Link href="/">Ana Sayfa</Link>
            </Buton>
          </div>

          <div className="mt-12 border-t border-line pt-6">
            <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-400">
              Bunlar ilginizi çekebilir
            </p>
            <ul className="mt-4 flex flex-wrap justify-center gap-2">
              {BAGLANTILAR.map((b) => (
                <li key={b.href}>
                  <Link
                    href={b.href}
                    className="inline-flex rounded-full border border-line bg-white px-3.5 py-1.5 text-[13px] text-ink-600 transition-colors hover:border-ink-200 hover:text-ink-900"
                  >
                    {b.etiket}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
