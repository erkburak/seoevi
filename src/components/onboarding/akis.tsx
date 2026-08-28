"use client";

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Building2,
  FileText,
  Globe,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useState, useTransition } from "react";

import { baslangiciTamamla, rakipOnerisiIste } from "@/app/baslangic/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Alan, SecenekKarti } from "@/components/ui/form";
import { alanAdiNormalize, cn } from "@/lib/utils";
import type { SiteTuru } from "@/types/database";

const SITE_TURLERI: { deger: SiteTuru; ad: string; aciklama: string; ikon: React.ReactNode }[] = [
  { deger: "eticaret", ad: "E-ticaret", aciklama: "Kendi sitenizden ürün satıyorsunuz", ikon: <ShoppingCart className="size-4" /> },
  { deger: "pazaryeri", ad: "Pazaryeri", aciklama: "Birden çok satıcıya ev sahipliği yapıyorsunuz", ikon: <Store className="size-4" /> },
  { deger: "kurumsal", ad: "Kurumsal", aciklama: "Marka ve şirket tanıtımı", ikon: <Building2 className="size-4" /> },
  { deger: "hizmet", ad: "Hizmet", aciklama: "Randevu veya teklif odaklı site", ikon: <Wrench className="size-4" /> },
  { deger: "blog", ad: "Blog / İçerik", aciklama: "Yayın ve içerik odaklı site", ikon: <FileText className="size-4" /> },
  { deger: "diger", ad: "Diğer", aciklama: "Yukarıdakilerden hiçbiri", ikon: <Globe className="size-4" /> },
];

const HEDEFLER = [
  { deger: "siralama", ad: "Google'da daha üst sıralara çıkmak", ikon: <TrendingUp className="size-4" /> },
  { deger: "trafik", ad: "Daha fazla organik trafik", ikon: <Search className="size-4" /> },
  { deger: "satis", ad: "Daha fazla satış", ikon: <ShoppingCart className="size-4" /> },
  { deger: "rakip", ad: "Rakipleri analiz etmek", ikon: <Sparkles className="size-4" /> },
  { deger: "teknik", ad: "Teknik SEO sorunlarını bulmak", ikon: <Wrench className="size-4" /> },
  { deger: "shopping", ad: "Google Alışveriş görünürlüğünü artırmak", ikon: <ShoppingBag className="size-4" /> },
  { deger: "ai", ad: "AI aramalarında görünmek", ikon: <Bot className="size-4" /> },
];

const ADIM_SAYISI = 4;

