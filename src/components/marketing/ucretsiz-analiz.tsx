"use client";

import { AlertTriangle, Check, Info, X } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { ucretsizAnalizYap, type UcretsizAnalizSonucu } from "@/app/ucretsiz-seo-analizi/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { SkorHalkasi, SEVIYE_ETIKET, skorSeviyesi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { sayi } from "@/lib/utils";
import type { Bulgu } from "@/lib/araclar/hizli-analiz";

const BOS: UcretsizAnalizSonucu = {};

const ONEM_STILI: Record<Bulgu["onem"], { ikon: typeof Check; kutu: string; metin: string; etiket: string }> = {
  kritik: {
    ikon: X,
    kutu: "border-critical/20 bg-critical-soft",
    metin: "text-critical",
    etiket: "Kritik",
  },
  uyari: {
    ikon: AlertTriangle,
    kutu: "border-caution/20 bg-caution-soft",
    metin: "text-caution",
    etiket: "Uyarı",
  },
  bilgi: { ikon: Info, kutu: "border-line bg-white", metin: "text-ink-400", etiket: "Bilgi" },
  olumlu: {
    ikon: Check,
    kutu: "border-positive/20 bg-positive-soft",
    metin: "text-positive",
    etiket: "İyi",
  },
};

const SIRA: Bulgu["onem"][] = ["kritik", "uyari", "bilgi", "olumlu"];

export function UcretsizAnalizAraci() {
  const [durum, gonder, bekliyor] = useActionState(ucretsizAnalizYap, BOS);
  const s = durum.sonuc;

  return (
    <div className="space-y-10">
      <form action={gonder} className="mx-auto flex max-w-xl flex-col gap-2 sm:flex-row">
        <input
          name="site"
          type="text"
          inputMode="url"
          placeholder="magazam.com"
          aria-label="Analiz edilecek web sitesi adresi"
          required
          className="h-12 min-w-0 flex-1 rounded-[12px] border border-line bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
        />
        <Buton type="submit" boyut="lg" yukleniyor={bekliyor}>
          Analizi Başlat
        </Buton>
      </form>

      {durum.hata ? (
        <div className="mx-auto max-w-xl">
          <Uyari ton="kritik">{durum.hata}</Uyari>
        </div>
      ) : null}

      {s ? (
        <div className="animate-rise space-y-9">
          {/* --- Skor --- */}
          <section className="glass rounded-[16px] p-6">
            <div className="flex flex-wrap items-center gap-6">
              <SkorHalkasi skor={s.skor} boyut={112} etiket="SEO skoru" />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-400">
                  Analiz edilen sayfa
                </p>
                <p className="mt-1.5 truncate text-[18px] font-semibold tracking-[-0.02em] text-ink-900">
                  {s.alanAdi}
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
                  {SEVIYE_ETIKET[skorSeviyesi(s.skor)]} —{" "}
                  {s.bulgular.filter((b) => b.onem === "kritik").length} kritik,{" "}
                  {s.bulgular.filter((b) => b.onem === "uyari").length} uyarı bulundu.
                </p>
              </div>
            </div>
          </section>

          {/* --- Ölçümler --- */}
          <section>
            <BolumBasligi baslik="Ölçülen değerler" />
            <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-3 lg:grid-cols-6">
              <OzetDegeri etiket="Başlık" deger={`${s.titleUzunluk} kr.`} />
              <OzetDegeri etiket="Açıklama" deger={`${s.metaAciklamaUzunluk} kr.`} />
              <OzetDegeri etiket="H1" deger={sayi(s.h1.length)} />
              <OzetDegeri etiket="Kelime" deger={sayi(s.kelimeSayisi)} />
              <OzetDegeri etiket="Görsel" deger={sayi(s.gorselSayisi)} />
              <OzetDegeri etiket="İç bağlantı" deger={sayi(s.icLink)} />
            </div>
          </section>

          {/* --- Bulgular --- */}
          <section>
            <BolumBasligi
              baslik="Bulgular"
              aciklama="Önem sırasına göre listelenmiştir. Kritik olanlardan başlayın."
            />
            <ul className="mt-4 space-y-2">
              {SIRA.flatMap((onem) => s.bulgular.filter((b) => b.onem === onem)).map((b) => {
                const stil = ONEM_STILI[b.onem];
                const Ikon = stil.ikon;
                return (
                  <li key={b.kod} className={`flex gap-3 rounded-[12px] border p-4 ${stil.kutu}`}>
                    <span className={`mt-0.5 shrink-0 ${stil.metin}`}>
                      <Ikon className="size-4" aria-hidden />
                      <span className="sr-only">{stil.etiket}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-ink-900">{b.baslik}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{b.aciklama}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* --- Devamı --- */}
          <section className="rounded-[16px] border border-line bg-surface-muted/60 p-7 text-center">
            <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
              Bu yalnızca tek bir sayfanın özeti
            </h2>
            <p className="mx-auto mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-500">
              Ücretsiz hesap açtığınızda sitenizin tamamı taranır; anahtar kelimeleriniz,
              rakipleriniz, ürün sayfalarınız ve Google Alışveriş görünürlüğünüz de analiz edilir.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              <Buton asChild boyut="lg">
                <Link href={`/kayit?site=${encodeURIComponent(s.alanAdi)}`}>
                  Sitemin Tamamını Analiz Et
                </Link>
              </Buton>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
