"use client";

import { ArrowUpRight, PackageSearch } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import {
  kalanHakSor,
  urunuDenetle,
  type UrunSayfasiAracSonucu,
} from "@/app/urun-sayfasi-seo-testi/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { parmakIziAl } from "@/lib/araclar/parmak-izi";
import { cn } from "@/lib/utils";

const BOS: UrunSayfasiAracSonucu = {};

const ONEM_RENGI: Record<string, string> = {
  kritik: "bg-critical",
  uyari: "bg-caution",
  bilgi: "bg-ink-300",
  olumlu: "bg-positive",
};

function skorRengi(skor: number): string {
  if (skor >= 80) return "text-positive";
  if (skor >= 50) return "text-caution";
  return "text-critical";
}

/**
 * Google'ın ürün sayfasından okuduğu alanlar.
 *
 * Bu tablo aracın can alıcı kısmı: kullanıcı sayfasında fiyatı gördüğü
 * için Google'ın da gördüğünü sanır. Oysa Google yapısal veriyi okur ve
 * orada yoksa yoktur.
 */
function AlanSatiri({ ad, deger, aciklama }: { ad: string; deger: string | null; aciklama: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink-900">{ad}</p>
        <p className="text-[12px] text-ink-400">{aciklama}</p>
      </div>
      {deger ? (
        <span className="text-[13.5px] font-medium text-ink-900">{deger}</span>
      ) : (
        <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[12px] font-medium text-critical">
          okunamıyor
        </span>
      )}
    </div>
  );
}

export function UrunSayfasiAraci() {
  const [durum, gonder, bekliyor] = useActionState(urunuDenetle, BOS);
  const [parmakIzi, setParmakIzi] = useState("");
  const [hak, setHak] = useState<{ kalan: number; limit: number } | null>(null);

  useEffect(() => {
    let iptal = false;
    (async () => {
      const iz = await parmakIziAl();
      if (iptal) return;
      setParmakIzi(iz);
      try {
        const h = await kalanHakSor(iz);
        if (!iptal) setHak(h);
      } catch {
        // Hak okunamazsa form yine çalışır; sunucu kotayı zaten uygular.
        if (!iptal) setHak(null);
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  const kalan = durum.kalanHak ?? hak?.kalan ?? null;
  const s = durum.sonuc;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form action={gonder} className="rounded-[16px] border border-line bg-white p-5 shadow-sm">
        <input type="hidden" name="parmakIzi" value={parmakIzi} />

        <label htmlFor="adres" className="block text-[13.5px] font-medium text-ink-900">
          Ürün sayfanızın adresi
        </label>
        <p className="mt-1 text-[12.5px] text-ink-500">
          Kategori değil, tek bir ürünün sayfası olmalı.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="adres"
            name="adres"
            required
            placeholder="magazam.com/urun/triko-kazak-siyah"
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />
          <Buton type="submit" yukleniyor={bekliyor} disabled={!parmakIzi || kalan === 0}>
            <PackageSearch aria-hidden />
            Kontrol Et
          </Buton>
        </div>

        {kalan !== null ? (
          <p className="mt-3 text-[12.5px] text-ink-400">
            {kalan > 0
              ? `Bugün ${kalan} kontrol hakkınız kaldı.`
              : "Bugünkü hakkınız doldu, gece 00.00'da yenilenir."}
          </p>
        ) : null}
      </form>

      {durum.hata ? (
        <Uyari ton="kritik" className="mt-4">
          {durum.hata}
        </Uyari>
      ) : null}

      {s && !bekliyor ? (
        <div className="mt-4 space-y-4">
          {/* --- Skor --- */}
          <section className="rounded-[16px] border border-line bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink-900">
                  {s.ad ?? s.url}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-400">{s.url}</p>
              </div>
              <div className="text-right">
                <p className={cn("text-[30px] font-semibold leading-none", skorRengi(s.skor))}>
                  {s.skor}
                </p>
                <p className="text-[11.5px] text-ink-400">/ 100</p>
              </div>
            </div>
          </section>

          {/* --- Google ne okuyor? --- */}
          <section className="rounded-[16px] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">
              Google bu sayfadan ne okuyor?
            </h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-500">
              Sayfanızda gördüğünüz bilgi, Google&apos;ın okuduğu bilgi değildir. Google yapısal
              veriyi okur; aşağıda &quot;okunamıyor&quot; yazan alan, arama sonucunda gösterilemez.
            </p>

            {!s.urunSemasiVar ? (
              <Uyari ton="kritik" className="mt-4">
                Bu sayfada ürün şeması hiç bulunamadı. Google sayfanın bir ürün olduğunu
                anlamıyor; aşağıdaki alanların hiçbirini okuyamaz.
              </Uyari>
            ) : null}

            <div className="mt-3 divide-y divide-line">
              <AlanSatiri ad="Ürün adı" deger={s.ad} aciklama="Arama sonucunda gösterilecek ad" />
              <AlanSatiri
                ad="Fiyat"
                deger={s.fiyat ? `${s.fiyat} ${s.paraBirimi ?? ""}`.trim() : null}
                aciklama="Zengin sonuçta fiyat rozeti"
              />
              <AlanSatiri
                ad="Stok durumu"
                deger={s.stokTurkce}
                aciklama="Google stokta olmayan ürünü öne çıkarmaz"
              />
              <AlanSatiri
                ad="Değerlendirme"
                deger={s.puan ? `${s.puan}${s.yorumSayisi ? ` (${s.yorumSayisi} yorum)` : ""}` : null}
                aciklama="Sonuçlarda yıldız gösterimi"
              />
              <AlanSatiri ad="Marka" deger={s.marka} aciklama="Marka aramalarında eşleşme" />
              <AlanSatiri
                ad="Ürün kodu"
                deger={s.gtin}
                aciklama="Farklı satıcılarda aynı ürünü eşleştirir"
              />
              <AlanSatiri
                ad="Kategori yolu"
                deger={s.kirintiVar ? "Var" : null}
                aciklama="Sonuçta adres yerine kategori yolu gösterir"
              />
            </div>
          </section>

          {/* --- Bulgular --- */}
          <section className="rounded-[16px] border border-line bg-white p-5">
            <h2 className="text-[15px] font-semibold text-ink-900">Bulgular</h2>
            <ul className="mt-4 space-y-3">
              {s.bulgular.map((b) => (
                <li key={b.kod} className="flex gap-3">
                  <span
                    className={cn("mt-1.5 size-2 shrink-0 rounded-full", ONEM_RENGI[b.onem])}
                    aria-hidden
                  />
                  <div>
                    <p className="text-[13.5px] font-medium text-ink-900">{b.baslik}</p>
                    <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
                      {b.aciklama}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[16px] border border-line bg-surface-muted/50 p-5">
            <p className="text-[13.5px] leading-relaxed text-ink-600">
              Bu kontrol tek bir ürünü inceler. Mağazanızdaki <strong>tüm</strong> ürün
              sayfalarında aynı eksikleri toplu olarak bulmak, hangi ürünlerin sıra kaybettiğini
              görmek ve düzeltilecekleri önem sırasına dizmek için ücretsiz hesap açabilirsiniz.
            </p>
            <Buton asChild className="mt-3">
              <Link href="/kayit">
                Ücretsiz Başlayın
                <ArrowUpRight aria-hidden />
              </Link>
            </Buton>
          </section>
        </div>
      ) : null}
    </div>
  );
}
