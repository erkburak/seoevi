"use client";

import { ExternalLink, RefreshCw } from "lucide-react";
import { useState } from "react";

import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { cn, kirp, sayi } from "@/lib/utils";
import type { Cihaz, SerpOgesi } from "@/types/database";

export type SerpVerisi = {
  keyword: string;
  toplam_sonuc: number | null;
  ogeler: SerpOgesi[];
  ozellikler: { tur: string; ad: string; pozisyon: number | null; bizde_mi: boolean }[];
  bizim_pozisyon: number | null;
  bizim_url: string | null;
  rakip_pozisyonlari: { alan_adi: string; pozisyon: number; url: string | null }[];
  sorular: string[];
  ilgili_aramalar: string[];
  alisveris_var: boolean;
};

/**
 * Arama sonuçları görünümü.
 * Veri kullanıcı istediğinde çekilir; böylece gereksiz sorgu maliyeti oluşmaz.
 */
export function SerpGorunumu({
  keywordId,
  keyword,
  ilkVeri,
  sonAlinma,
}: {
  keywordId?: string;
  keyword: string;
  ilkVeri?: SerpVerisi | null;
  sonAlinma?: string | null;
}) {
  const [veri, setVeri] = useState<SerpVerisi | null>(ilkVeri ?? null);
  const [cihaz, setCihaz] = useState<Cihaz>("desktop");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function getir(secilenCihaz: Cihaz = cihaz, zorla = false) {
    setYukleniyor(true);
    setHata(null);
    setCihaz(secilenCihaz);

    try {
      const yanit = await fetch("/api/serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywordId, keyword, cihaz: secilenCihaz, zorla }),
      });
      const govde = await yanit.json();

      if (!yanit.ok) {
        setHata(govde.hata ?? "Arama sonuçları alınamadı.");
        return;
      }
      setVeri(govde.veri as SerpVerisi);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[9px] border border-line bg-surface-muted p-0.5">
          {(["desktop", "mobile"] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => (veri ? getir(c) : setCihaz(c))}
              className={cn(
                "rounded-[7px] px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                cihaz === c ? "bg-white text-ink-900 shadow-subtle" : "text-ink-400 hover:text-ink-700",
              )}
            >
              {c === "desktop" ? "Masaüstü" : "Mobil"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {sonAlinma && !veri ? (
            <span className="text-[12px] text-ink-400">Son ölçüm: {sonAlinma}</span>
          ) : null}
          <Buton gorunum="ikincil" boyut="sm" onClick={() => getir(cihaz, Boolean(veri))} yukleniyor={yukleniyor}>
            <RefreshCw aria-hidden />
            {veri ? "Yenile" : "Arama Sonuçlarını Getir"}
          </Buton>
        </div>
      </div>

      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}

      {!veri && !yukleniyor && !hata ? (
        <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-10 text-center text-[13px] text-ink-400">
          Bu kelimenin güncel arama sonuçlarını görmek için yukarıdaki düğmeyi kullanın.
        </p>
      ) : null}

      {veri ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            {veri.bizim_pozisyon ? (
              <Rozet ton="olumlu" nokta>
                {veri.bizim_pozisyon}. sıradasınız
              </Rozet>
            ) : (
              <Rozet ton="uyari" nokta>
                İlk 30&apos;da görünmüyorsunuz
              </Rozet>
            )}
            {veri.toplam_sonuc ? <Rozet>{sayi(veri.toplam_sonuc)} sonuç</Rozet> : null}
            {veri.alisveris_var ? <Rozet ton="bilgi">Alışveriş alanı var</Rozet> : null}
          </div>

          {veri.ozellikler.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                Arama sonucu özellikleri
              </p>
              <div className="flex flex-wrap gap-1.5">
                {veri.ozellikler.map((o) => (
                  <Rozet key={o.tur} ton={o.bizde_mi ? "olumlu" : "notr"}>
                    {o.ad}
                    {o.bizde_mi ? " · sizde" : ""}
                  </Rozet>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
              Organik sonuçlar
            </p>
            <ol className="divide-y divide-line rounded-[12px] border border-line bg-white">
              {veri.ogeler
                .filter((o) => o.tur === "organic")
                .slice(0, 20)
                .map((o, i) => (
                  <li
                    key={`${o.url}-${i}`}
                    className={cn(
                      "flex gap-3 px-4 py-3",
                      o.bizim_mi && "bg-positive-soft/50",
                      o.rakip_mi && "bg-caution-soft/40",
                    )}
                  >
                    <span className="tabular w-6 shrink-0 pt-0.5 text-[13px] font-medium text-ink-400">
                      {o.pozisyon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[12px] text-ink-400">{o.alan_adi}</span>
                        {o.bizim_mi ? <Rozet ton="olumlu">Siz</Rozet> : null}
                        {o.rakip_mi ? <Rozet ton="uyari">Rakip</Rozet> : null}
                      </div>
                      <p className="mt-0.5 text-[13.5px] font-medium text-ink-900">
                        {kirp(o.baslik, 90)}
                      </p>
                      {o.aciklama ? (
                        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                          {kirp(o.aciklama, 180)}
                        </p>
                      ) : null}
                    </div>
                    {o.url ? (
                      <a
                        href={o.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Sayfayı aç"
                        className="shrink-0 self-start p-1 text-ink-300 transition-colors hover:text-ink-700"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </li>
                ))}
            </ol>
          </div>

          {veri.sorular.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                İnsanlar bunu da soruyor
              </p>
              <ul className="space-y-1.5">
                {veri.sorular.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13px] text-ink-600">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {veri.ilgili_aramalar.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                İlgili aramalar
              </p>
              <div className="flex flex-wrap gap-1.5">
                {veri.ilgili_aramalar.map((a) => (
                  <Rozet key={a}>{a}</Rozet>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
