"use client";

import { Check, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import {
  kullaniciKisitla,
  markaGorseliSil,
  markaGorseliYukle,
  paketDegistir,
  sayfaUstVerisiKaydet,
  type YetkiliSonucu,
} from "@/app/yetkili/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Pencere } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types/database";

const BOS: YetkiliSonucu = {};

/* ------------------------------------------------------------------ */
/* Paket değiştirme                                                    */
/* ------------------------------------------------------------------ */

const DURUMLAR = [
  { deger: "aktif", etiket: "Aktif" },
  { deger: "deneme", etiket: "Deneme" },
  { deger: "gecikmis", etiket: "Ödeme bekliyor" },
  { deger: "iptal", etiket: "İptal" },
  { deger: "sona_erdi", etiket: "Süresi doldu" },
] as const;

export function PaketDegistirDugmesi({
  kullaniciId,
  eposta,
  mevcutPlanId,
  mevcutDurum,
  planlar,
}: {
  kullaniciId: string;
  eposta: string;
  mevcutPlanId: string | null;
  mevcutDurum: string | null;
  planlar: Plan[];
}) {
  const [acik, setAcik] = useState(false);
  const [durum, gonder, bekliyor] = useActionState(paketDegistir, BOS);

  return (
    <>
      <Buton gorunum="ikincil" boyut="sm" onClick={() => setAcik(true)}>
        Paketi Değiştir
      </Buton>

      <Pencere
        acik={acik}
        kapat={() => setAcik(false)}
        baslik="Paketi değiştir"
        aciklama={eposta}
        genislik="sm"
      >
        <form action={gonder} className="space-y-5">
          <input type="hidden" name="kullaniciId" value={kullaniciId} />

          <div className="space-y-1.5">
            <label htmlFor="planId" className="block text-[13px] font-medium text-ink-700">
              Paket
            </label>
            <select
              id="planId"
              name="planId"
              defaultValue={mevcutPlanId ?? "baslangic"}
              className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 focus:border-ink-400 focus:outline-none"
            >
              {planlar.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.price_monthly !== null ? ` — ${p.price_monthly} TL/ay` : " — özel"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="durum" className="block text-[13px] font-medium text-ink-700">
              Abonelik durumu
            </label>
            <select
              id="durum"
              name="durum"
              defaultValue={mevcutDurum ?? "aktif"}
              className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 focus:border-ink-400 focus:outline-none"
            >
              {DURUMLAR.map((d) => (
                <option key={d.deger} value={d.deger}>
                  {d.etiket}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="donemBitisi" className="block text-[13px] font-medium text-ink-700">
              Dönem bitişi
            </label>
            <input
              id="donemBitisi"
              name="donemBitisi"
              type="date"
              className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 focus:border-ink-400 focus:outline-none"
            />
            <p className="text-[12px] text-ink-400">Boş bırakılırsa bir ay sonrası atanır.</p>
          </div>

          {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
          {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Buton type="button" gorunum="sessiz" onClick={() => setAcik(false)}>
              Kapat
            </Buton>
            <Buton type="submit" yukleniyor={bekliyor}>
              Kaydet
            </Buton>
          </div>
        </form>
      </Pencere>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hesap kısıtlama                                                     */
/* ------------------------------------------------------------------ */

export function KisitlaDugmesi({
  kullaniciId,
  kisitli,
}: {
  kullaniciId: string;
  kisitli: boolean;
}) {
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function degistir() {
    basla(async () => {
      await kullaniciKisitla(kullaniciId, !kisitli);
      router.refresh();
    });
  }

  return (
    <Buton
      gorunum={kisitli ? "ikincil" : "sessiz"}
      boyut="sm"
      onClick={degistir}
      yukleniyor={bekliyor}
    >
      {kisitli ? "Kısıtlamayı Kaldır" : "Kısıtla"}
    </Buton>
  );
}

/* ------------------------------------------------------------------ */
/* Marka görseli                                                       */
/* ------------------------------------------------------------------ */

export function MarkaYukleyici({
  tur,
  mevcutUrl,
}: {
  tur: "logo" | "favicon";
  mevcutUrl: string | null;
}) {
  const [durum, gonder, bekliyor] = useActionState(markaGorseliYukle, BOS);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [siliniyor, basla] = useTransition();
  const router = useRouter();

  const baslik = tur === "logo" ? "Logo" : "Favicon";

  function sil() {
    basla(async () => {
      await markaGorseliSil(tur);
      setOnizleme(null);
      router.refresh();
    });
  }

  const gosterilen = onizleme ?? mevcutUrl;

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-[14.5px] font-semibold text-ink-900">{baslik}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">
            {tur === "logo"
              ? "Panelde ve herkese açık sayfalarda görünür. SVG önerilir."
              : "Tarayıcı sekmesinde görünür. 32×32 veya daha büyük kare bir görsel kullanın."}
          </p>
        </div>

        {/* Önizleme */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface-muted",
            tur === "logo" ? "h-14 w-32" : "size-14",
          )}
        >
          {gosterilen ? (
            // Kullanıcının yüklediği görsel; boyutu bilinmediği için img kullanılır.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={gosterilen}
              alt={`${baslik} önizlemesi`}
              className="max-h-10 max-w-[112px] object-contain"
            />
          ) : (
            <span className="text-[11px] text-ink-300">varsayılan</span>
          )}
        </div>
      </div>

      <form action={gonder} className="mt-4 space-y-3">
        <input type="hidden" name="tur" value={tur} />

        <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-dashed border-line-strong bg-surface-muted/50 px-4 py-3 transition-colors hover:border-ink-200">
          <Upload className="size-4 shrink-0 text-ink-400" aria-hidden />
          <span className="text-[13px] text-ink-600">Dosya seçin (SVG, PNG, WebP · en fazla 2 MB)</span>
          <input
            type="file"
            name="dosya"
            accept="image/svg+xml,image/png,image/jpeg,image/webp,image/x-icon"
            className="sr-only"
            onChange={(e) => {
              const d = e.target.files?.[0];
              setOnizleme(d ? URL.createObjectURL(d) : null);
            }}
          />
        </label>

        {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
        {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

        <div className="flex flex-wrap gap-2">
          <Buton type="submit" boyut="sm" yukleniyor={bekliyor}>
            Yükle
          </Buton>
          {mevcutUrl ? (
            <Buton type="button" gorunum="sessiz" boyut="sm" onClick={sil} yukleniyor={siliniyor}>
              <Trash2 aria-hidden />
              Varsayılana dön
            </Buton>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sayfa üst verisi                                                    */
/* ------------------------------------------------------------------ */

export function SayfaUstVerisiFormu({
  path,
  ad,
  varsayilanTitle,
  varsayilanDescription,
  mevcutTitle,
  mevcutDescription,
  mevcutNoindex,
}: {
  path: string;
  ad: string;
  varsayilanTitle: string;
  varsayilanDescription: string;
  mevcutTitle: string | null;
  mevcutDescription: string | null;
  mevcutNoindex: boolean;
}) {
  const [durum, gonder, bekliyor] = useActionState(sayfaUstVerisiKaydet, BOS);
  const [title, setTitle] = useState(mevcutTitle ?? "");
  const [aciklama, setAciklama] = useState(mevcutDescription ?? "");

  const titleUzunluk = (title || varsayilanTitle).length;
  const aciklamaUzunluk = (aciklama || varsayilanDescription).length;

  const titleTonu =
    titleUzunluk > 60 ? "text-critical" : titleUzunluk < 30 ? "text-caution" : "text-positive";
  const aciklamaTonu =
    aciklamaUzunluk > 158 ? "text-critical" : aciklamaUzunluk < 70 ? "text-caution" : "text-positive";

  return (
    <details className="group rounded-[14px] border border-line bg-white">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
        <div className="min-w-0">
          <span className="text-[14px] font-medium text-ink-900">{ad}</span>
          <span className="ml-2 text-[12.5px] text-ink-400">{path}</span>
        </div>
        <span className="flex shrink-0 items-center gap-2">
          {mevcutTitle || mevcutDescription ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-positive-soft px-2 py-0.5 text-[11px] text-positive">
              <Check className="size-3" aria-hidden />
              özel
            </span>
          ) : (
            <span className="rounded-full bg-ink-50 px-2 py-0.5 text-[11px] text-ink-400">
              varsayılan
            </span>
          )}
        </span>
      </summary>

      <form action={gonder} className="space-y-4 border-t border-line px-4 py-4">
        <input type="hidden" name="path" value={path} />

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[13px] font-medium text-ink-700">Başlık etiketi</label>
            <span className={cn("tabular text-[12px] font-medium", titleTonu)}>
              {titleUzunluk} / 60
            </span>
          </div>
          <input
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={varsayilanTitle}
            maxLength={120}
            className="h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none"
          />
          <p className="text-[12px] text-ink-400">
            Boş bırakırsanız varsayılan kullanılır.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[13px] font-medium text-ink-700">Meta açıklama</label>
            <span className={cn("tabular text-[12px] font-medium", aciklamaTonu)}>
              {aciklamaUzunluk} / 158
            </span>
          </div>
          <textarea
            name="description"
            value={aciklama}
            onChange={(e) => setAciklama(e.target.value)}
            placeholder={varsayilanDescription}
            maxLength={320}
            rows={3}
            className="w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none"
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            name="noindex"
            defaultChecked={mevcutNoindex}
            className="size-4 accent-ink-900"
          />
          <span className="text-[13px] text-ink-600">
            Arama motorlarına kapat (noindex)
          </span>
        </label>

        {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
        {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

        <Buton type="submit" boyut="sm" yukleniyor={bekliyor}>
          Kaydet
        </Buton>
      </form>
    </details>
  );
}
