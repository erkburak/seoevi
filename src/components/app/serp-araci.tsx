"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { SerpGorunumu } from "@/components/app/serp-gorunumu";
import { Buton } from "@/components/ui/button";

/** Serbest kelime ile SERP analizi. */
export function SerpAraci({ ilkKelime = "" }: { ilkKelime?: string }) {
  const [girdi, setGirdi] = useState(ilkKelime);
  const [kelime, setKelime] = useState(ilkKelime);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    const temiz = girdi.trim();
    if (temiz.length < 2) return;
    setKelime(temiz);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={gonder} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-300" aria-hidden />
          <input
            value={girdi}
            onChange={(e) => setGirdi(e.target.value)}
            placeholder="Analiz etmek istediğiniz kelimeyi yazın"
            aria-label="Anahtar kelime"
            className="h-11 w-full rounded-[11px] border border-line bg-white pl-10 pr-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />
        </div>
        <Buton type="submit" disabled={girdi.trim().length < 2}>
          Analiz Et
        </Buton>
      </form>

      {kelime ? (
        <div>
          <p className="mb-4 text-[13px] text-ink-500">
            <span className="font-medium text-ink-900">{kelime}</span> için arama sonuçları
          </p>
          <SerpGorunumu key={kelime} keyword={kelime} />
        </div>
      ) : (
        <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-12 text-center text-[13px] text-ink-400">
          Bir anahtar kelime yazarak arama sonuçlarını inceleyin.
        </p>
      )}
    </div>
  );
}
