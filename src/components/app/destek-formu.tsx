"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";

import { talepOlustur } from "@/app/(uygulama)/beraber-inceleyelim/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";

/** Kullanıcının hangi konuda destek istediğini seçmesi işi hızlandırır. */
const KONU_ONERILERI = [
  "Rapordaki bir bulguyu anlamadım",
  "Hangi işe önce başlamalıyım?",
  "Rakiplerime göre nerede duruyorum?",
  "Anahtar kelime seçimimi birlikte gözden geçirelim",
  "Teknik bir sorunu nasıl düzelteceğimi bilmiyorum",
];

export function DestekFormu({ projeId }: { projeId: string | null }) {
  const [konu, setKonu] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderildi, setGonderildi] = useState(false);
  const [bekliyor, basla] = useTransition();

  function gonder() {
    setHata(null);
    basla(async () => {
      const sonuc = await talepOlustur({
        konu,
        mesaj,
        projeId,
        kaynakSayfa: typeof window !== "undefined" ? window.location.pathname : undefined,
      });

      if (sonuc.hata) {
        setHata(sonuc.hata);
        return;
      }

      setGonderildi(true);
      setKonu("");
      setMesaj("");
    });
  }

  if (gonderildi) {
    return (
      <div className="rounded-[14px] border border-positive/20 bg-positive-soft/50 p-5">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden />
          <div>
            <p className="text-[14px] font-medium text-ink-900">Talebiniz bize ulaştı</p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
              Verilerinizi detaylı inceleyip dönüş sağlayacağız. Yanıt hazır olduğunda bildirim
              alacaksınız ve bu sayfada görebileceksiniz.
            </p>
            <Buton
              gorunum="ikincil"
              boyut="sm"
              className="mt-4"
              onClick={() => setGonderildi(false)}
            >
              Yeni talep oluştur
            </Buton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      {hata ? (
        <Uyari ton="kritik" className="mb-4">
          {hata}
        </Uyari>
      ) : null}

      <label className="block">
        <span className="text-[13px] font-medium text-ink-700">Konu</span>
        <input
          value={konu}
          onChange={(e) => setKonu(e.target.value)}
          placeholder="Neyi birlikte inceleyelim?"
          maxLength={140}
          className="mt-1.5 h-11 w-full rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
        />
      </label>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {KONU_ONERILERI.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => setKonu(o)}
            className="cursor-pointer rounded-full border border-line bg-surface-muted px-2.5 py-1 text-[12px] text-ink-600 transition-colors hover:border-ink-200 hover:text-ink-900"
          >
            {o}
          </button>
        ))}
      </div>

      <label className="mt-5 block">
        <span className="text-[13px] font-medium text-ink-700">Anlatın</span>
        <textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value)}
          rows={6}
          maxLength={4000}
          placeholder="Hangi ekranda ne gördünüz, neyi anlamadınız veya neye karar veremiyorsunuz? Ne kadar çok anlatırsanız dönüşümüz o kadar isabetli olur."
          className="mt-1.5 w-full rounded-[10px] border border-line bg-white px-3.5 py-3 text-[14px] leading-relaxed text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
        />
        <span className="mt-1 block text-right text-[11.5px] text-ink-300">
          {mesaj.trim().length}/4000
        </span>
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Buton onClick={gonder} yukleniyor={bekliyor} disabled={!konu.trim() || !mesaj.trim()}>
          Talebi Gönder
        </Buton>
        <span className="text-[12.5px] text-ink-400">Ücretsizdir, paketinizden düşmez.</span>
      </div>
    </div>
  );
}
