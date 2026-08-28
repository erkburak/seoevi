"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { rakipAnaliziniYenile, rakipEkle, rakipSil, type RakipSonucu } from "@/app/(uygulama)/rakipler/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Pencere } from "@/components/ui/overlay";

const BOS: RakipSonucu = {};

export function RakipEklemeFormu({ onerilenler = [] }: { onerilenler?: string[] }) {
  const [durum, gonder, bekliyor] = useActionState(rakipEkle, BOS);
  const [deger, setDeger] = useState("");

  return (
    <div className="space-y-3">
      <form action={gonder} className="flex flex-col gap-2 sm:flex-row">
        <input
          name="domain"
          value={deger}
          onChange={(e) => setDeger(e.target.value)}
          placeholder="rakipmagaza.com"
          aria-label="Rakip alan adı"
          className="h-10 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
        />
        <Buton type="submit" yukleniyor={bekliyor}>
          <Plus aria-hidden />
          Rakip Ekle
        </Buton>
      </form>

      {onerilenler.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[12.5px] text-ink-400">Öneriler:</span>
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

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}
    </div>
  );
}

export function RakipSilDugmesi({ rakipId, domain }: { rakipId: string; domain: string }) {
  const [acik, setAcik] = useState(false);
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function sil() {
    basla(async () => {
      await rakipSil(rakipId);
      setAcik(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAcik(true)}
        aria-label={`${domain} rakibini kaldır`}
        className="rounded-[8px] p-1.5 text-ink-300 transition-colors hover:bg-critical-soft hover:text-critical"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </button>

      <Pencere
        acik={acik}
        kapat={() => setAcik(false)}
        baslik="Rakibi kaldır"
        aciklama={`${domain} takip listenizden çıkarılacak.`}
        genislik="sm"
        altBolum={
          <>
            <Buton gorunum="sessiz" onClick={() => setAcik(false)}>
              Vazgeç
            </Buton>
            <Buton gorunum="tehlike" onClick={sil} yukleniyor={bekliyor}>
              Kaldır
            </Buton>
          </>
        }
      >
        <p className="text-[13.5px] leading-relaxed text-ink-600">
          Bu rakibe ait karşılaştırma verileri kaldırılır. Rakibi dilediğiniz zaman tekrar
          ekleyebilirsiniz.
        </p>
      </Pencere>
    </>
  );
}

export function RakipYenileDugmesi() {
  const [bekliyor, basla] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const router = useRouter();

  function yenile() {
    basla(async () => {
      const sonuc = await rakipAnaliziniYenile();
      setMesaj(sonuc.basari ?? sonuc.hata ?? null);
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <Buton gorunum="ikincil" onClick={yenile} yukleniyor={bekliyor}>
        <RefreshCw aria-hidden />
        Rakip Analizini Yenile
      </Buton>
      {mesaj ? (
        <p className="absolute right-0 top-[calc(100%+6px)] w-64 rounded-[10px] border border-line bg-white px-3 py-2 text-[12px] text-ink-600 shadow-raised">
          {mesaj}
        </p>
      ) : null}
    </div>
  );
}
