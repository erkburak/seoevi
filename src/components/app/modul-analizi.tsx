"use client";

import { Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import type { IsTuru } from "@/lib/jobs/types";

/**
 * Tek bir modülün analizini başlatır ve tamamlanana kadar durumu izler.
 * Analiz bittiğinde sayfa yenilenir.
 */
export function ModulAnaliziButonu({
  projeId,
  tur,
  etiket,
  gorunum = "birincil",
  boyut = "md",
  calisanIsId,
}: {
  projeId: string;
  tur: IsTuru;
  etiket: string;
  gorunum?: "birincil" | "ikincil";
  boyut?: "sm" | "md";
  calisanIsId?: string | null;
}) {
  const router = useRouter();
  const [isId, setIsId] = useState<string | null>(calisanIsId ?? null);
  const [baslatiliyor, setBaslatiliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!isId) return;

    let iptal = false;

    async function yokla() {
      try {
        const yanit = await fetch(`/api/analiz/durum?is=${isId}`, { cache: "no-store" });
        if (!yanit.ok) return;
        const veri = await yanit.json();
        if (iptal) return;

        if (veri.durum === "tamamlandi") {
          setIsId(null);
          router.refresh();
        } else if (veri.durum === "hatali" || veri.durum === "iptal") {
          setIsId(null);
          setHata(veri.hata ?? "Analiz tamamlanamadı.");
          // Sayfadaki iş durumu göstergeleri de güncellenmeli.
          router.refresh();
        }
      } catch {
        // geçici hata — bir sonraki yoklamada denenir
      }
    }

    void yokla();
    const zamanlayici = setInterval(yokla, 4000);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
    };
  }, [isId, router]);

  async function baslat() {
    setBaslatiliyor(true);
    setHata(null);

    try {
      const yanit = await fetch("/api/analiz/basla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projeId, tur }),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "Analiz başlatılamadı.");
        return;
      }
      setIsId(veri.isId);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setBaslatiliyor(false);
    }
  }

  return (
    <div className="space-y-2">
      <Buton gorunum={gorunum} boyut={boyut} onClick={baslat} yukleniyor={baslatiliyor || Boolean(isId)}>
        <Play aria-hidden />
        {etiket}
      </Buton>
      {isId ? (
        <p className="text-[12px] text-ink-400">Analiz sürüyor, sonuçlar hazır olunca güncellenecek.</p>
      ) : null}
      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}
    </div>
  );
}
