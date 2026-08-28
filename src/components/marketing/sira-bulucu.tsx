"use client";

import { ArrowUpRight, Check, Search, Smartphone, Monitor } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import { kalanHakSor, siraSorgula, type SiraBulucuSonucu } from "@/app/google-sira-bulucu/actions";
import { BilgiDongusu } from "@/components/ui/bilgi-dongusu";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { parmakIziAl } from "@/lib/araclar/parmak-izi";
import { cn } from "@/lib/utils";

const BOS: SiraBulucuSonucu = {};

/** Adım adım ilerleyen analiz göstergesi. */
const ADIMLAR = [
  "Google sonuçları alınıyor",
  "İlk 100 sonuç taranıyor",
  "Sıralamanız aranıyor",
  "Rakipler karşılaştırılıyor",
  "Öneriler hazırlanıyor",
];

function IlerlemeGostergesi() {
  const [adim, setAdim] = useState(0);

  useEffect(() => {
    // Adımlar gerçek işin ilerleyişine göre değil, tipik süreye göre akar;
    // son adımda bekleyip sonucun gelmesini bekler.
    const z = setInterval(() => setAdim((a) => Math.min(a + 1, ADIMLAR.length - 1)), 1400);
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

/* ------------------------------------------------------------------ */
/* Sıralama rozeti                                                     */
/* ------------------------------------------------------------------ */

function SiraRozeti({ pozisyon }: { pozisyon: number | null }) {
  const [gosterilen, setGosterilen] = useState(0);

  // Sayı sayarak yükselen animasyon.
  useEffect(() => {
    if (pozisyon === null) return;
    let iptal = false;
    const sure = 900;
    const baslangic = performance.now();

    function adim(simdi: number) {
      if (iptal) return;
      const oran = Math.min(1, (simdi - baslangic) / sure);
      const yumusak = 1 - Math.pow(1 - oran, 3);
      setGosterilen(Math.round(yumusak * pozisyon!));
      if (oran < 1) requestAnimationFrame(adim);
    }
    requestAnimationFrame(adim);
    return () => {
      iptal = true;
    };
  }, [pozisyon]);

  if (pozisyon === null) {
    return (
      <div className="flex size-[104px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-dashed border-line-strong">
        <span className="text-[22px] font-semibold text-ink-300">—</span>
        <span className="mt-0.5 text-[10.5px] text-ink-400">ilk 100&apos;de yok</span>
      </div>
    );
  }

  const ton =
    pozisyon <= 3
      ? "border-positive bg-positive-soft text-positive"
      : pozisyon <= 10
        ? "border-caution bg-caution-soft text-caution"
        : "border-line-strong bg-surface-muted text-ink-600";

  return (
    <div
      className={cn(
        "flex size-[104px] shrink-0 flex-col items-center justify-center rounded-full border-2",
        ton,
      )}
    >
      <span className="tabular text-[34px] font-semibold leading-none tracking-[-0.03em]">
        {gosterilen}
      </span>
      <span className="mt-1 text-[10.5px] font-medium opacity-70">. sıra</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ana bileşen                                                         */
/* ------------------------------------------------------------------ */

export function SiraBulucuAraci() {
  const [durum, gonder, bekliyor] = useActionState(siraSorgula, BOS);
  const [parmakIzi, setParmakIzi] = useState("");
  const [cihaz, setCihaz] = useState<"desktop" | "mobile">("desktop");
  const [kalan, setKalan] = useState<number | null>(null);
  const [limit, setLimit] = useState(3);
  const sonucRef = useRef<HTMLDivElement>(null);

  // Parmak izini üret ve kalan hakkı sor.
  useEffect(() => {
    let iptal = false;
    (async () => {
      const iz = await parmakIziAl();
      if (iptal) return;
      setParmakIzi(iz);
      try {
        const h = await kalanHakSor(iz);
        if (!iptal) {
          setKalan(h.kalan);
          setLimit(h.limit);
        }
      } catch {
        // Hak bilgisi alınamazsa form yine de çalışır; kota sunucuda uygulanır.
      }
    })();
    return () => {
      iptal = true;
    };
  }, []);

  // Sunucudan gelen güncel hak sayısını yansıt.
  useEffect(() => {
    if (durum.kalanHak !== undefined) setKalan(durum.kalanHak);
  }, [durum.kalanHak]);

  // Sonuç gelince oraya kaydır.
  useEffect(() => {
    if (durum.sonuc) sonucRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [durum.sonuc]);

  const s = durum.sonuc;
  const hakBitti = kalan !== null && kalan <= 0;

  const sifirlanmaMetni = useMemo(() => {
    if (!durum.sifirlanma) return null;
    const { saat, dakika } = durum.sifirlanma;
    if (saat === 0) return `${dakika} dakika sonra yenilenecek`;
    return `${saat} saat ${dakika} dakika sonra yenilenecek`;
  }, [durum.sifirlanma]);

  return (
    <div className="space-y-8">
      {/* --- Form --- */}
      <form action={gonder} className="space-y-4">
        <input type="hidden" name="parmakIzi" value={parmakIzi} />
        <input type="hidden" name="cihaz" value={cihaz} />

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="site" className="mb-1.5 block text-[13px] font-medium text-ink-700">
              Web siteniz
            </label>
            <input
              id="site"
              name="site"
              type="text"
              inputMode="url"
              required
              placeholder="magazam.com"
              className="h-12 w-full rounded-[11px] border border-line bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
            />
          </div>
          <div>
            <label htmlFor="keyword" className="mb-1.5 block text-[13px] font-medium text-ink-700">
              Anahtar kelime
            </label>
            <input
              id="keyword"
              name="keyword"
              type="text"
              required
              placeholder="vestel buzdolabı"
              className="h-12 w-full rounded-[11px] border border-line bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-[10px] border border-line bg-white p-0.5">
            {(
              [
                { deger: "desktop", etiket: "Masaüstü", ikon: Monitor },
                { deger: "mobile", etiket: "Mobil", ikon: Smartphone },
              ] as const
            ).map((c) => {
              const Ikon = c.ikon;
              const secili = cihaz === c.deger;
              return (
                <button
                  key={c.deger}
                  type="button"
                  onClick={() => setCihaz(c.deger)}
                  aria-pressed={secili}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors",
                    secili ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-900",
                  )}
                >
                  <Ikon className="size-3.5" aria-hidden />
                  {c.etiket}
                </button>
              );
            })}
          </div>

          {kalan !== null ? (
            <p className="text-[12.5px] text-ink-400">
              Bugün kalan hakkınız:{" "}
              <span className={cn("font-semibold", hakBitti ? "text-critical" : "text-ink-900")}>
                {kalan} / {limit}
              </span>
            </p>
          ) : null}
        </div>

        <Buton
          type="submit"
          boyut="lg"
          tamGenislik
          yukleniyor={bekliyor}
          disabled={!parmakIzi || hakBitti}
        >
          <Search aria-hidden />
          Sıramı Bul
        </Buton>

        {hakBitti && !durum.hata ? (
          <Uyari ton="uyari">
            Günlük {limit} ücretsiz sorgu hakkınızı kullandınız. Hakkınız gece 00.00&apos;da
            yenilenir.{" "}
            <Link href="/kayit" className="font-medium underline underline-offset-2">
              Ücretsiz hesap açarak
            </Link>{" "}
            sınırsız sorgulayabilirsiniz.
          </Uyari>
        ) : null}
      </form>

      {/* --- Bekleme --- */}
      {bekliyor ? (
        <div className="animate-rise grid gap-4 lg:grid-cols-2">
          <div className="rounded-[14px] border border-line bg-white p-5">
            <p className="mb-4 text-[13px] font-medium text-ink-900">Sıralamanız aranıyor</p>
            <IlerlemeGostergesi />
          </div>
          <BilgiDongusu />
        </div>
      ) : null}

      {/* --- Hata --- */}
      {durum.hata && !bekliyor ? (
        <Uyari ton="kritik">
          {durum.hata}
          {sifirlanmaMetni ? <span className="mt-1 block text-ink-500">{sifirlanmaMetni}.</span> : null}
        </Uyari>
      ) : null}

      {/* --- Sonuç --- */}
      {s && !bekliyor ? (
        <div ref={sonucRef} className="animate-rise space-y-8">
          <section className="glass rounded-[16px] p-6">
            <div className="flex flex-wrap items-center gap-6">
              <SiraRozeti pozisyon={s.pozisyon} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-400">
                  {s.alanAdi} · &quot;{s.keyword}&quot; · {s.cihaz === "mobile" ? "Mobil" : "Masaüstü"}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-700">{s.yorum}</p>
                {s.tiklamaPayi !== null ? (
                  <p className="mt-3 text-[13px] text-ink-500">
                    Bu sırada tıklamaların yaklaşık{" "}
                    <span className="font-semibold text-ink-900">%{s.tiklamaPayi}</span>&apos;i size
                    gelir.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {/* İlk 10 */}
          {s.ilkOnRakip.length ? (
            <section>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
                Bu kelimede ilk 10 sonuç
              </h2>
              <ol className="mt-4 divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white">
                {s.ilkOnRakip.map((r) => (
                  <li
                    key={`${r.pozisyon}-${r.alanAdi}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3",
                      r.bizMiyiz && "bg-positive-soft/50",
                    )}
                  >
                    <span
                      className={cn(
                        "tabular inline-flex size-7 shrink-0 items-center justify-center rounded-[8px] text-[12.5px] font-semibold",
                        r.bizMiyiz ? "bg-positive text-white" : "bg-ink-50 text-ink-600",
                      )}
                    >
                      {r.pozisyon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink-900">
                        {r.alanAdi}
                        {r.bizMiyiz ? (
                          <span className="ml-2 rounded-full bg-positive px-2 py-0.5 text-[10.5px] text-white">
                            Siz
                          </span>
                        ) : null}
                      </p>
                      {r.baslik ? (
                        <p className="truncate text-[12px] text-ink-400">{r.baslik}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Öneriler */}
          {s.oneriler.length ? (
            <section>
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">
                Ne yapmalısınız?
              </h2>
              <ul className="mt-4 space-y-2">
                {s.oneriler.map((o) => (
                  <li
                    key={o}
                    className="flex gap-3 rounded-[12px] border border-line bg-white p-4 text-[13.5px] leading-relaxed text-ink-700"
                  >
                    <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-ink-300" aria-hidden />
                    {o}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* SERP özellikleri ve sorular */}
          <div className="grid gap-4 sm:grid-cols-2">
            {s.serpOzellikleri.length ? (
              <section className="rounded-[14px] border border-line bg-white p-5">
                <h3 className="text-[13.5px] font-semibold text-ink-900">
                  Sonuç sayfasındaki alanlar
                </h3>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {s.serpOzellikleri.map((o) => (
                    <li
                      key={o.tur}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[12px]",
                        o.bizde
                          ? "border-positive/20 bg-positive-soft text-positive"
                          : "border-line bg-surface-muted text-ink-500",
                      )}
                    >
                      {o.ad}
                      {o.bizde ? " ✓" : ""}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {s.sorular.length ? (
              <section className="rounded-[14px] border border-line bg-white p-5">
                <h3 className="text-[13.5px] font-semibold text-ink-900">Kullanıcılar bunu soruyor</h3>
                <ul className="mt-3 space-y-1.5">
                  {s.sorular.map((q) => (
                    <li key={q} className="text-[13px] leading-relaxed text-ink-600">
                      {q}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* Dönüşüm */}
          <section className="rounded-[16px] border border-line bg-surface-muted/60 p-7 text-center">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
              Tek kelime yerine tüm sıralamalarınızı takip edin
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
              Ücretsiz hesap açtığınızda yüzlerce kelimenin sırası otomatik izlenir, düşüşlerde
              bildirim alırsınız. Ayrıca siteniz taranır, rakipleriniz analiz edilir.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Buton asChild boyut="lg">
                <Link href={`/kayit?site=${encodeURIComponent(s.alanAdi)}`}>
                  Ücretsiz Hesap Aç
                </Link>
              </Buton>
              <Buton asChild gorunum="ikincil" boyut="lg">
                <Link href="/fiyatlandirma">Paketleri İncele</Link>
              </Buton>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
