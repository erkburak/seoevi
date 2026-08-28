import { Sparkles } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * Kenar çubuğundaki paket yükseltme kartı.
 *
 * Reklam panosu değil, durum göstergesi olarak tasarlanmıştır: kullanıcıya
 * paketinin neresinde olduğunu ve en çok hangi limite yaklaştığını söyler.
 * Limit dolmadıkça sessiz kalır, dolduğunda öne çıkar.
 */
export function YukseltmeKarti({
  planAdi,
  denemeMi,
  denemeGunKaldi,
  doluluk,
  darBogaz,
  hedefPlanAdi,
}: {
  planAdi: string;
  denemeMi: boolean;
  denemeGunKaldi: number | null;
  /** En çok dolan limitin oranı (0-100). */
  doluluk: number;
  /** En çok dolan limitin adı. */
  darBogaz: string | null;
  hedefPlanAdi: string | null;
}) {
  // Yükseltilecek bir üst paket yoksa kart gösterilmez.
  if (!hedefPlanAdi) return null;

  const acil = denemeMi || doluluk >= 80;

  return (
    <Link
      href="/fiyatlandirma"
      className={cn(
        "group mb-2 block rounded-[12px] border p-3 transition-all duration-200",
        acil
          ? "border-ink-800 bg-ink-900 text-white hover:bg-ink-800"
          : "border-line bg-surface-muted hover:border-ink-200 hover:bg-white",
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles
          className={cn("size-3.5 shrink-0", acil ? "text-white/80" : "text-ink-400")}
          aria-hidden
        />
        <span
          className={cn(
            "text-[12.5px] font-semibold",
            acil ? "text-white" : "text-ink-900",
          )}
        >
          {hedefPlanAdi} paketine geçin
        </span>
      </div>

      <p
        className={cn(
          "mt-1.5 text-[11.5px] leading-relaxed",
          acil ? "text-white/60" : "text-ink-400",
        )}
      >
        {denemeMi
          ? denemeGunKaldi !== null && denemeGunKaldi > 0
            ? `Deneme sürenizin bitmesine ${denemeGunKaldi} gün kaldı.`
            : "Deneme süreniz doldu."
          : darBogaz && doluluk >= 60
            ? `${darBogaz} limitinizin %${doluluk}'ini kullandınız.`
            : `${planAdi} paketindesiniz. Daha yüksek limitler için yükseltin.`}
      </p>

      {/* Doluluk çubuğu — deneme dışındaki paketlerde anlamlı */}
      {!denemeMi && doluluk > 0 ? (
        <div
          className={cn(
            "mt-2.5 h-1 w-full overflow-hidden rounded-full",
            acil ? "bg-white/15" : "bg-ink-100",
          )}
        >
          <div
            className={cn("h-full rounded-full", acil ? "bg-white" : "bg-ink-700")}
            style={{ width: `${Math.min(100, doluluk)}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}
