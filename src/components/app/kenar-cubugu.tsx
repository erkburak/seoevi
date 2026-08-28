"use client";

import { ChevronsUpDown, Plus, Settings, LogOut, User, Check } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import type { ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { APP_NAV } from "@/config/navigation";
import { cn } from "@/lib/utils";
import type { Proje } from "@/types/database";

export function KenarCubuguIcerigi({
  projeler,
  aktifProje,
  kullaniciAdi,
  eposta,
  yukseltmeKarti,
  onGezinme,
}: {
  projeler: Proje[];
  aktifProje: Proje;
  kullaniciAdi: string;
  eposta: string;
  /** Sunucuda hazırlanan paket yükseltme kartı. */
  yukseltmeKarti?: ReactNode;
  onGezinme?: () => void;
}) {
  const yol = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Logo boyut={24} />
      </div>

      <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-3 pb-4" aria-label="Ana gezinme">
        {APP_NAV.map((grup, i) => (
          <div key={grup.label ?? `grup-${i}`}>
            {grup.label ? (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-300">
                {grup.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {grup.items.map((oge) => {
                const aktif =
                  yol === oge.href ||
                  yol.startsWith(`${oge.href}/`) ||
                  (oge.match ?? []).some((m) => yol === m || yol.startsWith(`${m}/`));

                return (
                  <li key={oge.href}>
                    <Link
                      href={oge.href}
                      onClick={onGezinme}
                      aria-current={aktif ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-[9px] px-3 py-2 text-[13.5px] font-medium transition-colors duration-150",
                        aktif
                          ? "bg-ink-900 text-white"
                          : "text-ink-500 hover:bg-ink-50 hover:text-ink-900",
                      )}
                    >
                      <oge.icon className={cn("size-4 shrink-0", aktif ? "opacity-90" : "opacity-70")} aria-hidden />
                      {oge.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        {yukseltmeKarti}
        <ProjeSecici projeler={projeler} aktifProje={aktifProje} />
        <KullaniciMenusu kullaniciAdi={kullaniciAdi} eposta={eposta} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Proje değiştirici                                                   */
/* ------------------------------------------------------------------ */

function ProjeSecici({ projeler, aktifProje }: { projeler: Proje[]; aktifProje: Proje }) {
  const [acik, setAcik] = useState(false);
  const [degistiriliyor, setDegistiriliyor] = useState<string | null>(null);
  const router = useRouter();
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function disariTiklama(e: MouseEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTiklama);
    return () => document.removeEventListener("mousedown", disariTiklama);
  }, []);

  async function projeDegistir(projeId: string) {
    if (projeId === aktifProje.id) {
      setAcik(false);
      return;
    }
    setDegistiriliyor(projeId);
    await fetch("/api/proje/sec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projeId }),
    });
    setAcik(false);
    setDegistiriliyor(null);
    router.refresh();
  }

  return (
    <div ref={kutu} className="relative">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        aria-label="Proje değiştir"
        className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-ink-50"
      >
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-[7px] bg-ink-900 text-[11px] font-semibold text-white">
          {aktifProje.domain.slice(0, 2).toLocaleUpperCase("tr-TR")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink-900">{aktifProje.domain}</span>
          <span className="block text-[11px] text-ink-400">
            {projeler.length > 1 ? `${projeler.length} proje` : "Aktif proje"}
          </span>
        </span>
        <ChevronsUpDown className="size-3.5 shrink-0 text-ink-300" aria-hidden />
      </button>

      {acik ? (
        <div className="animate-fade absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 rounded-[12px] border border-line bg-white p-1.5 shadow-float">
          <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-300">
            Projeler
          </p>
          {projeler.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => projeDegistir(p.id)}
              disabled={degistiriliyor !== null}
              className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-ink-700 transition-colors hover:bg-surface-muted disabled:opacity-60"
            >
              <span className="min-w-0 flex-1 truncate">{p.domain}</span>
              {p.id === aktifProje.id ? <Check className="size-3.5 text-ink-900" aria-hidden /> : null}
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <Link
            href="/projeler/yeni"
            onClick={() => setAcik(false)}
            className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] font-medium text-ink-900 transition-colors hover:bg-surface-muted"
          >
            <Plus className="size-3.5" aria-hidden />
            Yeni proje ekle
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kullanıcı menüsü                                                    */
/* ------------------------------------------------------------------ */

function KullaniciMenusu({ kullaniciAdi, eposta }: { kullaniciAdi: string; eposta: string }) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function disariTiklama(e: MouseEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTiklama);
    return () => document.removeEventListener("mousedown", disariTiklama);
  }, []);

  const bashHarfler = kullaniciAdi
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toLocaleUpperCase("tr-TR");

  return (
    <div ref={kutu} className="relative mt-1">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left transition-colors hover:bg-ink-50"
      >
        <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-line bg-surface-muted text-[11px] font-semibold text-ink-600">
          {bashHarfler || "SH"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium text-ink-900">{kullaniciAdi}</span>
          <span className="block truncate text-[11px] text-ink-400">{eposta}</span>
        </span>
      </button>

      {acik ? (
        <div className="animate-fade absolute bottom-[calc(100%+6px)] left-0 right-0 z-50 rounded-[12px] border border-line bg-white p-1.5 shadow-float">
          <Link
            href="/hesabim"
            onClick={() => setAcik(false)}
            className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-muted"
          >
            <User className="size-3.5" aria-hidden />
            Hesabım
          </Link>
          <Link
            href="/ayarlar"
            onClick={() => setAcik(false)}
            className="flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-ink-700 transition-colors hover:bg-surface-muted"
          >
            <Settings className="size-3.5" aria-hidden />
            Ayarlar
          </Link>
          <div className="my-1 h-px bg-line" />
          <form action="/auth/cikis" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-left text-[13px] text-ink-700 transition-colors hover:bg-surface-muted"
            >
              <LogOut className="size-3.5" aria-hidden />
              Çıkış Yap
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
