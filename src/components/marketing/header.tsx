"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { Buton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MENU = [
  { etiket: "Özellikler", href: "/#ozellikler" },
  { etiket: "SEO Analiz Aracı", href: "/#seo-analiz-araci" },
  { etiket: "Sıra Bulucu", href: "/google-sira-bulucu" },
  { etiket: "E-ticaret SEO", href: "/e-ticaret-seo" },
  { etiket: "Rakip Analizi", href: "/rakip-seo-analizi" },
  { etiket: "Fiyatlandırma", href: "/fiyatlandirma" },
  { etiket: "İletişim", href: "/iletisim" },
];

export function PazarlamaBasligi({ girisYapildi = false }: { girisYapildi?: boolean }) {
  const [acik, setAcik] = useState(false);
  const [kaydirildi, setKaydirildi] = useState(false);

  useEffect(() => {
    function kaydir() {
      setKaydirildi(window.scrollY > 8);
    }
    kaydir();
    window.addEventListener("scroll", kaydir, { passive: true });
    return () => window.removeEventListener("scroll", kaydir);
  }, []);

  useEffect(() => {
    document.body.style.overflow = acik ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [acik]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-200",
        kaydirildi ? "border-b border-line bg-white/85 backdrop-blur-xl" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 lg:px-8">
        <Logo boyut={26} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Ana menü">
          {MENU.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-[8px] px-3 py-2 text-[13.5px] font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
            >
              {m.etiket}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {girisYapildi ? (
            <Buton asChild boyut="sm">
              <Link href="/genel-bakis">Panele Dön</Link>
            </Buton>
          ) : (
            <>
              <Buton asChild gorunum="sessiz" boyut="sm">
                <Link href="/giris">Giriş Yap</Link>
              </Buton>
              <Buton asChild boyut="sm">
                <Link href="/kayit">Ücretsiz Analize Başla</Link>
              </Buton>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setAcik((a) => !a)}
          aria-label={acik ? "Menüyü kapat" : "Menüyü aç"}
          aria-expanded={acik}
          className="rounded-[8px] p-2 text-ink-700 transition-colors hover:bg-ink-50 lg:hidden"
        >
          {acik ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {acik ? (
        <div className="animate-fade fixed inset-x-0 top-16 z-50 border-t border-line bg-white px-5 pb-8 pt-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobil menü">
            {MENU.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setAcik(false)}
                className="rounded-[10px] px-3 py-3 text-[15px] font-medium text-ink-700 transition-colors hover:bg-surface-muted"
              >
                {m.etiket}
              </Link>
            ))}
          </nav>
          <div className="mt-5 flex flex-col gap-2">
            {girisYapildi ? (
              <Buton asChild tamGenislik>
                <Link href="/genel-bakis">Panele Dön</Link>
              </Buton>
            ) : (
              <>
                <Buton asChild tamGenislik>
                  <Link href="/kayit">Ücretsiz Analize Başla</Link>
                </Buton>
                <Buton asChild gorunum="ikincil" tamGenislik>
                  <Link href="/giris">Giriş Yap</Link>
                </Buton>
              </>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
