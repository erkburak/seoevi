"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  firsatDurumuGuncelle,
  icerikAnaliziBaslat,
  type IcerikSonucu,
} from "@/app/(uygulama)/icerik-analizi/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";

const BOS: IcerikSonucu = {};

/**
 * İçerik analizi başlatma formu.
 * Analiz arka planda çalıştığından iş bitene kadar durum yoklanır.
 */
export function IcerikAnaliziFormu({ onerilenler = [] }: { onerilenler?: string[] }) {
  const [durum, gonder, bekliyor] = useActionState(icerikAnaliziBaslat, BOS);
  const [deger, setDeger] = useState("");
  const [isId, setIsId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (durum.isId) setIsId(durum.isId);
  }, [durum.isId]);

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
          setHata(veri.hata ?? "İçerik analizi tamamlanamadı.");
          router.refresh();
        }
      } catch {
        // Geçici ağ hatası — bir sonraki yoklamada denenir.
      }
    }

    void yokla();
    const zamanlayici = setInterval(yokla, 4000);
    return () => {
      iptal = true;
      clearInterval(zamanlayici);
    };
  }, [isId, router]);

  return (
    <div className="space-y-3">
      <form action={gonder} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-300"
            aria-hidden
          />
          <input
            name="keyword"
            value={deger}
            onChange={(e) => setDeger(e.target.value)}
            placeholder="Örnek: vestel buzdolabı"
            aria-label="İçerik analizi yapılacak anahtar kelime"
            className="h-11 w-full rounded-[10px] border border-line bg-white pl-10 pr-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />
        </div>
        <Buton type="submit" yukleniyor={bekliyor || Boolean(isId)} boyut="lg">
          İçeriği Analiz Et
        </Buton>
      </form>

      {onerilenler.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-ink-400">Takip ettiğiniz kelimeler:</span>
          {onerilenler.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setDeger(o)}
              className="rounded-full border border-line bg-white px-2.5 py-1 text-[12px] text-ink-600 transition-colors hover:border-ink-200 hover:bg-surface-muted"
            >
              {o}
            </button>
          ))}
        </div>
      ) : null}

      {isId ? (
        <p className="text-[12.5px] text-ink-400">
          Arama sonuçlarındaki güçlü sayfalar inceleniyor. Bu işlem yarım dakika sürebilir.
        </p>
      ) : null}

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}
      {durum.basari && !isId && !hata ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}
    </div>
  );
}

const DURUMLAR = [
  { deger: "acik", etiket: "Açık" },
  { deger: "planlandi", etiket: "Planlandı" },
  { deger: "yazildi", etiket: "Yazıldı" },
  { deger: "yayinlandi", etiket: "Yayınlandı" },
] as const;

/** İçerik fırsatının durumunu değiştirir. */
export function FirsatDurumSecici({
  firsatId,
  mevcut,
}: {
  firsatId: string;
  mevcut: "acik" | "planlandi" | "yazildi" | "yayinlandi";
}) {
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function degistir(yeni: string) {
    basla(async () => {
      await firsatDurumuGuncelle(firsatId, yeni as (typeof DURUMLAR)[number]["deger"]);
      router.refresh();
    });
  }

  return (
    <select
      value={mevcut}
      disabled={bekliyor}
      onChange={(e) => degistir(e.target.value)}
      aria-label="İçerik durumu"
      className="h-8 rounded-[8px] border border-line bg-white px-2 text-[12.5px] text-ink-700 focus:border-ink-400 focus:outline-none disabled:opacity-60"
    >
      {DURUMLAR.map((d) => (
        <option key={d.deger} value={d.deger}>
          {d.etiket}
        </option>
      ))}
    </select>
  );
}
