"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Buton } from "@/components/ui/button";
import { SkorHalkasi, SkorCubugu, FirsatSkoru } from "@/components/ui/score";
import { ORNEK_KELIMELER, ORNEK_PROJE } from "@/components/marketing/ornek-veri";
import { alanAdiNormalize, sayi } from "@/lib/utils";

export function Hero() {
  const router = useRouter();
  const [adres, setAdres] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    const sonuc = alanAdiNormalize(adres);
    if (!sonuc.gecerli) {
      setHata(sonuc.hata);
      return;
    }
    setHata(null);
    router.push(`/kayit?site=${encodeURIComponent(sonuc.domain)}`);
  }

  return (
    <section className="relative overflow-hidden">
      <div className="grid-veil pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-16 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white/70 px-3 py-1 text-[12.5px] font-medium text-ink-500 backdrop-blur">
            <span className="size-1.5 rounded-full bg-positive" />
            Türkiye&apos;deki e-ticaret siteleri için geliştirildi
          </span>

          {/*
            Sayfanın hedef kelimesi "e-ticaret SEO". Başlık bu ifadeyle
            başlar ama slogan gibi değil, cümlenin doğal parçası olarak:
            kelimeyi doldurmak için yazılmış başlıklar hem okuyucuyu hem
            arama motorunu kaybettirir.
          */}
          <h1 className="mt-6 text-[34px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink-900 sm:text-[52px]">
            E-ticaret SEO&apos;yu
            <br className="hidden sm:block" /> tahminden çıkarın.
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-ink-500">
            SEO Evi, Türkiye&apos;deki e-ticaret siteleri için geliştirilmiş bir e-ticaret SEO
            platformudur: teknik SEO, anahtar kelimeler, rakipler, ürün sayfaları, Google
            Alışveriş ve yapay zekâ görünürlüğü tek ekranda birleşir — ve size veri yığını değil,
            sıraya dizilmiş bir yapılacaklar listesi verir.
          </p>

          <form onSubmit={gonder} className="mx-auto mt-8 max-w-lg">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-300">
                  https://
                </span>
                <input
                  type="text"
                  inputMode="url"
                  value={adres}
                  onChange={(e) => {
                    setAdres(e.target.value);
                    if (hata) setHata(null);
                  }}
                  placeholder="magazam.com"
                  aria-label="Web sitenizin adresi"
                  className="h-12 w-full rounded-[12px] border border-line bg-white pl-[68px] pr-3.5 text-[15px] text-ink-900 shadow-subtle placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
                />
              </div>
              <Buton type="submit" boyut="lg" className="sm:w-auto">
                Ücretsiz Analize Başla
                <ArrowRight aria-hidden />
              </Buton>
            </div>
            {hata ? <p className="mt-2 text-left text-[12.5px] text-critical">{hata}</p> : null}
          </form>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-ink-400">
            <span>7 gün ücretsiz deneme</span>
            <span className="hidden sm:inline">·</span>
            <span>Kredi kartı gerekmez</span>
            <span className="hidden sm:inline">·</span>
            <Link href="#nasil-calisir" className="font-medium text-ink-700 underline-offset-4 hover:underline">
              Nasıl Çalışıyor?
            </Link>
          </div>
        </div>

        <OrnekPanel />
      </div>
    </section>
  );
}

function OrnekPanel() {
  return (
    <div className="relative mx-auto mt-14 max-w-5xl">
      <div className="glass rounded-[20px] p-2.5">
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-ink-200" />
              <span className="size-2.5 rounded-full bg-ink-100" />
              <span className="size-2.5 rounded-full bg-ink-100" />
              <span className="ml-2 text-[12px] text-ink-400">{ORNEK_PROJE.ad} · Genel Bakış</span>
            </div>
            <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-400">
              Örnek proje
            </span>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-[auto_1fr] sm:p-6">
            <div className="flex items-center gap-5">
              <SkorHalkasi skor={ORNEK_PROJE.skorlar.seo} boyut={104} etiket="SEO skoru" />
              <div className="hidden w-48 space-y-3 sm:block">
                <SkorCubugu etiket="Teknik" skor={ORNEK_PROJE.skorlar.teknik} />
                <SkorCubugu etiket="E-ticaret" skor={ORNEK_PROJE.skorlar.eticaret} />
                <SkorCubugu etiket="AI görünürlüğü" skor={ORNEK_PROJE.skorlar.ai} />
              </div>
            </div>

            <div className="min-w-0">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="text-[13px] font-semibold text-ink-900">En yüksek fırsatlar</h3>
                <span className="text-[12px] text-ink-400">
                  {sayi(ORNEK_PROJE.metrikler.siralanan_kelime)} sıralanan kelime
                </span>
              </div>
              <ul className="divide-y divide-line">
                {ORNEK_KELIMELER.slice(0, 4).map((k) => (
                  <li key={k.keyword} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink-800">{k.keyword}</p>
                      <p className="tabular mt-0.5 text-[11.5px] text-ink-400">
                        {sayi(k.hacim)} arama · {k.pozisyon ? `${k.pozisyon}. sıra` : "sıralanmıyor"}
                      </p>
                    </div>
                    <FirsatSkoru skor={k.firsat} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
