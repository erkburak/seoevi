"use client";

import { Bell, Menu, Search, TriangleAlert, X, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Logo } from "@/components/brand/logo";
import { KenarCubuguIcerigi } from "@/components/app/kenar-cubugu";
import { Buton } from "@/components/ui/button";
import { cn, goreliZaman } from "@/lib/utils";
import type { Bildirim, Proje } from "@/types/database";

export function UstCubuk({
  projeler,
  aktifProje,
  kullaniciAdi,
  eposta,
  bildirimler,
  okunmamis,
  yukseltmeKarti,
}: {
  projeler: Proje[];
  aktifProje: Proje;
  kullaniciAdi: string;
  eposta: string;
  bildirimler: Bildirim[];
  okunmamis: number;
  /** Mobil menüde de gösterilen paket yükseltme kartı. */
  yukseltmeKarti?: ReactNode;
}) {
  const [menuAcik, setMenuAcik] = useState(false);
  const [aramaAcik, setAramaAcik] = useState(false);

  useEffect(() => {
    function kisayol(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAramaAcik(true);
      }
    }
    document.addEventListener("keydown", kisayol);
    return () => document.removeEventListener("keydown", kisayol);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMenuAcik(true)}
            aria-label="Menüyü aç"
            className="-ml-1 rounded-[8px] p-2 text-ink-600 transition-colors hover:bg-ink-50 lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="lg:hidden">
            <Logo boyut={22} />
          </div>

          <button
            type="button"
            onClick={() => setAramaAcik(true)}
            className="hidden h-9 w-full max-w-sm items-center gap-2.5 rounded-[10px] border border-line bg-surface-muted px-3 text-left text-[13px] text-ink-400 transition-colors hover:border-ink-200 hover:bg-white lg:flex"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1">Kelime, sayfa, ürün veya rakip ara…</span>
            <kbd className="rounded border border-line bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-ink-400">
              Ctrl K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAramaAcik(true)}
              aria-label="Ara"
              className="rounded-[8px] p-2 text-ink-600 transition-colors hover:bg-ink-50 lg:hidden"
            >
              <Search className="size-5" aria-hidden />
            </button>

            <BildirimMenusu bildirimler={bildirimler} okunmamis={okunmamis} />

            <div className="hidden lg:block">
              <AnaliziYenile projeId={aktifProje.id} />
            </div>
          </div>
        </div>
      </header>

      {menuAcik ? (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="animate-fade absolute inset-0 bg-ink-950/25 backdrop-blur-[2px]" onClick={() => setMenuAcik(false)} aria-hidden />
          <div className="animate-drawer absolute inset-y-0 left-0 w-[268px] border-r border-line bg-white">
            <button
              type="button"
              onClick={() => setMenuAcik(false)}
              aria-label="Menüyü kapat"
              className="absolute right-3 top-4 rounded-[8px] p-1.5 text-ink-400 hover:bg-ink-50"
            >
              <X className="size-4" aria-hidden />
            </button>
            <KenarCubuguIcerigi
              projeler={projeler}
              aktifProje={aktifProje}
              kullaniciAdi={kullaniciAdi}
              eposta={eposta}
              yukseltmeKarti={yukseltmeKarti}
              onGezinme={() => setMenuAcik(false)}
            />
          </div>
        </div>
      ) : null}

      {aramaAcik ? <GenelArama kapat={() => setAramaAcik(false)} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Analizi yenile                                                      */
/* ------------------------------------------------------------------ */

export function AnaliziYenile({ projeId, boyut = "sm" }: { projeId: string; boyut?: "sm" | "md" }) {
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [limitAsildi, setLimitAsildi] = useState(false);
  const router = useRouter();

  async function baslat() {
    setCalisiyor(true);
    setHata(null);
    setLimitAsildi(false);

    try {
      const yanit = await fetch("/api/analiz/basla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projeId, tur: "tam_analiz" }),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "Analiz başlatılamadı.");
        setLimitAsildi(Boolean(veri.limitAsildi));
        setCalisiyor(false);
        return;
      }

      router.push(`/genel-bakis?analiz=${veri.isId}`);
      router.refresh();
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setCalisiyor(false);
    }
  }

  return (
    <div className="relative">
      <Buton boyut={boyut} onClick={baslat} yukleniyor={calisiyor}>
        <RefreshCw aria-hidden />
        Analizi Yenile
      </Buton>
      {hata ? (
        /*
         * Limit uyarısı bir kenar balonu değil, karar gerektiren bir
         * bildirimdir: kullanıcının ne yapabileceğini de göstermesi
         * gerekir. Bu yüzden okunur genişlikte, kapatılabilir ve
         * yükseltme bağlantısı taşıyan bir kutu olarak çizilir.
         */
        <div
          role="alert"
          className="animate-fade absolute right-0 top-[calc(100%+8px)] z-50 w-[min(22rem,calc(100vw-2rem))] rounded-[12px] border border-line bg-white p-4 text-left shadow-float"
        >
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-caution" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink-900">
                {limitAsildi ? "Aylık tarama hakkınız doldu" : "Analiz başlatılamadı"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{hata}</p>

              <div className="mt-3 flex items-center gap-2">
                {limitAsildi ? (
                  <Buton asChild boyut="sm">
                    <Link href="/fiyatlandirma">Paketleri gör</Link>
                  </Buton>
                ) : null}
                <Buton gorunum="sessiz" boyut="sm" onClick={() => setHata(null)}>
                  Kapat
                </Buton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Bildirimler                                                         */
/* ------------------------------------------------------------------ */

const ONEM_RENGI: Record<string, string> = {
  bilgi: "bg-info",
  basari: "bg-positive",
  uyari: "bg-caution",
  kritik: "bg-critical",
};

function BildirimMenusu({ bildirimler, okunmamis }: { bildirimler: Bildirim[]; okunmamis: number }) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function disariTiklama(e: MouseEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disariTiklama);
    return () => document.removeEventListener("mousedown", disariTiklama);
  }, []);

  async function tumunuOkunduIsaretle() {
    await fetch("/api/bildirim/okundu", { method: "POST" });
    router.refresh();
  }

  return (
    <div ref={kutu} className="relative">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-label={okunmamis > 0 ? `Bildirimler, ${okunmamis} okunmamış` : "Bildirimler"}
        className="relative rounded-[8px] p-2 text-ink-600 transition-colors hover:bg-ink-50"
      >
        <Bell className="size-5" aria-hidden />
        {okunmamis > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-critical ring-2 ring-white" />
        ) : null}
      </button>

      {acik ? (
        <div className="animate-fade absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] overflow-hidden rounded-[12px] border border-line bg-white shadow-float">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[13px] font-semibold text-ink-900">Bildirimler</h2>
            {okunmamis > 0 ? (
              <button
                type="button"
                onClick={tumunuOkunduIsaretle}
                className="text-[12px] text-ink-400 transition-colors hover:text-ink-900"
              >
                Tümünü okundu işaretle
              </button>
            ) : null}
          </div>

          {bildirimler.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-400">Henüz bildiriminiz yok.</p>
          ) : (
            <ul className="max-h-[380px] divide-y divide-line overflow-y-auto">
              {bildirimler.map((b) => {
                const icerik = (
                  <div className={cn("flex gap-3 px-4 py-3", !b.is_read && "bg-surface-muted/60")}>
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", ONEM_RENGI[b.severity] ?? "bg-ink-300")} />
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-ink-900">{b.title}</p>
                      {b.body ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{b.body}</p> : null}
                      <p className="mt-1 text-[11.5px] text-ink-300">{goreliZaman(b.created_at)}</p>
                    </div>
                  </div>
                );

                return (
                  <li key={b.id}>
                    {b.href ? (
                      <Link href={b.href} onClick={() => setAcik(false)} className="block transition-colors hover:bg-surface-muted">
                        {icerik}
                      </Link>
                    ) : (
                      icerik
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Genel arama                                                         */
/* ------------------------------------------------------------------ */

type AramaSonucu = {
  tur: string;
  turAdi: string;
  baslik: string;
  altMetin: string | null;
  href: string;
};

/** Arama kutusu boşken gösterilen kısayollar. */
const HIZLI_ERISIM = [
  { baslik: "Genel Bakış", aciklama: "Skorlar ve özet", href: "/genel-bakis" },
  { baslik: "Aksiyon Merkezi", aciklama: "Bu hafta yapılacaklar", href: "/aksiyon-merkezi" },
  { baslik: "Kelime Fırsatları", aciklama: "Kolay kazanımlar", href: "/kelime-firsatlari" },
  { baslik: "Teknik SEO", aciklama: "Açık sorunlar", href: "/teknik-seo" },
  { baslik: "Raporlar", aciklama: "Rapor oluştur", href: "/raporlar" },
];

function GenelArama({ kapat }: { kapat: () => void }) {
  const [sorgu, setSorgu] = useState("");
  const [sonuclar, setSonuclar] = useState<AramaSonucu[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [veriVar, setVeriVar] = useState(true);

  useEffect(() => {
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") kapat();
    }
    document.addEventListener("keydown", tus);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tus);
      document.body.style.overflow = "";
    };
  }, [kapat]);

  useEffect(() => {
    if (sorgu.trim().length < 2) {
      setSonuclar([]);
      return;
    }

    const zamanlayici = setTimeout(async () => {
      setYukleniyor(true);
      try {
        const yanit = await fetch(`/api/arama?q=${encodeURIComponent(sorgu.trim())}`);
        const veri = await yanit.json();
        setSonuclar(veri.sonuclar ?? []);
        setVeriVar(veri.veriVar !== false);
      } catch {
        setSonuclar([]);
      } finally {
        setYukleniyor(false);
      }
    }, 250);

    return () => clearTimeout(zamanlayici);
  }, [sorgu]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]">
      <div className="animate-fade absolute inset-0 bg-ink-950/25 backdrop-blur-[2px]" onClick={kapat} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Genel arama"
        className="animate-rise relative w-full max-w-xl overflow-hidden rounded-[16px] border border-line bg-white shadow-float"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-300" aria-hidden />
          <input
            autoFocus
            value={sorgu}
            onChange={(e) => setSorgu(e.target.value)}
            placeholder="Sayfa, anahtar kelime, ürün veya rakip ara…"
            aria-label="Arama"
            className="h-13 w-full bg-transparent py-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10.5px] text-ink-400">Esc</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto">
          {sorgu.trim().length < 2 ? (
            <div className="px-4 py-6">
              <p className="mb-3 text-[11.5px] font-medium uppercase tracking-[0.06em] text-ink-400">
                Hızlı erişim
              </p>
              <ul className="space-y-0.5">
                {HIZLI_ERISIM.map((h) => (
                  <li key={h.href}>
                    <Link
                      href={h.href}
                      onClick={kapat}
                      className="flex items-center justify-between gap-3 rounded-[9px] px-2.5 py-2 text-[13.5px] text-ink-700 transition-colors hover:bg-surface-muted"
                    >
                      {h.baslik}
                      <span className="text-[11.5px] text-ink-300">{h.aciklama}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : yukleniyor ? (
            <p className="px-4 py-8 text-center text-[13px] text-ink-400">Aranıyor…</p>
          ) : sonuclar.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-[13.5px] text-ink-700">
                &quot;{sorgu}&quot; için sonuç bulunamadı.
              </p>
              {!veriVar ? (
                <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-400">
                  Bu projede henüz analiz verisi yok. Anahtar kelime, sayfa ve ürünler ilk analiz
                  tamamlandıktan sonra aramada görünür.
                </p>
              ) : (
                <p className="mt-2 text-[12.5px] text-ink-400">
                  Farklı bir kelime deneyin.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {sonuclar.map((s, i) => (
                <li key={`${s.tur}-${i}`}>
                  <Link
                    href={s.href}
                    onClick={kapat}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] text-ink-900">{s.baslik}</span>
                      {s.altMetin ? (
                        <span className="mt-0.5 block truncate text-[12px] text-ink-400">{s.altMetin}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-500">
                      {s.turAdi}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
