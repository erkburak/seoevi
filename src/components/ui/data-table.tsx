"use client";

import { ChevronDown, ChevronUp, ChevronsUpDown, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { cn, sayi } from "@/lib/utils";
import { Buton } from "@/components/ui/button";

export type TabloKolonu = {
  baslik: string;
  ipucu?: string;
  hizala?: "sol" | "sag";
  genislik?: string;
  siralanabilir?: boolean;
  /** Mobil kart görünümünde gizlenir. */
  mobilGizle?: boolean;
  /** Kolon seçicide kapatılamaz. */
  sabit?: boolean;
};

export type TabloSatiri = {
  id: string;
  /** Sunucuda oluşturulmuş hücre içerikleri. */
  hucreler: ReactNode[];
  /** Sıralama ve arama için ham değerler. */
  degerler: (string | number | null)[];
  href?: string;
};

/**
 * Sıralama, arama, kolon seçimi ve sayfalama destekleyen tablo.
 * Hücreler sunucuda hazırlanır; bu bileşen yalnızca etkileşimi yönetir.
 */
export function VeriTablosu({
  kolonlar,
  satirlar,
  aramaYerTutucu = "Tabloda ara…",
  sayfaBoyutu = 25,
  aramaGoster = true,
  kolonSeciciGoster = true,
  bosMetin = "Kayıt bulunamadı.",
  className,
  ustAksiyon,
}: {
  kolonlar: TabloKolonu[];
  satirlar: TabloSatiri[];
  aramaYerTutucu?: string;
  sayfaBoyutu?: number;
  aramaGoster?: boolean;
  kolonSeciciGoster?: boolean;
  bosMetin?: string;
  className?: string;
  ustAksiyon?: ReactNode;
}) {
  const [arama, setArama] = useState("");
  const [siralama, setSiralama] = useState<{ index: number; yon: "artan" | "azalan" } | null>(null);
  const [sayfa, setSayfa] = useState(0);
  const [gizli, setGizli] = useState<Set<number>>(new Set());
  const [seciciAcik, setSeciciAcik] = useState(false);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    if (!q) return satirlar;
    return satirlar.filter((s) =>
      s.degerler.some((d) => d !== null && String(d).toLocaleLowerCase("tr-TR").includes(q)),
    );
  }, [satirlar, arama]);

  const sirali = useMemo(() => {
    if (!siralama) return filtreli;
    const { index, yon } = siralama;
    const carpan = yon === "artan" ? 1 : -1;
    return [...filtreli].sort((a, b) => {
      const av = a.degerler[index];
      const bv = b.degerler[index];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * carpan;
      return String(av).localeCompare(String(bv), "tr-TR") * carpan;
    });
  }, [filtreli, siralama]);

  const toplamSayfa = Math.max(1, Math.ceil(sirali.length / sayfaBoyutu));
  const gecerliSayfa = Math.min(sayfa, toplamSayfa - 1);
  const gorunen = sirali.slice(gecerliSayfa * sayfaBoyutu, (gecerliSayfa + 1) * sayfaBoyutu);

  function siralamayiDegistir(index: number) {
    setSayfa(0);
    setSiralama((mevcut) => {
      if (!mevcut || mevcut.index !== index) return { index, yon: "azalan" };
      if (mevcut.yon === "azalan") return { index, yon: "artan" };
      return null;
    });
  }

  function kolonuDegistir(index: number) {
    setGizli((mevcut) => {
      const yeni = new Set(mevcut);
      if (yeni.has(index)) yeni.delete(index);
      else yeni.add(index);
      return yeni;
    });
  }

  const gorunurKolonlar = kolonlar.map((k, i) => ({ ...k, index: i })).filter((k) => !gizli.has(k.index));

  return (
    <div className={cn("space-y-3", className)}>
      {(aramaGoster || kolonSeciciGoster || ustAksiyon) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {aramaGoster ? (
            <div className="relative min-w-0 flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden />
              <input
                type="search"
                value={arama}
                onChange={(e) => {
                  setArama(e.target.value);
                  setSayfa(0);
                }}
                placeholder={aramaYerTutucu}
                aria-label={aramaYerTutucu}
                className="h-9 w-full rounded-[10px] border border-line bg-white pl-9 pr-3 text-[13px] text-ink-900 placeholder:text-ink-300 focus:border-ink-300 focus:outline-none"
              />
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            {ustAksiyon}
            {kolonSeciciGoster ? (
              <div className="relative">
                <Buton gorunum="ikincil" boyut="sm" onClick={() => setSeciciAcik((a) => !a)} aria-expanded={seciciAcik}>
                  <SlidersHorizontal aria-hidden />
                  Kolonlar
                </Buton>
                {seciciAcik ? (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setSeciciAcik(false)} aria-hidden />
                    <div className="animate-fade absolute right-0 top-[calc(100%+6px)] z-40 w-56 rounded-[12px] border border-line bg-white p-1.5 shadow-float">
                      {kolonlar.map((k, i) => (
                        <label
                          key={k.baslik}
                          className={cn(
                            "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-[13px] text-ink-700 hover:bg-surface-muted",
                            k.sabit && "cursor-not-allowed opacity-50",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={!gizli.has(i)}
                            disabled={k.sabit}
                            onChange={() => kolonuDegistir(i)}
                            className="size-3.5 accent-ink-900"
                          />
                          {k.baslik}
                        </label>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {gorunen.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-white/60 px-6 py-12 text-center text-[13px] text-ink-400">
          {arama ? `"${arama}" için sonuç bulunamadı.` : bosMetin}
        </div>
      ) : (
        <>
          {/* Masaüstü tablo */}
          <div className="table-scroll hidden rounded-[14px] border border-line bg-white md:block">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-surface-muted/95 backdrop-blur">
                <tr>
                  {gorunurKolonlar.map((k) => (
                    <th
                      key={k.baslik}
                      scope="col"
                      style={k.genislik ? { width: k.genislik } : undefined}
                      className={cn(
                        "whitespace-nowrap border-b border-line px-3.5 py-2.5 text-[12px] font-medium text-ink-500",
                        k.hizala === "sag" ? "text-right" : "text-left",
                      )}
                    >
                      {k.siralanabilir !== false ? (
                        <button
                          type="button"
                          onClick={() => siralamayiDegistir(k.index)}
                          className={cn(
                            "inline-flex items-center gap-1 transition-colors hover:text-ink-900",
                            k.hizala === "sag" && "flex-row-reverse",
                          )}
                          title={k.ipucu}
                        >
                          {k.baslik}
                          {siralama?.index === k.index ? (
                            siralama.yon === "artan" ? (
                              <ChevronUp className="size-3" aria-hidden />
                            ) : (
                              <ChevronDown className="size-3" aria-hidden />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3 opacity-30" aria-hidden />
                          )}
                        </button>
                      ) : (
                        <span title={k.ipucu}>{k.baslik}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gorunen.map((s) => (
                  <tr key={s.id} className="group border-b border-line last:border-0 transition-colors hover:bg-surface-muted/60">
                    {gorunurKolonlar.map((k) => (
                      <td
                        key={k.baslik}
                        className={cn(
                          "px-3.5 py-3 align-middle text-ink-700",
                          k.hizala === "sag" ? "text-right" : "text-left",
                        )}
                      >
                        {s.hucreler[k.index]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobil kart görünümü */}
          <div className="space-y-2 md:hidden">
            {gorunen.map((s) => {
              const icerik = (
                <div className="rounded-[12px] border border-line bg-white p-3.5">
                  <div className="mb-2.5 text-[14px] font-medium text-ink-900">{s.hucreler[0]}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {gorunurKolonlar.slice(1).map((k) =>
                      k.mobilGizle ? null : (
                        <div key={k.baslik} className="min-w-0">
                          <dt className="text-[11px] text-ink-400">{k.baslik}</dt>
                          <dd className="truncate text-[13px] text-ink-700">{s.hucreler[k.index]}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                </div>
              );
              return s.href ? (
                <Link key={s.id} href={s.href} className="block">
                  {icerik}
                </Link>
              ) : (
                <div key={s.id}>{icerik}</div>
              );
            })}
          </div>

          {toplamSayfa > 1 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <p className="text-[12.5px] text-ink-400">
                {sayi(gecerliSayfa * sayfaBoyutu + 1)}–{sayi(Math.min((gecerliSayfa + 1) * sayfaBoyutu, sirali.length))} /{" "}
                {sayi(sirali.length)} kayıt
              </p>
              <div className="flex items-center gap-1.5">
                <Buton
                  gorunum="ikincil"
                  boyut="sm"
                  onClick={() => setSayfa((p) => Math.max(0, p - 1))}
                  disabled={gecerliSayfa === 0}
                >
                  Önceki
                </Buton>
                <span className="tabular px-2 text-[12.5px] text-ink-500">
                  {gecerliSayfa + 1} / {toplamSayfa}
                </span>
                <Buton
                  gorunum="ikincil"
                  boyut="sm"
                  onClick={() => setSayfa((p) => Math.min(toplamSayfa - 1, p + 1))}
                  disabled={gecerliSayfa >= toplamSayfa - 1}
                >
                  Sonraki
                </Buton>
              </div>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-400">{sayi(sirali.length)} kayıt</p>
          )}
        </>
      )}
    </div>
  );
}
