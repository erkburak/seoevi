import { ArrowLeft, Image as ImageIcon, LayoutGrid, Tags, Users, MessagesSquare} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { yetkiliGerekli } from "@/lib/yetkili";

export const metadata: Metadata = {
  title: "Yetkili",
  robots: { index: false, follow: false },
};

const MENU = [
  { etiket: "Genel", href: "/yetkili", ikon: LayoutGrid },
  { etiket: "Kullanıcılar", href: "/yetkili/kullanicilar", ikon: Users },
  { etiket: "Marka", href: "/yetkili/marka", ikon: ImageIcon },
  { etiket: "Talepler", href: "/yetkili/talepler", ikon: MessagesSquare },
  { etiket: "Sayfa Bilgileri", href: "/yetkili/sayfa-bilgileri", ikon: Tags },
];

/**
 * Yetkili alanı düzeni.
 *
 * Ayrı bir uygulama veya alan adı değildir; aynı Next.js uygulamasının
 * içinde, role kapalı bir bölümdür. Erişim denetimi burada yapılır ve
 * her sunucu eyleminde ayrıca tekrarlanır.
 */
export default async function YetkiliYerlesimi({ children }: { children: React.ReactNode }) {
  const yetkili = await yetkiliGerekli();

  return (
    <div className="min-h-dvh bg-surface-muted/40">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <Logo boyut={24} href="/genel-bakis" />
            <span className="rounded-full border border-line bg-surface-muted px-2.5 py-0.5 text-[11.5px] font-medium text-ink-500">
              Yetkili
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden text-[12.5px] text-ink-400 sm:inline">{yetkili.eposta}</span>
            <Link
              href="/genel-bakis"
              className="inline-flex items-center gap-1.5 text-[13px] text-ink-500 transition-colors hover:text-ink-900"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Panele dön
            </Link>
          </div>
        </div>

        <nav className="mx-auto max-w-6xl px-5 lg:px-8" aria-label="Yetkili menüsü">
          <ul className="flex gap-1 overflow-x-auto">
            {MENU.map((m) => {
              const Ikon = m.ikon;
              return (
                <li key={m.href}>
                  <Link
                    href={m.href}
                    className="inline-flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-[13.5px] font-medium text-ink-500 transition-colors hover:border-ink-200 hover:text-ink-900"
                  >
                    <Ikon className="size-4" aria-hidden />
                    {m.etiket}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      <main id="icerik" className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
