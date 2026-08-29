"use client";

import { ChevronDown, ExternalLink } from "lucide-react";
import { useState, useTransition , type ReactNode } from "react";

import { aksiyonDurumuGuncelle } from "@/app/(uygulama)/aksiyon-merkezi/actions";
import { AiOneriPaneli } from "@/components/app/ai-oneri";
import { ETKI_ETIKET, OncelikRozeti, Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { cn, sayi, urlYolu } from "@/lib/utils";
import type { AksiyonDurumu, SeoAksiyonu, Zorluk } from "@/types/database";

/** Kart kapalıyken gösterilen adres sayısı. */
const KISA_LISTE = 8;

const ZORLUK_ETIKET: Record<Zorluk, string> = { kolay: "Kolay", orta: "Orta", zor: "Zor" };

const DURUM_ETIKET: Record<AksiyonDurumu, string> = {
  bekliyor: "Bekliyor",
  devam_ediyor: "Devam ediyor",
  tamamlandi: "Tamamlandı",
  yoksayildi: "Yok sayıldı",
};

const KATEGORI_ETIKET: Record<string, string> = {
  teknik: "Teknik",
  icerik: "İçerik",
  keyword: "Anahtar kelime",
  urun: "Ürün",
  kategori: "Kategori",
  merchant: "Merchant",
  backlink: "Geri bağlantı",
  ai: "AI",
};

export function AksiyonKarti({
  aksiyon,
  baslangictaAcik = false,
  etki,
}: {
  aksiyon: SeoAksiyonu;
  baslangictaAcik?: boolean;
  /** Sunucuda hazırlanan etki göstergesi. */
  etki?: ReactNode;
}) {
  const [acik, setAcik] = useState(baslangictaAcik);
  const [tumAdresler, setTumAdresler] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [durum, setDurum] = useState<AksiyonDurumu>(aksiyon.status);
  const [bekliyor, basla] = useTransition();

  function durumDegistir(yeni: AksiyonDurumu) {
    const onceki = durum;
    setDurum(yeni);
    basla(async () => {
      const sonuc = await aksiyonDurumuGuncelle(aksiyon.id, yeni);
      if (sonuc.hata) setDurum(onceki);
    });
  }

  const urller = (aksiyon.source_urls as string[]) ?? [];
  const gorunenUrller = tumAdresler ? urller : urller.slice(0, KISA_LISTE);

  async function adresleriKopyala() {
    try {
      await navigator.clipboard.writeText(urller.join(String.fromCharCode(10)));
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Pano izni yoksa adresler zaten ekranda.
    }
  }

  return (
    <article
      className={cn(
        "rounded-[14px] border bg-white transition-shadow duration-200",
        durum === "tamamlandi" ? "border-line opacity-70" : "border-line hover:shadow-raised",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <OncelikRozeti oncelik={aksiyon.priority} />
            <Rozet>{KATEGORI_ETIKET[aksiyon.category] ?? aksiyon.category}</Rozet>
            <Rozet ton={aksiyon.impact === "cok_yuksek" || aksiyon.impact === "yuksek" ? "olumlu" : "notr"}>
              Etki: {ETKI_ETIKET[aksiyon.impact]}
            </Rozet>
            <Rozet>Zorluk: {ZORLUK_ETIKET[aksiyon.effort]}</Rozet>
            {aksiyon.affected_count > 1 ? (
              <Rozet>{sayi(aksiyon.affected_count)} sayfa</Rozet>
            ) : null}
          </div>

          <h3
            className={cn(
              "mt-2.5 text-[15px] font-medium text-ink-900",
              durum === "tamamlandi" && "line-through decoration-ink-300",
            )}
          >
            {aksiyon.title}
          </h3>

          {aksiyon.description ? (
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{aksiyon.description}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <DurumSecici durum={durum} onDegis={durumDegistir} bekliyor={bekliyor} />
          <button
            type="button"
            onClick={() => setAcik((a) => !a)}
            aria-expanded={acik}
            aria-label={acik ? "Detayı kapat" : "Detayı aç"}
            className="rounded-[8px] p-2 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <ChevronDown className={cn("size-4 transition-transform duration-200", acik && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      {/* Etki göstergesi kart kapalıyken de görünür — asıl değer burada. */}
      {etki ? <div className="px-4 pb-4">{etki}</div> : null}

      {acik ? (
        <div className="animate-fade space-y-5 border-t border-line px-4 py-4">
          {aksiyon.recommendation ? (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                Öneri
              </p>
              <p className="text-[13.5px] leading-relaxed text-ink-700">{aksiyon.recommendation}</p>
            </div>
          ) : null}

          {urller.length ? (
            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-ink-400">
                  Etkilenen adresler
                  <span className="ml-1.5 font-normal normal-case tracking-normal text-ink-300">
                    {gorunenUrller.length} / {sayi(aksiyon.affected_count)}
                  </span>
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={adresleriKopyala}
                    className="cursor-pointer text-[12px] text-ink-400 transition-colors hover:text-ink-900"
                  >
                    {kopyalandi ? "Kopyalandı" : "Listeyi kopyala"}
                  </button>
                  {urller.length > KISA_LISTE ? (
                    <button
                      type="button"
                      onClick={() => setTumAdresler((a) => !a)}
                      className="cursor-pointer text-[12px] font-medium text-ink-600 transition-colors hover:text-ink-900"
                    >
                      {tumAdresler ? "Daha az göster" : `Tümünü göster (${urller.length})`}
                    </button>
                  ) : null}
                </div>
              </div>

              <ul
                className={cn(
                  "space-y-1",
                  tumAdresler && "max-h-72 overflow-y-auto rounded-[8px] border border-line p-2",
                )}
              >
                {gorunenUrller.map((u) => (
                  <li key={u}>
                    <a
                      href={u}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 text-[13px] text-ink-600 transition-colors hover:text-ink-900"
                    >
                      <span className="truncate">{urlYolu(u)}</span>
                      <ExternalLink className="size-3 shrink-0 opacity-60" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>

              {/* Kayıtta tutulandan fazlası varsa bunu gizlemek yerine söyle. */}
              {aksiyon.affected_count > urller.length ? (
                <p className="mt-2 text-[12px] text-ink-400">
                  Listede {urller.length} adres var; kalan{" "}
                  {sayi(aksiyon.affected_count - urller.length)} adresi Teknik SEO ekranından
                  görebilirsiniz.
                </p>
              ) : null}
            </div>
          ) : null}

          <AiOneriPaneli
            gorev={{ gorev: "aksiyon", aksiyonId: aksiyon.id }}
            mevcutOneri={aksiyon.ai_suggestion}
          />
        </div>
      ) : null}
    </article>
  );
}

function DurumSecici({
  durum,
  onDegis,
  bekliyor,
}: {
  durum: AksiyonDurumu;
  onDegis: (d: AksiyonDurumu) => void;
  bekliyor: boolean;
}) {
  const siradaki: Record<AksiyonDurumu, AksiyonDurumu> = {
    bekliyor: "devam_ediyor",
    devam_ediyor: "tamamlandi",
    tamamlandi: "bekliyor",
    yoksayildi: "bekliyor",
  };

  return (
    <Buton
      gorunum={durum === "tamamlandi" ? "sessiz" : "ikincil"}
      boyut="sm"
      onClick={() => onDegis(siradaki[durum])}
      disabled={bekliyor}
      className="min-w-[112px]"
    >
      {DURUM_ETIKET[durum]}
    </Buton>
  );
}
