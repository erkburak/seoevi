"use client";

import { Check, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { AmacRozeti } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { FirsatSkoru } from "@/components/ui/score";
import { cn, para, sayi } from "@/lib/utils";
import type { AramaAmaci } from "@/types/database";

type Oneri = {
  keyword: string;
  arama_hacmi: number | null;
  cpc: number | null;
  rekabet: number | null;
  zorluk: number | null;
  amac: AramaAmaci | null;
  firsat: number;
  tahmini_trafik: number;
};

/**
 * Anahtar kelime araştırma aracı.
 * Tohum kelimeden öneriler üretir, seçilenler takip listesine eklenir.
 */
export function KelimeArastirmasi({ ilkTohum = "" }: { ilkTohum?: string }) {
  const router = useRouter();
  const [tohum, setTohum] = useState(ilkTohum);
  const [tur, setTur] = useState<"oneri" | "iliskili">("oneri");
  const [oneriler, setOneriler] = useState<Oneri[]>([]);
  const [secilenler, setSecilenler] = useState<Set<string>>(new Set());
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [arandi, setArandi] = useState(false);

  async function ara(e?: React.FormEvent) {
    e?.preventDefault();
    if (tohum.trim().length < 2) {
      setHata("Aramak için en az iki karakter yazın.");
      return;
    }

    setYukleniyor(true);
    setHata(null);
    setBasari(null);

    try {
      const yanit = await fetch("/api/kelime/arastir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tohum: tohum.trim(), tur }),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "Öneriler alınamadı.");
        return;
      }

      setOneriler(veri.kelimeler ?? []);
      setSecilenler(new Set());
      setArandi(true);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  function secimDegistir(keyword: string) {
    setSecilenler((mevcut) => {
      const yeni = new Set(mevcut);
      if (yeni.has(keyword)) yeni.delete(keyword);
      else yeni.add(keyword);
      return yeni;
    });
  }

  function tumunuSec() {
    if (secilenler.size === oneriler.length) setSecilenler(new Set());
    else setSecilenler(new Set(oneriler.map((o) => o.keyword)));
  }

  async function kaydet() {
    const secilen = oneriler.filter((o) => secilenler.has(o.keyword));
    if (!secilen.length) return;

    setKaydediliyor(true);
    setHata(null);

    try {
      const yanit = await fetch("/api/kelime/kaydet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kelimeler: secilen.map((s) => ({
            keyword: s.keyword,
            arama_hacmi: s.arama_hacmi,
            cpc: s.cpc,
            rekabet: s.rekabet,
            zorluk: s.zorluk,
            amac: s.amac,
          })),
        }),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "Kelimeler kaydedilemedi.");
        return;
      }

      setBasari(`${veri.eklenen} kelime takip listenize eklendi.`);
      setSecilenler(new Set());
      router.refresh();
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setKaydediliyor(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={ara} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden />
            <input
              value={tohum}
              onChange={(e) => setTohum(e.target.value)}
              placeholder="Örnek: buzdolabı, ankastre fırın, spor ayakkabı"
              aria-label="Tohum anahtar kelime"
              className="h-11 w-full rounded-[11px] border border-line bg-white pl-10 pr-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
            />
          </div>
          <Buton type="submit" yukleniyor={yukleniyor} boyut="md">
            Kelimeleri Bul
          </Buton>
        </div>

        <div className="inline-flex rounded-[9px] border border-line bg-surface-muted p-0.5">
          {(
            [
              { deger: "oneri", etiket: "Uzun kuyruk önerileri" },
              { deger: "iliskili", etiket: "İlgili kelimeler" },
            ] as const
          ).map((s) => (
            <button
              key={s.deger}
              type="button"
              onClick={() => setTur(s.deger)}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                tur === s.deger ? "bg-white text-ink-900 shadow-subtle" : "text-ink-400 hover:text-ink-700",
              )}
            >
              {s.etiket}
            </button>
          ))}
        </div>
      </form>

      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}
      {basari ? <Uyari ton="olumlu">{basari}</Uyari> : null}

      {arandi && oneriler.length === 0 && !yukleniyor ? (
        <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-10 text-center text-[13px] text-ink-400">
          Bu kelime için arama hacmi olan öneri bulunamadı. Daha genel bir kelime deneyin.
        </p>
      ) : null}

      {oneriler.length ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-surface-muted px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={tumunuSec}
                className="text-[13px] font-medium text-ink-700 hover:text-ink-900"
              >
                {secilenler.size === oneriler.length ? "Seçimi kaldır" : "Tümünü seç"}
              </button>
              <span className="text-[13px] text-ink-400">
                {sayi(oneriler.length)} öneri
                {secilenler.size > 0 ? ` · ${sayi(secilenler.size)} seçili` : ""}
              </span>
            </div>
            <Buton
              boyut="sm"
              onClick={kaydet}
              disabled={secilenler.size === 0}
              yukleniyor={kaydediliyor}
            >
              <Check aria-hidden />
              Takibe Al
            </Buton>
          </div>

          <div className="table-scroll rounded-[14px] border border-line bg-white">
            <table className="w-full text-[13px]">
              <thead className="bg-surface-muted">
                <tr className="text-[11.5px] text-ink-400">
                  <th className="w-10 px-3 py-2.5" />
                  <th className="px-3 py-2.5 text-left font-medium">Anahtar kelime</th>
                  <th className="px-3 py-2.5 text-right font-medium">Hacim</th>
                  <th className="px-3 py-2.5 text-right font-medium">Zorluk</th>
                  <th className="px-3 py-2.5 text-right font-medium">Tıklama maliyeti</th>
                  <th className="px-3 py-2.5 text-left font-medium">Amaç</th>
                  <th className="px-3 py-2.5 text-right font-medium">Fırsat</th>
                </tr>
              </thead>
              <tbody>
                {oneriler.slice(0, 150).map((o) => {
                  const secili = secilenler.has(o.keyword);
                  return (
                    <tr
                      key={o.keyword}
                      onClick={() => secimDegistir(o.keyword)}
                      className={cn(
                        "cursor-pointer border-t border-line transition-colors",
                        secili ? "bg-ink-900/[0.03]" : "hover:bg-surface-muted/60",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={secili}
                          onChange={() => secimDegistir(o.keyword)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`${o.keyword} seç`}
                          className="size-3.5 accent-ink-900"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-ink-900">{o.keyword}</td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-600">{sayi(o.arama_hacmi)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-600">
                        {o.zorluk ?? <span className="text-ink-300">—</span>}
                      </td>
                      <td className="tabular px-3 py-2.5 text-right text-ink-600">{para(o.cpc)}</td>
                      <td className="px-3 py-2.5">
                        <AmacRozeti amac={o.amac} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <FirsatSkoru skor={o.firsat} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
