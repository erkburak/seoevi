"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import { useState } from "react";

import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";
import type { AiOnerisi } from "@/types/database";

type Gorev =
  | { gorev: "aksiyon"; aksiyonId: string }
  | { gorev: "sayfa"; sayfaId: string }
  | { gorev: "urun"; urunId: string };

/**
 * "AI ile Çöz" düğmesi ve öneri paneli.
 * Öneriler yalnızca gösterilir; hiçbir değişiklik otomatik uygulanmaz.
 */
export function AiOneriPaneli({
  gorev,
  mevcutOneri,
  butonMetni = "AI ile Çöz",
  gorunum = "ikincil",
  boyut = "sm",
}: {
  gorev: Gorev;
  mevcutOneri?: AiOnerisi | null;
  butonMetni?: string;
  gorunum?: "birincil" | "ikincil" | "sessiz";
  boyut?: "sm" | "md";
}) {
  const [oneri, setOneri] = useState<AiOnerisi | null>(mevcutOneri ?? null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function calistir() {
    setYukleniyor(true);
    setHata(null);

    try {
      const yanit = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gorev),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "Öneri üretilemedi.");
        return;
      }
      setOneri(veri.veri as AiOnerisi);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Buton gorunum={gorunum} boyut={boyut} onClick={calistir} yukleniyor={yukleniyor}>
          <Sparkles aria-hidden />
          {oneri ? "Öneriyi Yenile" : butonMetni}
        </Buton>
        {oneri ? (
          <span className="text-[12px] text-ink-400">Öneriler yalnızca gösterilir, otomatik uygulanmaz.</span>
        ) : null}
      </div>

      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}

      {oneri ? <OneriIcerigi oneri={oneri} /> : null}
    </div>
  );
}

export function OneriIcerigi({ oneri }: { oneri: AiOnerisi }) {
  return (
    <div className="animate-rise space-y-4 rounded-[12px] border border-line bg-surface-muted/60 p-4">
      <p className="text-[13.5px] font-medium leading-relaxed text-ink-900">{oneri.ozet}</p>

      {oneri.neden.length ? (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
            Neden
          </p>
          <ul className="space-y-1.5">
            {oneri.neden.map((n, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-600">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                {n}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {oneri.oneriler.length ? (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
            Yapılacaklar
          </p>
          <ol className="space-y-2.5">
            {oneri.oneriler.map((o, i) => (
              <li key={i} className="rounded-[10px] border border-line bg-white p-3">
                <p className="text-[13px] font-medium text-ink-900">
                  {i + 1}. {o.baslik}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{o.icerik}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {oneri.onerilen_title ? (
        <KopyalanabilirAlan etiket="Önerilen sayfa başlığı" deger={oneri.onerilen_title} sinir={60} />
      ) : null}

      {oneri.onerilen_aciklama ? (
        <KopyalanabilirAlan etiket="Önerilen meta açıklama" deger={oneri.onerilen_aciklama} sinir={155} />
      ) : null}
    </div>
  );
}

export function KopyalanabilirAlan({
  etiket,
  deger,
  sinir,
}: {
  etiket: string;
  deger: string;
  sinir?: number;
}) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(deger);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Pano erişimi yoksa sessizce geç.
    }
  }

  const uzunluk = deger.length;
  const uygun = sinir ? uzunluk <= sinir : true;

  return (
    <div className="rounded-[10px] border border-line bg-white p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">{etiket}</p>
        <div className="flex items-center gap-2">
          {sinir ? (
            <span className={cn("tabular text-[11.5px]", uygun ? "text-ink-400" : "text-critical")}>
              {uzunluk}/{sinir}
            </span>
          ) : null}
          <button
            type="button"
            onClick={kopyala}
            className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-0.5 text-[11.5px] text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            {kopyalandi ? <Check className="size-3" aria-hidden /> : <Copy className="size-3" aria-hidden />}
            {kopyalandi ? "Kopyalandı" : "Kopyala"}
          </button>
        </div>
      </div>
      <p className="text-[13px] leading-relaxed text-ink-800">{deger}</p>
    </div>
  );
}
