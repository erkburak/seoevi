"use client";

import { ArrowUpRight, Check, Gauge, Monitor, Smartphone } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";

import { hiziOlc, kalanHakSor, type SiteHiziAracSonucu } from "@/app/site-hizi-testi/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { parmakIziAl } from "@/lib/araclar/parmak-izi";
import { cn } from "@/lib/utils";

const BOS: SiteHiziAracSonucu = {};

const ADIMLAR = [
  "Sayfa mobil cihaz koşullarında açılıyor",
  "Yükleme süreleri ölçülüyor",
  "Çekirdek Web Verileri hesaplanıyor",
  "Yavaşlatan öğeler aranıyor",
  "Öneriler hazırlanıyor",
];

function IlerlemeGostergesi() {
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    // Ölçüm gerçekten yavaştır (Lighthouse sayfayı baştan yükler);
    // adımlar tipik süreye göre akar, son adımda sonucu bekler.
    const z = setInterval(() => setAdim((a) => Math.min(a + 1, ADIMLAR.length - 1)), 4000);
    return () => clearInterval(z);
  }, []);

  return (
    <ul className="space-y-2.5">
      {ADIMLAR.map((a, i) => {
        const bitti = i < adim;
        const aktif = i === adim;
        return (
          <li key={a} className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                bitti
                  ? "border-positive bg-positive text-white"
                  : aktif
                    ? "border-ink-900 bg-white"
                    : "border-line bg-white",
              )}
            >
              {bitti ? (
                <Check className="size-3" aria-hidden />
              ) : aktif ? (
                <span className="size-1.5 animate-pulse rounded-full bg-ink-900" />
              ) : null}
            </span>
            <span
              className={cn(
                "text-[13.5px] transition-colors duration-300",
                bitti ? "text-ink-400" : aktif ? "font-medium text-ink-900" : "text-ink-300",
              )}
            >
              {a}
              {aktif ? "…" : ""}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Google'ın kendi skor eşikleri: 90+ iyi, 50-89 orta, 50 altı kötü. */
function skorTonu(skor: number): { renk: string; arka: string; etiket: string } {
  if (skor >= 90) return { renk: "text-positive", arka: "bg-positive", etiket: "iyi" };
  if (skor >= 50) return { renk: "text-caution", arka: "bg-caution", etiket: "geliştirilmeli" };
  return { renk: "text-critical", arka: "bg-critical", etiket: "kötü" };
}

function BuyukSkor({ skor }: { skor: number }) {
  const ton = skorTonu(skor);
  const cevre = 2 * Math.PI * 54;
  const dolu = (skor / 100) * cevre;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-32">
        <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" strokeWidth="9" className="stroke-surface-muted" />
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${dolu} ${cevre}`}
            className={cn("transition-all duration-700", ton.renk)}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-[34px] font-semibold leading-none", ton.renk)}>{skor}</span>
          <span className="mt-0.5 text-[11px] text-ink-400">/ 100</span>
        </div>
      </div>
      <p className={cn("mt-2 text-[13px] font-medium", ton.renk)}>Performans {ton.etiket}</p>
    </div>
  );
}

export function SiteHiziAraci() {
  const [durum, gonder, bekliyor] = useActionState(hiziOlc, BOS);
  const [parmakIzi, setParmakIzi] = useState("");
  const [cihaz, setCihaz] = useState<"mobil" | "masaustu">("mobil");
  const [hak, setHak] = useState<{ kalan: number; limit: number } | null>(null);

  useEffect(() => {
    // Parmak izi tarayıcı özelliklerinden türetildiği için asenkrondur.
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
  const sonuc = durum.sonuc;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form action={gonder} className="rounded-[16px] border border-line bg-white p-5 shadow-sm">
        <input type="hidden" name="parmakIzi" value={parmakIzi} />
        <input type="hidden" name="cihaz" value={cihaz} />

        <label htmlFor="adres" className="block text-[13.5px] font-medium text-ink-900">
          Ölçmek istediğiniz sayfanın adresi
        </label>
        <p className="mt-1 text-[12.5px] text-ink-500">
          Ana sayfa yerine bir ürün veya kategori sayfası girin — asıl yavaşlık genellikle oradadır.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="adres"
            name="adres"
            required
            placeholder="magazam.com/urun/triko-kazak"
            className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-white px-3.5 text-[14px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />
          <Buton type="submit" yukleniyor={bekliyor} disabled={!parmakIzi || kalan === 0}>
            <Gauge aria-hidden />
            Hızı Ölç
          </Buton>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-[10px] border border-line p-0.5">
            {(
              [
                { deger: "mobil", ad: "Mobil", ikon: Smartphone },
                { deger: "masaustu", ad: "Masaüstü", ikon: Monitor },
              ] as const
            ).map((s) => (
              <button
                key={s.deger}
                type="button"
                onClick={() => setCihaz(s.deger)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] transition-colors",
                  cihaz === s.deger ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900",
                )}
              >
                <s.ikon className="size-3.5" aria-hidden />
                {s.ad}
              </button>
            ))}
          </div>

          {kalan !== null ? (
            <p className="text-[12.5px] text-ink-400">
              {kalan > 0
                ? `Bugün ${kalan} ölçüm hakkınız kaldı.`
                : "Bugünkü hakkınız doldu, gece 00.00'da yenilenir."}
            </p>
          ) : null}
        </div>
      </form>

      {bekliyor ? (
        <div className="mt-4 rounded-[16px] border border-line bg-white p-5">
          <IlerlemeGostergesi />
          <p className="mt-4 text-[12.5px] text-ink-400">
            Ölçüm sayfayı baştan yüklediği için yarım dakikayı bulabilir.
          </p>
        </div>
      ) : null}

      {durum.hata ? (
        <Uyari ton="kritik" className="mt-4">
          {durum.hata}
        </Uyari>
      ) : null}

      {sonuc && !bekliyor ? (
        <div className="mt-4 space-y-4">
          {/* --- Skorlar --- */}
          <section className="rounded-[16px] border border-line bg-white p-5">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
              <BuyukSkor skor={sonuc.performans} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-ink-900">{sonuc.url}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">
                  {sonuc.mobil ? "Mobil cihaz" : "Masaüstü"} koşullarında ölçüldü.
                </p>

                <dl className="mt-4 grid grid-cols-2 gap-3">
                  {sonuc.skorlar
                    .filter((s) => s.anahtar !== "performance")
                    .map((s) => (
                      <div key={s.anahtar}>
                        <dt className="text-[12px] text-ink-400">{s.ad}</dt>
                        <dd className={cn("text-[17px] font-semibold", skorTonu(s.skor).renk)}>
                          {s.skor}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            </div>
          </section>

          {/* --- Çekirdek ölçümler --- */}
          {sonuc.olcumler.length ? (
            <section className="rounded-[16px] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-ink-900">Ne kadar sürüyor?</h2>
              <p className="mt-1 text-[13px] text-ink-500">
                Hedefler Google&apos;ın kendi &quot;iyi&quot; sınırlarıdır.
              </p>

              <ul className="mt-4 divide-y divide-line">
                {sonuc.olcumler.map((o) => {
                  const iyi = o.skor !== null && o.skor >= 0.9;
                  const orta = o.skor !== null && o.skor >= 0.5 && o.skor < 0.9;
                  return (
                    <li key={o.anahtar} className="flex flex-wrap items-start gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-ink-900">{o.ad}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
                          {o.aciklama}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "tabular text-[15px] font-semibold",
                            iyi ? "text-positive" : orta ? "text-caution" : "text-critical",
                          )}
                        >
                          {o.deger}
                        </p>
                        <p className="text-[11.5px] text-ink-400">hedef: {o.hedef}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* --- Bulgular --- */}
          {sonuc.bulgular.length ? (
            <section className="rounded-[16px] border border-line bg-white p-5">
              <h2 className="text-[15px] font-semibold text-ink-900">
                Sayfayı yavaşlatan {sonuc.bulgular.length} şey bulduk
              </h2>
              <ul className="mt-4 space-y-3">
                {sonuc.bulgular.map((b) => (
                  <li key={b.kod} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        b.onem === "kritik"
                          ? "bg-critical"
                          : b.onem === "uyari"
                            ? "bg-caution"
                            : "bg-ink-300",
                      )}
                      aria-hidden
                    />
                    <div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-[13.5px] font-medium text-ink-900">{b.baslik}</p>
                        {b.kazanc ? (
                          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11.5px] text-ink-500">
                            {b.kazanc}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">
                        {b.aciklama}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section className="rounded-[16px] border border-positive/25 bg-positive-soft/40 p-5">
              <p className="text-[13.5px] text-ink-900">
                İncelediğimiz yaygın yavaşlatıcıların hiçbiri bu sayfada bulunmadı.
              </p>
            </section>
          )}

          {/* --- Devamı --- */}
          <section className="rounded-[16px] border border-line bg-surface-muted/50 p-5">
            <p className="text-[13.5px] leading-relaxed text-ink-600">
              Bu ölçüm tek bir sayfayı gösterir. Mağazanızın <strong>tüm</strong> ürün ve kategori
              sayfalarını düzenli olarak ölçmek, teknik SEO hatalarını ve sıralama kayıplarını
              birlikte takip etmek için ücretsiz hesap açabilirsiniz.
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
