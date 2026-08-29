"use client";

import { Check, Minus, Plus, X } from "lucide-react";
import { useState, useTransition } from "react";

import { takipSorusuEkle, takipSorusuSil } from "@/app/(uygulama)/ai-gorunurlugu/actions";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import type { AiTakipSatiri } from "@/lib/analiz/ai-gorunurluk";
import { kisaSayi, sayi, tarihSaat } from "@/lib/utils";

/**
 * Takip edilen yapay zekâ soruları.
 *
 * Kullanıcı kendi müşterilerinin soracağını düşündüğü soruları girer;
 * her ölçümde o soruya verilen yapay zekâ cevaplarında görünüp
 * görünmediği ve yerine kimin gösterildiği raporlanır.
 */
export function AiTakipListesi({
  projeId,
  takipler,
  limit,
}: {
  projeId: string;
  takipler: AiTakipSatiri[];
  limit: number;
}) {
  const [soru, setSoru] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  const dolu = takipler.length >= limit;

  function ekle() {
    setHata(null);
    basla(async () => {
      const sonuc = await takipSorusuEkle(projeId, soru);
      if (sonuc.hata) {
        setHata(sonuc.hata);
        return;
      }
      setSoru("");
    });
  }

  function sil(id: string) {
    basla(async () => {
      const sonuc = await takipSorusuSil(id);
      if (sonuc.hata) setHata(sonuc.hata);
    });
  }

  return (
    <div>
      {hata ? (
        <Uyari ton="kritik" className="mb-4">
          {hata}
        </Uyari>
      ) : null}

      <div className="rounded-[14px] border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={soru}
            onChange={(e) => setSoru(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && soru.trim() && !dolu) ekle();
            }}
            disabled={dolu}
            maxLength={160}
            placeholder="Örnek: en iyi no frost buzdolabı hangisi"
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5 disabled:bg-surface-muted"
          />
          <Buton onClick={ekle} yukleniyor={bekliyor} disabled={!soru.trim() || dolu}>
            <Plus aria-hidden />
            Soru Ekle
          </Buton>
        </div>

        <p className="mt-2 text-[12.5px] text-ink-400">
          {dolu
            ? `Paketinizdeki ${sayi(limit)} soru hakkının tamamını kullandınız. Yeni soru için birini silin.`
            : `${sayi(takipler.length)} / ${sayi(limit)} soru takip ediliyor. Sorular bir sonraki analizde ölçülür.`}
        </p>
      </div>

      {takipler.length ? (
        <ul className="mt-3 space-y-2">
          {takipler.map((t) => (
            <li key={t.id} className="rounded-[14px] border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.gorunuyorMu === null ? (
                      <Rozet ton="notr">
                        {t.olculduAt ? "Cevap bulunamadı" : "Henüz ölçülmedi"}
                      </Rozet>
                    ) : t.gorunuyorMu ? (
                      <Rozet ton="olumlu">
                        <Check className="mr-1 inline size-3" aria-hidden />
                        Görünüyorsunuz
                      </Rozet>
                    ) : (
                      <Rozet ton="kritik">
                        <Minus className="mr-1 inline size-3" aria-hidden />
                        Görünmüyorsunuz
                      </Rozet>
                    )}

                    {t.cevapSayisi > 0 ? (
                      <Rozet>{sayi(t.cevapSayisi)} yapay zekâ cevabı</Rozet>
                    ) : null}
                    {t.aiAramaHacmi > 0 ? (
                      <Rozet>{kisaSayi(t.aiAramaHacmi)} aylık arama</Rozet>
                    ) : null}
                  </div>

                  <p className="mt-2 text-[14.5px] font-medium text-ink-900">{t.soru}</p>

                  {t.kaynaklar.length ? (
                    <div className="mt-2">
                      <p className="text-[12px] text-ink-400">
                        {t.gorunuyorMu
                          ? "Bu cevaplarda gösterilen siteler:"
                          : "Bu cevaplarda sizin yerinize gösterilen siteler:"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {t.kaynaklar.map((k) => (
                          <span
                            key={k}
                            className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-[12px] text-ink-600"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {t.ornekSoru && t.ornekSoru !== t.soru ? (
                    <p className="mt-2 text-[12.5px] text-ink-500">
                      Eşleşen soru: <span className="text-ink-700">{t.ornekSoru}</span>
                    </p>
                  ) : null}

                  {t.olculduAt ? (
                    <p className="mt-1.5 text-[11.5px] text-ink-300">
                      Ölçüm: {tarihSaat(t.olculduAt)}
                    </p>
                  ) : null}
                </div>

                <Buton
                  gorunum="sessiz"
                  boyut="sm"
                  onClick={() => sil(t.id)}
                  disabled={bekliyor}
                  aria-label="Soruyu takipten çıkar"
                >
                  <X aria-hidden />
                </Buton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
