import type { ReactNode } from "react";

import { cn, sayi, arasinda } from "@/lib/utils";

export type SkorSeviyesi = "iyi" | "orta" | "zayif" | "yok";

export function skorSeviyesi(skor: number | null | undefined): SkorSeviyesi {
  if (skor === null || skor === undefined) return "yok";
  if (skor >= 80) return "iyi";
  if (skor >= 55) return "orta";
  return "zayif";
}

const SEVIYE_RENK: Record<SkorSeviyesi, string> = {
  iyi: "var(--color-positive)",
  orta: "var(--color-caution)",
  zayif: "var(--color-critical)",
  yok: "var(--color-ink-200)",
};

export const SEVIYE_ETIKET: Record<SkorSeviyesi, string> = {
  iyi: "İyi durumda",
  orta: "Geliştirilebilir",
  zayif: "Acil ilgi gerekiyor",
  yok: "Veri yok",
};

/**
 * Dairesel skor göstergesi.
 * Sayı animasyonu yerine sade ve okunaklı bir yay kullanılır.
 */
export function SkorHalkasi({
  skor,
  boyut = 92,
  kalinlik = 7,
  etiket,
  className,
}: {
  skor: number | null | undefined;
  boyut?: number;
  kalinlik?: number;
  etiket?: string;
  className?: string;
}) {
  const seviye = skorSeviyesi(skor);
  const deger = skor === null || skor === undefined ? 0 : arasinda(skor, 0, 100);
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const dolu = (deger / 100) * cevre;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: boyut, height: boyut }}>
      <svg width={boyut} height={boyut} viewBox={`0 0 ${boyut} ${boyut}`} className="-rotate-90">
        <circle
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          fill="none"
          stroke="var(--color-ink-100)"
          strokeWidth={kalinlik}
        />
        <circle
          cx={boyut / 2}
          cy={boyut / 2}
          r={r}
          fill="none"
          stroke={SEVIYE_RENK[seviye]}
          strokeWidth={kalinlik}
          strokeLinecap="round"
          strokeDasharray={`${dolu} ${cevre - dolu}`}
          style={{ transition: "stroke-dasharray 600ms var(--ease-out-soft)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tabular text-[20px] font-semibold leading-none tracking-[-0.02em] text-ink-900">
          {skor === null || skor === undefined ? "—" : Math.round(deger)}
        </span>
        {etiket ? <span className="mt-1 text-[10.5px] font-medium text-ink-400">{etiket}</span> : null}
      </div>
    </div>
  );
}

/** Yatay skor çubuğu — alt kırılımlar için. */
export function SkorCubugu({
  etiket,
  skor,
  ipucu,
  className,
}: {
  etiket: string;
  skor: number | null | undefined;
  ipucu?: ReactNode;
  className?: string;
}) {
  const seviye = skorSeviyesi(skor);
  const deger = skor === null || skor === undefined ? 0 : arasinda(skor, 0, 100);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-1.5 text-[13px] text-ink-600">
          {etiket}
          {ipucu}
        </span>
        <span className="tabular text-[13px] font-semibold text-ink-900">
          {skor === null || skor === undefined ? "—" : Math.round(deger)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full"
          style={{
            width: `${deger}%`,
            background: SEVIYE_RENK[seviye],
            transition: "width 600ms var(--ease-out-soft)",
          }}
        />
      </div>
    </div>
  );
}

/** Kullanım oranı çubuğu (limit göstergesi). */
export function KullanimCubugu({
  etiket,
  kullanilan,
  limit,
  className,
}: {
  etiket: string;
  kullanilan: number;
  limit: number;
  className?: string;
}) {
  const oran = limit > 0 ? arasinda((kullanilan / limit) * 100, 0, 100) : 0;
  const renk =
    oran >= 90 ? "var(--color-critical)" : oran >= 70 ? "var(--color-caution)" : "var(--color-ink-700)";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] text-ink-600">{etiket}</span>
        <span className="tabular text-[12px] text-ink-400">
          {sayi(kullanilan)} / {limit >= 100000 ? "sınırsız" : sayi(limit)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full"
          style={{ width: `${oran}%`, background: renk, transition: "width 600ms var(--ease-out-soft)" }}
        />
      </div>
    </div>
  );
}

/** Pozisyon değişimi göstergesi. */
export function PozisyonDegisimi({
  simdiki,
  onceki,
  className,
}: {
  simdiki: number | null | undefined;
  onceki: number | null | undefined;
  className?: string;
}) {
  if (simdiki === null || simdiki === undefined || onceki === null || onceki === undefined) {
    return <span className={cn("text-ink-300", className)}>—</span>;
  }

  const fark = onceki - simdiki; // pozitif = yükseldi

  if (fark === 0) {
    return (
      <span className={cn("tabular inline-flex items-center gap-1 text-[13px] text-ink-400", className)}>
        <span aria-hidden>—</span>
        <span className="sr-only">Değişmedi</span>
      </span>
    );
  }

  const yukseldi = fark > 0;
  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-0.5 text-[13px] font-medium",
        yukseldi ? "text-positive" : "text-critical",
        className,
      )}
    >
      <span aria-hidden>{yukseldi ? "↑" : "↓"}</span>
      {Math.abs(fark)}
      <span className="sr-only">{yukseldi ? "sıra yükseldi" : "sıra düştü"}</span>
    </span>
  );
}

/** Fırsat skoru rozeti — 0-100. */
export function FirsatSkoru({ skor, className }: { skor: number; className?: string }) {
  const ton =
    skor >= 75
      ? "bg-positive-soft text-positive"
      : skor >= 50
        ? "bg-caution-soft text-caution"
        : "bg-ink-50 text-ink-500";

  return (
    <span
      className={cn(
        "tabular inline-flex min-w-9 items-center justify-center rounded-[7px] px-1.5 py-0.5 text-[13px] font-semibold",
        ton,
        className,
      )}
    >
      {Math.round(skor)}
    </span>
  );
}
