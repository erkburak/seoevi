"use client";

import { FileBarChart, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { raporSil, raporUret, type RaporSonucu } from "@/app/(uygulama)/raporlar/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Alan } from "@/components/ui/form";
import { Pencere } from "@/components/ui/overlay";
import { BOLUM_ACIKLAMASI, BOLUM_ADI, RAPOR_BOLUMLERI } from "@/lib/analiz/rapor-bolumleri";

const BOS: RaporSonucu = {};

/** Rapor oluşturma penceresi. */
export function RaporOlusturDugmesi({ projeAdi }: { projeAdi: string }) {
  const [acik, setAcik] = useState(false);
  const [durum, gonder, bekliyor] = useActionState(raporUret, BOS);

  const bugun = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(new Date());

  return (
    <>
      <Buton onClick={() => setAcik(true)}>
        <FileBarChart aria-hidden />
        Rapor Oluştur
      </Buton>

      <Pencere
        acik={acik}
        kapat={() => setAcik(false)}
        baslik="Yeni rapor"
        aciklama="Rapor, oluşturulduğu andaki verilerin kopyasını saklar. Sonradan veriler değişse bile rapor aynı kalır."
      >
        <form action={gonder} id="rapor-formu" className="space-y-6">
          <Alan
            etiket="Rapor başlığı"
            name="baslik"
            defaultValue={`${projeAdi} — ${bugun}`}
            maxLength={120}
            required
          />

          <div className="space-y-2.5">
            <span className="block text-[13px] font-medium text-ink-700">Dönem</span>
            <div className="flex flex-wrap gap-2">
              {[
                { deger: "7", etiket: "Son 7 gün" },
                { deger: "30", etiket: "Son 30 gün" },
                { deger: "90", etiket: "Son 90 gün" },
                { deger: "tumu", etiket: "Tüm zamanlar" },
              ].map((d, i) => (
                <label key={d.deger} className="cursor-pointer">
                  <input
                    type="radio"
                    name="donem"
                    value={d.deger}
                    defaultChecked={i === 1}
                    className="peer sr-only"
                  />
                  <span className="inline-flex items-center rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-600 transition-colors hover:border-ink-200 peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-white">
                    {d.etiket}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-[13px] font-medium text-ink-700">Bölümler</span>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {RAPOR_BOLUMLERI.map((b) => (
                <label
                  key={b}
                  className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-line bg-white p-2.5 transition-colors hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    name="bolumler"
                    value={b}
                    defaultChecked
                    className="mt-0.5 size-4 shrink-0 accent-ink-900"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink-900">{BOLUM_ADI[b]}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-400">
                      {BOLUM_ACIKLAMASI[b]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Buton type="button" gorunum="sessiz" onClick={() => setAcik(false)}>
              Vazgeç
            </Buton>
            <Buton type="submit" yukleniyor={bekliyor}>
              Raporu Oluştur
            </Buton>
          </div>
        </form>
      </Pencere>
    </>
  );
}

/** Rapor silme düğmesi. */
export function RaporSilDugmesi({ raporId, baslik }: { raporId: string; baslik: string }) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function sil() {
    basla(async () => {
      await raporSil(raporId);
      setAcik(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label={`${baslik} raporunu sil`}
        className="rounded-[8px] p-1.5 text-ink-300 transition-colors hover:bg-critical-soft hover:text-critical"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>

      <Pencere
        acik={acik}
        kapat={() => setAcik(false)}
        baslik="Raporu sil"
        aciklama={baslik}
        genislik="sm"
        altBolum={
          <>
            <Buton gorunum="sessiz" onClick={() => setAcik(false)}>
              Vazgeç
            </Buton>
            <Buton gorunum="tehlike" onClick={sil} yukleniyor={bekliyor}>
              Sil
            </Buton>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-600">
          Bu rapor kalıcı olarak silinecek. Analiz verileriniz etkilenmez; dilediğiniz zaman yeni bir
          rapor oluşturabilirsiniz.
        </p>
      </Pencere>
    </>
  );
}

/** Raporu yazdırma / PDF olarak kaydetme. */
export function RaporYazdirDugmesi() {
  return (
    <Buton gorunum="ikincil" onClick={() => window.print()}>
      Yazdır / PDF
    </Buton>
  );
}
