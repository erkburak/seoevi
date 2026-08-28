"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BilgiDongusu } from "@/components/ui/bilgi-dongusu";
import { Buton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IsAdimi } from "@/types/database";

type Durum = {
  durum: string;
  ilerleme: number;
  adimlar: IsAdimi[];
  hata: string | null;
  /** Kuyrukta önünde bekleyen iş sayısı. */
  sira?: number;
  gecenSaniye?: number;
};

/** Saniyeyi "1 dk 20 sn" biçiminde yazar. */
function sureMetni(saniye: number): string {
  if (saniye < 60) return `${saniye} sn`;
  const dk = Math.floor(saniye / 60);
  const sn = saniye % 60;
  return sn ? `${dk} dk ${sn} sn` : `${dk} dk`;
}

/**
 * Analiz ilerlemesini gösterir ve arka plandaki işi yoklayarak ilerletir.
 * Kullanıcı sayfada beklerken adımlar tek tek tamamlanır.
 */
export function AnalizDurumu({ isId, ilkDurum }: { isId: string; ilkDurum?: Durum }) {
  const router = useRouter();
  const [durum, setDurum] = useState<Durum>(
    ilkDurum ?? { durum: "bekliyor", ilerleme: 0, adimlar: [], hata: null, sira: 0, gecenSaniye: 0 },
  );
  const [kapatildi, setKapatildi] = useState(false);

  useEffect(() => {
    if (durum.durum === "tamamlandi" || durum.durum === "hatali" || durum.durum === "iptal") return;

    let iptal = false;

    async function yokla() {
      try {
        const yanit = await fetch(`/api/analiz/durum?is=${isId}`, { cache: "no-store" });
        if (!yanit.ok) return;
        const veri = (await yanit.json()) as Durum;
        if (iptal) return;

        setDurum(veri);

        // İş bittiğinde — başarılı ya da değil — sunucu bileşenleri tazelenir.
        // Aksi hâlde sayfadaki diğer bölümler işi hâlâ "devam ediyor" gösterir.
        if (veri.durum === "tamamlandi" || veri.durum === "hatali" || veri.durum === "iptal") {
          router.refresh();
        }
      } catch {
        // Geçici ağ hatası — bir sonraki yoklamada tekrar denenir.
      }
    }

    void yokla();
    const zamanlayici = setInterval(yokla, 4000);

    return () => {
      iptal = true;
      clearInterval(zamanlayici);
    };
  }, [isId, durum.durum, router]);

  if (kapatildi) return null;

  const bitti = durum.durum === "tamamlandi";
  const hatali = durum.durum === "hatali";

  if (bitti) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-positive/20 bg-positive-soft px-4 py-3">
        <p className="text-[13.5px] text-ink-700">
          <span className="font-medium text-ink-900">Analiz tamamlandı.</span> Sonuçlar aşağıda güncellendi.
        </p>
        <Buton gorunum="sessiz" boyut="sm" onClick={() => setKapatildi(true)}>
          Kapat
        </Buton>
      </div>
    );
  }

  if (hatali) {
    return (
      <div className="mb-6 rounded-[12px] border border-critical/20 bg-critical-soft px-4 py-3.5">
        <p className="text-[13.5px] font-medium text-ink-900">Analiz tamamlanamadı</p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
          {durum.hata ?? "Verileri alırken geçici bir sorun oluştu. Birkaç dakika sonra tekrar deneyebilirsiniz."}
        </p>
      </div>
    );
  }

  const kuyrukta = (durum.sira ?? 0) > 0;

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="overflow-hidden rounded-[14px] border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[14px] font-medium text-ink-900">
                {kuyrukta ? "Analiz sıraya alındı" : "Analiz hazırlanıyor"}
              </p>
              {kuyrukta ? (
                <span className="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-medium text-white">
                  Sırada {durum.sira}. iş var
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-[13px] text-ink-500">
              {kuyrukta
                ? "Önünüzdeki analizler tamamlanınca sizinki otomatik başlayacak."
                : "Web sitenizin SEO verilerini topluyoruz. Bu ekranı kapatabilirsiniz, işlem arka planda sürer."}
            </p>
          </div>
          <div className="text-right">
            <span className="tabular block text-[15px] font-semibold text-ink-900">
              %{durum.ilerleme}
            </span>
            {durum.gecenSaniye ? (
              <span className="tabular text-[11.5px] text-ink-400">
                {sureMetni(durum.gecenSaniye)}
              </span>
            ) : null}
          </div>
        </div>

        {/* İlerleme çubuğu — ilerleme durduğunda bile hareket eden parıltı,
            işin devam ettiğini görsel olarak belli eder. */}
        <div className="relative h-1 w-full overflow-hidden bg-ink-50">
          <div
            className="h-full bg-ink-900"
            style={{ width: `${durum.ilerleme}%`, transition: "width 600ms var(--ease-out-soft)" }}
          />
          <div className="parilti pointer-events-none absolute inset-y-0 left-0 w-1/3" aria-hidden />
        </div>

        <ol className="divide-y divide-line">
          {durum.adimlar.map((adim, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cn(
                  "inline-flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] transition-colors duration-300",
                  adim.durum === "tamamlandi"
                    ? "border-positive bg-positive-soft text-positive"
                    : adim.durum === "isleniyor"
                      ? "border-ink-900 text-ink-900"
                      : "border-line text-ink-300",
                )}
              >
                {adim.durum === "tamamlandi" ? (
                  <Check className="size-3" aria-hidden />
                ) : adim.durum === "isleniyor" ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-[13px] transition-colors duration-300",
                  adim.durum === "bekliyor" ? "text-ink-300" : "text-ink-700",
                  adim.durum === "isleniyor" && "font-medium text-ink-900",
                )}
              >
                {adim.ad}
                {adim.durum === "isleniyor" ? "…" : ""}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Bekleme boş geçmesin — bu sırada işe yarayacak bilgiler */}
      <BilgiDongusu className="hidden lg:block" />
    </div>
  );
}
