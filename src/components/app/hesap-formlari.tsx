"use client";

import { useActionState } from "react";

import { profiliGuncelle, sifreDegistir, type HesapSonucu } from "@/app/(uygulama)/hesabim/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Alan } from "@/components/ui/form";
import type { Profil } from "@/types/database";

const BOS: HesapSonucu = {};

export function ProfilFormu({ profil, eposta }: { profil: Profil; eposta: string }) {
  const [durum, gonder, bekliyor] = useActionState(profiliGuncelle, BOS);

  return (
    <form action={gonder} className="max-w-lg space-y-5">
      <Alan
        etiket="Ad Soyad"
        name="adSoyad"
        defaultValue={profil.full_name ?? ""}
        autoComplete="name"
        required
      />

      <Alan
        etiket="E-posta"
        name="eposta"
        type="email"
        defaultValue={eposta}
        disabled
        yardim="E-posta adresinizi değiştirmek için bizimle iletişime geçin."
      />

      <Alan etiket="Şirket" name="sirket" defaultValue={profil.company ?? ""} autoComplete="organization" />

      <Alan
        etiket="Telefon"
        name="telefon"
        type="tel"
        inputMode="tel"
        defaultValue={profil.phone ?? ""}
        autoComplete="tel"
        placeholder="0555 000 00 00"
      />

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          name="pazarlama"
          defaultChecked={profil.marketing_opt_in}
          className="mt-0.5 size-4 accent-ink-900"
        />
        <span className="text-[13px] leading-relaxed text-ink-600">
          Ürün güncellemeleri ve SEO içerikleri hakkında e-posta almak istiyorum.
        </span>
      </label>

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

      <Buton type="submit" yukleniyor={bekliyor}>
        Değişiklikleri Kaydet
      </Buton>
    </form>
  );
}

export function SifreFormu() {
  const [durum, gonder, bekliyor] = useActionState(sifreDegistir, BOS);

  return (
    <form action={gonder} className="max-w-lg space-y-5">
      <Alan
        etiket="Yeni şifre"
        name="yeni"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        yardim="En az 8 karakter."
      />
      <Alan
        etiket="Yeni şifre (tekrar)"
        name="tekrar"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
      />

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

      <Buton type="submit" gorunum="ikincil" yukleniyor={bekliyor}>
        Şifreyi Güncelle
      </Buton>
    </form>
  );
}
