"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { hedefKelimeKaydet } from "@/app/(uygulama)/kategori-seo/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";

/** Kategoriye hedef anahtar kelime atar. */
export function HedefKelimeFormu({
  kategoriId,
  mevcut,
}: {
  kategoriId: string;
  mevcut: string | null;
}) {
  const [deger, setDeger] = useState(mevcut ?? "");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null);
    setHata(null);

    basla(async () => {
      const sonuc = await hedefKelimeKaydet(kategoriId, deger.trim());
      if (sonuc.hata) setHata(sonuc.hata);
      else {
        setMesaj("Hedef kelime kaydedildi.");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={kaydet} className="space-y-3">
      <input
        value={deger}
        onChange={(e) => setDeger(e.target.value)}
        placeholder="Örnek: ankastre fırın"
        aria-label="Hedef anahtar kelime"
        className="h-10 w-full rounded-[10px] border border-line bg-white px-3.5 text-[13.5px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
      />
      <Buton type="submit" boyut="sm" gorunum="ikincil" tamGenislik yukleniyor={bekliyor}>
        Kaydet
      </Buton>
      {mesaj ? <p className="text-[12.5px] text-positive">{mesaj}</p> : null}
      {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}
    </form>
  );
}