export function BaslangicAkisi({ baslangicSitesi }: { baslangicSitesi?: string }) {
  const [adim, setAdim] = useState(0);
  const [site, setSite] = useState(baslangicSitesi ?? "");
  const [siteHatasi, setSiteHatasi] = useState<string | null>(null);
  const [siteTuru, setSiteTuru] = useState<SiteTuru>("eticaret");
  const [hedef, setHedef] = useState("siralama");
  const [rakipler, setRakipler] = useState<string[]>(["", "", ""]);
  const [oneriler, setOneriler] = useState<string[]>([]);
  const [onerilerYukleniyor, setOnerilerYukleniyor] = useState(false);
  const [genelHata, setGenelHata] = useState<string | null>(null);
  const [gonderiliyor, basla] = useTransition();

  function ileri() {
    if (adim === 0) {
      const sonuc = alanAdiNormalize(site);
      if (!sonuc.gecerli) {
        setSiteHatasi(sonuc.hata);
        return;
      }
      setSiteHatasi(null);
      setSite(sonuc.domain);
    }

    if (adim === 2 && !oneriler.length) {
      setOnerilerYukleniyor(true);
      void rakipOnerisiIste(site)
        .then((liste) => setOneriler(liste.slice(0, 6)))
        .finally(() => setOnerilerYukleniyor(false));
    }

    setAdim((a) => Math.min(ADIM_SAYISI - 1, a + 1));
  }

  function geri() {
    setAdim((a) => Math.max(0, a - 1));
  }

  function tamamla() {
    setGenelHata(null);
    basla(async () => {
      const sonuc = await baslangiciTamamla({
        site,
        siteTuru,
        hedef: HEDEFLER.find((h) => h.deger === hedef)?.ad ?? hedef,
        rakipler: rakipler.map((r) => r.trim()).filter(Boolean),
      });
      if (sonuc?.hata) setGenelHata(sonuc.hata);
    });
  }

  function rakipDegistir(indeks: number, deger: string) {
    setRakipler((mevcut) => mevcut.map((r, i) => (i === indeks ? deger : r)));
  }

  function oneriEkle(alanAdi: string) {
    setRakipler((mevcut) => {
      if (mevcut.includes(alanAdi)) return mevcut.map((r) => (r === alanAdi ? "" : r));
      const bosIndeks = mevcut.findIndex((r) => !r.trim());
      if (bosIndeks === -1) return mevcut;
      return mevcut.map((r, i) => (i === bosIndeks ? alanAdi : r));
    });
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-9 flex items-center gap-2">
        {Array.from({ length: ADIM_SAYISI }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= adim ? "bg-ink-900" : "bg-ink-100",
            )}
          />
        ))}
      </div>

      {genelHata ? (
        <div className="mb-5">
          <Uyari ton="kritik">{genelHata}</Uyari>
        </div>
      ) : null}

      {adim === 0 ? (
        <div className="animate-rise">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">
            Öncelikle web sitenizi tanıyalım.
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Analiz edeceğimiz mağazanın adresini girin. Kod eklemenize veya doğrulama yapmanıza gerek yok.
          </p>

          <div className="mt-7">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-ink-300">
                https://
              </span>
              <input
                type="text"
                inputMode="url"
                autoFocus
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  if (siteHatasi) setSiteHatasi(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") ileri();
                }}
                placeholder="magazam.com"
                aria-label="Web sitesi adresi"
                className={cn(
                  "h-12 w-full rounded-[12px] border bg-white pl-[68px] pr-3.5 text-[15px] text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-4 focus:ring-ink-900/5",
                  siteHatasi ? "border-critical" : "border-line focus:border-ink-400",
                )}
              />
            </div>
            {siteHatasi ? <p className="mt-2 text-[12.5px] text-critical">{siteHatasi}</p> : null}
          </div>
        </div>
      ) : null}

      {adim === 1 ? (
        <div className="animate-rise">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">
            Ne tür bir web sitesine sahipsiniz?
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Analizleri ve önerileri site türünüze göre şekillendiriyoruz.
          </p>

          <div className="mt-7 grid gap-2 sm:grid-cols-2">
            {SITE_TURLERI.map((t) => (
              <SecenekKarti
                key={t.deger}
                secili={siteTuru === t.deger}
                baslik={t.ad}
                aciklama={t.aciklama}
                ikon={t.ikon}
                onClick={() => setSiteTuru(t.deger)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {adim === 2 ? (
        <div className="animate-rise">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">
            En önemli hedefiniz nedir?
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            Aksiyon merkezindeki öncelik sıralamasını bu hedefe göre kuruyoruz.
          </p>

          <div className="mt-7 space-y-2">
            {HEDEFLER.map((h) => (
              <SecenekKarti
                key={h.deger}
                secili={hedef === h.deger}
                baslik={h.ad}
                ikon={h.ikon}
                onClick={() => setHedef(h.deger)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {adim === 3 ? (
        <div className="animate-rise">
          <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-ink-900">Rakipleriniz</h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            En fazla 3 rakip ekleyebilirsiniz. Bu adımı atlayıp sonradan da ekleyebilirsiniz.
          </p>

          {onerilerYukleniyor ? (
            <p className="mt-6 text-[13px] text-ink-400">Sizin için rakip önerileri hazırlanıyor…</p>
          ) : oneriler.length ? (
            <div className="mt-6">
              <p className="mb-2.5 text-[12.5px] font-medium text-ink-500">
                Arama sonuçlarında sizinle yarışan siteler
              </p>
              <div className="flex flex-wrap gap-1.5">
                {oneriler.map((o) => {
                  const secili = rakipler.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => oneriEkle(o)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                        secili
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-line bg-white text-ink-600 hover:border-ink-200 hover:bg-surface-muted",
                      )}
                    >
                      {secili ? "✓ " : "+ "}
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {rakipler.map((r, i) => (
              <Alan
                key={i}
                etiket={`${i + 1}. rakip`}
                name={`rakip-${i}`}
                value={r}
                onChange={(e) => rakipDegistir(i, e.target.value)}
                placeholder="rakipmagaza.com"
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-9 flex items-center justify-between gap-3">
        {adim > 0 ? (
          <Buton gorunum="sessiz" onClick={geri} disabled={gonderiliyor}>
            <ArrowLeft aria-hidden />
            Geri
          </Buton>
        ) : (
          <span />
        )}

        {adim < ADIM_SAYISI - 1 ? (
          <Buton onClick={ileri} boyut="lg">
            Devam Et
            <ArrowRight aria-hidden />
          </Buton>
        ) : (
          <Buton onClick={tamamla} boyut="lg" yukleniyor={gonderiliyor}>
            Analizi Başlat
            <ArrowRight aria-hidden />
          </Buton>
        )}
      </div>
    </div>
  );
}
