"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Buton } from "@/components/ui/button";
import { Alan } from "@/components/ui/form";
import { Uyari } from "@/components/ui/feedback";
import {
  girisYap,
  kayitOl,
  sifreSifirlamaGonder,
  sifreyiYenile,
  type FormDurumu,
} from "@/lib/auth/actions";

const BOS: FormDurumu = {};

export function KayitFormu({ site, paket }: { site?: string; paket?: string }) {
  const [durum, gonder, bekliyor] = useActionState(kayitOl, BOS);

  if (durum.basari) {
    return <Uyari ton="olumlu" baslik="Son bir adım kaldı">{durum.basari}</Uyari>;
  }

  return (
    <form action={gonder} className="space-y-4">
      {site ? <input type="hidden" name="site" value={site} /> : null}
      {paket ? <input type="hidden" name="paket" value={paket} /> : null}

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}

      <Alan
        etiket="Ad Soyad"
        name="adSoyad"
        autoComplete="name"
        placeholder="Adınız ve soyadınız"
        required
        hata={durum.alanHatalari?.adSoyad}
      />
      <Alan
        etiket="E-posta"
        name="eposta"
        type="email"
        autoComplete="email"
        placeholder="ornek@magazam.com"
        required
        hata={durum.alanHatalari?.eposta}
      />
      <Alan
        etiket="Şifre"
        name="sifre"
        type="password"
        autoComplete="new-password"
        placeholder="En az 8 karakter"
        required
        hata={durum.alanHatalari?.sifre}
      />
      <Alan
        etiket="Şifre tekrar"
        name="sifreTekrar"
        type="password"
        autoComplete="new-password"
        placeholder="Şifrenizi tekrar girin"
        required
        hata={durum.alanHatalari?.sifreTekrar}
      />

      <Buton type="submit" tamGenislik boyut="lg" yukleniyor={bekliyor}>
        Hesap Oluştur
      </Buton>

      <p className="text-center text-[12px] leading-relaxed text-ink-400">
        Hesap oluşturarak{" "}
        <Link href="/kullanim-kosullari" className="text-ink-600 underline underline-offset-2">
          Kullanım Koşulları
        </Link>{" "}
        ve{" "}
        <Link href="/kvkk" className="text-ink-600 underline underline-offset-2">
          KVKK Aydınlatma Metni
        </Link>
        &apos;ni kabul etmiş olursunuz.
      </p>
    </form>
  );
}

export function GirisFormu({ devam }: { devam?: string }) {
  const [durum, gonder, bekliyor] = useActionState(girisYap, BOS);

  return (
    <form action={gonder} className="space-y-4">
      {devam ? <input type="hidden" name="devam" value={devam} /> : null}
      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}

      <Alan
        etiket="E-posta"
        name="eposta"
        type="email"
        autoComplete="email"
        placeholder="ornek@magazam.com"
        required
        hata={durum.alanHatalari?.eposta}
      />
      <Alan
        etiket="Şifre"
        name="sifre"
        type="password"
        autoComplete="current-password"
        placeholder="Şifreniz"
        required
        hata={durum.alanHatalari?.sifre}
        sagEk={
          <Link href="/sifremi-unuttum" className="text-[12.5px] text-ink-400 hover:text-ink-900">
            Şifremi unuttum
          </Link>
        }
      />

      <Buton type="submit" tamGenislik boyut="lg" yukleniyor={bekliyor}>
        Giriş Yap
      </Buton>
    </form>
  );
}

export function SifremiUnuttumFormu() {
  const [durum, gonder, bekliyor] = useActionState(sifreSifirlamaGonder, BOS);

  if (durum.basari) {
    return <Uyari ton="olumlu" baslik="Bağlantı gönderildi">{durum.basari}</Uyari>;
  }

  return (
    <form action={gonder} className="space-y-4">
      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      <Alan
        etiket="E-posta"
        name="eposta"
        type="email"
        autoComplete="email"
        placeholder="ornek@magazam.com"
        required
        hata={durum.alanHatalari?.eposta}
      />
      <Buton type="submit" tamGenislik boyut="lg" yukleniyor={bekliyor}>
        Yenileme Bağlantısı Gönder
      </Buton>
    </form>
  );
}

export function SifreYenileFormu() {
  const [durum, gonder, bekliyor] = useActionState(sifreyiYenile, BOS);

  return (
    <form action={gonder} className="space-y-4">
      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      <Alan
        etiket="Yeni şifre"
        name="sifre"
        type="password"
        autoComplete="new-password"
        placeholder="En az 8 karakter"
        required
        hata={durum.alanHatalari?.sifre}
      />
      <Alan
        etiket="Yeni şifre tekrar"
        name="sifreTekrar"
        type="password"
        autoComplete="new-password"
        required
        hata={durum.alanHatalari?.sifreTekrar}
      />
      <Buton type="submit" tamGenislik boyut="lg" yukleniyor={bekliyor}>
        Şifreyi Güncelle
      </Buton>
    </form>
  );
}
