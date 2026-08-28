"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";

import { KopyalanabilirAlan } from "@/components/app/ai-oneri";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";

type Strateji = {
  arama_amaci: string;
  onerilen_baslik: string;
  alt_basliklar: string[];
  konular: string[];
  sorular: string[];
  ic_baglanti_onerileri: string[];
  ozet: string;
};

/** Bir anahtar kelime için içerik planı üretir. */
export function IcerikStratejisiPaneli({ keyword }: { keyword: string }) {
  const [strateji, setStrateji] = useState<Strateji | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function uret() {
    setYukleniyor(true);
    setHata(null);

    try {
      const yanit = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gorev: "icerik", keyword }),
      });
      const veri = await yanit.json();

      if (!yanit.ok) {
        setHata(veri.hata ?? "İçerik planı üretilemedi.");
        return;
      }
      setStrateji(veri.veri as Strateji);
    } catch {
      setHata("Bağlantı kurulamadı. Tekrar deneyin.");
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <div className="space-y-4">
      <Buton gorunum="ikincil" onClick={uret} yukleniyor={yukleniyor}>
        <Sparkles aria-hidden />
        {strateji ? "Planı Yenile" : "İçerik Planı Oluştur"}
      </Buton>

      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}

      {strateji ? (
        <div className="animate-rise space-y-5 rounded-[14px] border border-line bg-white p-5">
          <div>
            <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
              Arama amacı
            </p>
            <p className="text-[13.5px] leading-relaxed text-ink-700">{strateji.arama_amaci}</p>
          </div>

          <KopyalanabilirAlan etiket="Önerilen başlık" deger={strateji.onerilen_baslik} sinir={60} />

          {strateji.alt_basliklar?.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                İçerik yapısı
              </p>
              <ol className="space-y-1.5">
                {strateji.alt_basliklar.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
                    <span className="tabular mt-0.5 text-[11.5px] text-ink-300">H2</span>
                    {b}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {strateji.konular?.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                Ele alınması gereken konular
              </p>
              <div className="flex flex-wrap gap-1.5">
                {strateji.konular.map((k, i) => (
                  <Rozet key={i}>{k}</Rozet>
                ))}
              </div>
            </div>
          ) : null}

          {strateji.sorular?.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                Cevaplanacak sorular
              </p>
              <ul className="space-y-1.5">
                {strateji.sorular.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-ink-600">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-300" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {strateji.ic_baglanti_onerileri?.length ? (
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                İç bağlantı önerileri
              </p>
              <ul className="space-y-1">
                {strateji.ic_baglanti_onerileri.map((b, i) => (
                  <li key={i} className="truncate text-[13px] text-ink-600">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {strateji.ozet ? (
            <p className="border-t border-line pt-4 text-[13px] leading-relaxed text-ink-500">
              {strateji.ozet}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
