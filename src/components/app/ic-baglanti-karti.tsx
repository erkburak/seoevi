"use client";

import { ArrowDown, Check, ChevronDown, Copy, ExternalLink, X } from "lucide-react";
import { useState, useTransition } from "react";

import { oneriDurumuGuncelle } from "@/app/(uygulama)/ic-baglanti/actions";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import type { BaglantiOnerisi, HedefGrubu } from "@/lib/analiz/ic-baglanti";
import { cn, kisaSayi, urlYolu } from "@/lib/utils";

/**
 * Tek bir hedef sayfa ve ona bağlantı verebilecek kaynak sayfalar.
 *
 * Kullanıcının sorusu "hangi sayfam zayıf" değil, "bugün ne yapayım"
 * olduğu için kart doğrudan uygulanabilir hâlde sunulur: hangi sayfayı
 * açacağı, hangi metni yazacağı ve nereye bağlayacağı yazılıdır.
 */
export function IcBaglantiKarti({ grup }: { grup: HedefGrubu }) {
  const [acik, setAcik] = useState(false);
  const [durumlar, setDurumlar] = useState<Record<string, BaglantiOnerisi["durum"]>>({});
  const [bekliyor, basla] = useTransition();

  function durumDegistir(oneri: BaglantiOnerisi, yeni: BaglantiOnerisi["durum"]) {
    const onceki = durumlar[oneri.id] ?? oneri.durum;
    setDurumlar((d) => ({ ...d, [oneri.id]: yeni }));
    basla(async () => {
      const sonuc = await oneriDurumuGuncelle(oneri.id, yeni);
      if (sonuc.hata) setDurumlar((d) => ({ ...d, [oneri.id]: onceki }));
    });
  }

  const gorunenler = grup.oneriler.filter((o) => (durumlar[o.id] ?? o.durum) !== "yoksayildi");
  const uygulanan = gorunenler.filter((o) => (durumlar[o.id] ?? o.durum) === "uygulandi").length;

  if (!gorunenler.length) return null;

  return (
    <article className="rounded-[14px] border border-line bg-white transition-shadow duration-200 hover:shadow-raised">
      <button
        type="button"
        onClick={() => setAcik((a) => !a)}
        aria-expanded={acik}
        className="flex w-full cursor-pointer items-start justify-between gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {grup.pozisyon !== null ? (
              <Rozet ton={grup.pozisyon <= 20 ? "uyari" : "notr"}>
                {Math.round(grup.pozisyon)}. sıra
              </Rozet>
            ) : (
              <Rozet ton="notr">sıralanmıyor</Rozet>
            )}
            {grup.hacim ? <Rozet>{kisaSayi(grup.hacim)} aylık arama</Rozet> : null}
            <Rozet ton={grup.mevcutGelenLink === 0 ? "kritik" : "notr"}>
              {grup.mevcutGelenLink === 0
                ? "hiç iç bağlantı yok"
                : `${grup.mevcutGelenLink} iç bağlantı`}
            </Rozet>
          </div>

          <p className="mt-2 truncate text-[14.5px] font-medium text-ink-900">
            {grup.hedefBaslik ?? urlYolu(grup.hedefUrl)}
          </p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-400">{urlYolu(grup.hedefUrl)}</p>

          <p className="mt-2 text-[13px] text-ink-600">
            <strong className="font-medium text-ink-900">{gorunenler.length} sayfa</strong> bu
            sayfaya bağlantı verebilir
            {grup.keyword ? (
              <>
                {" "}
                — hedef kelime: <span className="text-ink-900">{grup.keyword}</span>
              </>
            ) : null}
            {uygulanan > 0 ? (
              <span className="text-positive"> · {uygulanan} tanesi uygulandı</span>
            ) : null}
          </p>
        </div>

        <ChevronDown
          className={cn(
            "mt-1 size-4 shrink-0 text-ink-300 transition-transform duration-200",
            acik && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {acik ? (
        <ul className="divide-y divide-line border-t border-line">
          {gorunenler.map((o) => {
            const durum = durumlar[o.id] ?? o.durum;
            return (
              <li
                key={o.id}
                className={cn("px-4 py-3.5", durum === "uygulandi" && "bg-positive-soft/25")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-ink-50 text-[11.5px] font-semibold text-ink-600">
                        {o.skor}
                      </span>
                      <a
                        href={o.kaynakUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-w-0 items-center gap-1 truncate text-[13.5px] text-ink-700 transition-colors hover:text-ink-900"
                      >
                        <span className="truncate">
                          {o.kaynakBaslik ?? urlYolu(o.kaynakUrl)}
                        </span>
                        <ExternalLink className="size-3 shrink-0 text-ink-300" aria-hidden />
                      </a>
                    </div>

                    <p className="mt-1 pl-8 truncate text-[12px] text-ink-400">
                      {urlYolu(o.kaynakUrl)}
                    </p>

                    <div className="mt-2 pl-8">
                      <div className="flex items-center gap-2 text-[12.5px] text-ink-500">
                        <ArrowDown className="size-3.5 shrink-0 text-ink-300" aria-hidden />
                        <span>şu bağlantı metniyle:</span>
                      </div>
                      <AnchorKopyala metin={o.anchorMetni} />
                    </div>

                    {o.gerekce ? (
                      <p className="mt-2 pl-8 text-[12.5px] leading-relaxed text-ink-500">
                        {o.gerekce}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {durum === "uygulandi" ? (
                      <Buton
                        gorunum="sessiz"
                        boyut="sm"
                        disabled={bekliyor}
                        onClick={() => durumDegistir(o, "yeni")}
                      >
                        <Check className="text-positive" aria-hidden />
                        Uygulandı
                      </Buton>
                    ) : (
                      <>
                        <Buton
                          gorunum="ikincil"
                          boyut="sm"
                          disabled={bekliyor}
                          onClick={() => durumDegistir(o, "uygulandi")}
                        >
                          <Check aria-hidden />
                          Uyguladım
                        </Buton>
                        <Buton
                          gorunum="sessiz"
                          boyut="sm"
                          disabled={bekliyor}
                          aria-label="Bu öneriyi yoksay"
                          onClick={() => durumDegistir(o, "yoksayildi")}
                        >
                          <X aria-hidden />
                        </Buton>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}

/** Bağlantı metnini tek tıkla panoya kopyalar. */
function AnchorKopyala({ metin }: { metin: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Pano izni yoksa metin zaten ekranda seçilebilir hâlde.
    }
  }

  return (
    <button
      type="button"
      onClick={kopyala}
      className="mt-1 inline-flex max-w-full cursor-pointer items-center gap-2 rounded-[8px] border border-line bg-surface-muted/60 px-2.5 py-1.5 text-left transition-colors hover:border-ink-200"
    >
      <span className="truncate text-[13px] font-medium text-ink-900">{metin}</span>
      {kopyalandi ? (
        <Check className="size-3.5 shrink-0 text-positive" aria-hidden />
      ) : (
        <Copy className="size-3.5 shrink-0 text-ink-300" aria-hidden />
      )}
      <span className="sr-only">Bağlantı metnini kopyala</span>
    </button>
  );
}
