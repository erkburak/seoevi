import { ArrowRight, TrendingDown, TrendingUp, TriangleAlert } from "lucide-react";
import Link from "next/link";

import type { Alarm } from "@/lib/analiz/alarm";
import { cn, goreliZaman } from "@/lib/utils";

/**
 * Günlük alarm paneli.
 *
 * Kullanıcı sabah panele girdiğinde ilk göreceği şey budur: dün ne oldu?
 * Sıralama tablosuna bakmadan, tek bakışta.
 *
 * Alarmlar eşik üstü değişimlerde üretilir; her gün kırmızı gösteren bir
 * panel kısa sürede görmezden gelinir.
 */

const ONEM_STILI = {
  kritik: {
    nokta: "bg-critical",
    metin: "text-critical",
    kutu: "border-critical/20 bg-critical-soft/50",
    ikon: TrendingDown,
  },
  uyari: {
    nokta: "bg-caution",
    metin: "text-caution",
    kutu: "border-caution/20 bg-caution-soft/40",
    ikon: TriangleAlert,
  },
  olumlu: {
    nokta: "bg-positive",
    metin: "text-positive",
    kutu: "border-positive/20 bg-positive-soft/40",
    ikon: TrendingUp,
  },
  bilgi: {
    nokta: "bg-ink-300",
    metin: "text-ink-500",
    kutu: "border-line bg-white",
    ikon: TriangleAlert,
  },
} as const;

export function AlarmPaneli({ alarmlar }: { alarmlar: Alarm[] }) {
  if (!alarmlar.length) return null;

  const bugun = new Date().toISOString().slice(0, 10);
  const bugunkuler = alarmlar.filter((a) => a.gun === bugun);
  const gosterilecek = (bugunkuler.length ? bugunkuler : alarmlar).slice(0, 6);

  const kritikSayisi = gosterilecek.filter((a) => a.onem === "kritik").length;

  return (
    <section className="mb-7">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
          {bugunkuler.length ? "Bugün ne oldu?" : "Son değişimler"}
        </h2>
        <span className="text-[12.5px] text-ink-400">
          {kritikSayisi > 0
            ? `${kritikSayisi} kritik değişim`
            : "Eşik üstü değişimler burada görünür"}
        </span>
      </div>

      <ul className="space-y-2">
        {gosterilecek.map((a) => {
          const stil = ONEM_STILI[a.onem] ?? ONEM_STILI.bilgi;
          const Ikon = stil.ikon;

          const icerik = (
            <div
              className={cn(
                "flex items-start gap-3 rounded-[12px] border px-4 py-3 transition-colors",
                stil.kutu,
                a.href && "hover:border-ink-200",
              )}
            >
              <span className={cn("mt-0.5 shrink-0", stil.metin)}>
                <Ikon className="size-4" aria-hidden />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-medium text-ink-900">{a.baslik}</p>
                {a.detay ? (
                  <p className="mt-0.5 truncate text-[12.5px] leading-relaxed text-ink-500">
                    {a.detay}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {a.gun !== bugun ? (
                  <span className="text-[11.5px] text-ink-300">{goreliZaman(a.gun)}</span>
                ) : null}
                {a.href ? (
                  <ArrowRight className="size-3.5 text-ink-300" aria-hidden />
                ) : null}
              </div>
            </div>
          );

          return (
            <li key={a.id}>
              {a.href ? (
                <Link href={a.href} className="block">
                  {icerik}
                </Link>
              ) : (
                icerik
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
