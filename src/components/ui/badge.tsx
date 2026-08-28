import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Etki, Oncelik, Onem, AramaAmaci } from "@/types/database";

type Ton = "notr" | "olumlu" | "uyari" | "kritik" | "bilgi" | "koyu";

const TONLAR: Record<Ton, string> = {
  notr: "bg-ink-50 text-ink-600 border-ink-100",
  olumlu: "bg-positive-soft text-positive border-positive/15",
  uyari: "bg-caution-soft text-caution border-caution/15",
  kritik: "bg-critical-soft text-critical border-critical/15",
  bilgi: "bg-info-soft text-info border-info/15",
  koyu: "bg-ink-900 text-white border-ink-900",
};

export function Rozet({
  ton = "notr",
  children,
  className,
  nokta = false,
}: {
  ton?: Ton;
  children: ReactNode;
  className?: string;
  nokta?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium leading-5",
        TONLAR[ton],
        className,
      )}
    >
      {nokta ? <span className="size-1.5 rounded-full bg-current opacity-70" /> : null}
      {children}
    </span>
  );
}

const ONEM_TONU: Record<Onem, Ton> = { kritik: "kritik", uyari: "uyari", bilgi: "bilgi" };
const ONEM_ETIKET: Record<Onem, string> = { kritik: "Kritik", uyari: "Uyarı", bilgi: "Bilgi" };

export function OnemRozeti({ onem }: { onem: Onem }) {
  return (
    <Rozet ton={ONEM_TONU[onem]} nokta>
      {ONEM_ETIKET[onem]}
    </Rozet>
  );
}

const ONCELIK_TONU: Record<Oncelik, Ton> = {
  kritik: "kritik",
  yuksek: "uyari",
  orta: "bilgi",
  dusuk: "notr",
};
const ONCELIK_ETIKET: Record<Oncelik, string> = {
  kritik: "Kritik",
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

export function OncelikRozeti({ oncelik }: { oncelik: Oncelik }) {
  return (
    <Rozet ton={ONCELIK_TONU[oncelik]} nokta>
      {ONCELIK_ETIKET[oncelik]}
    </Rozet>
  );
}

export const ETKI_ETIKET: Record<Etki, string> = {
  cok_yuksek: "Çok yüksek",
  yuksek: "Yüksek",
  orta: "Orta",
  dusuk: "Düşük",
};

export function EtkiRozeti({ etki }: { etki: Etki }) {
  return <Rozet ton={etki === "cok_yuksek" || etki === "yuksek" ? "olumlu" : "notr"}>Etki: {ETKI_ETIKET[etki]}</Rozet>;
}

export const AMAC_ETIKET: Record<AramaAmaci, string> = {
  bilgi: "Bilgi",
  ticari: "Ticari",
  islem: "İşlem",
  gezinme: "Gezinme",
};

const AMAC_TONU: Record<AramaAmaci, Ton> = {
  bilgi: "bilgi",
  ticari: "uyari",
  islem: "olumlu",
  gezinme: "notr",
};

export function AmacRozeti({ amac }: { amac: AramaAmaci | null }) {
  if (!amac) return <span className="text-ink-300">—</span>;
  return <Rozet ton={AMAC_TONU[amac]}>{AMAC_ETIKET[amac]}</Rozet>;
}
