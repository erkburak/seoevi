"use client";

import { Blocks, Briefcase, Newspaper, ShoppingBag, Store, Wrench } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { projeAdiGuncelle, projeOlustur, projeSil, type ProjeSonucu } from "@/app/(uygulama)/projeler/actions";
import { Buton } from "@/components/ui/button";
import { Alan } from "@/components/ui/form";
import { Uyari } from "@/components/ui/feedback";
import { Pencere } from "@/components/ui/overlay";
import type { SiteTuru } from "@/types/database";

const BOS: ProjeSonucu = {};

const SITE_TURLERI: { deger: SiteTuru; etiket: string; ikon: typeof Store }[] = [
  { deger: "eticaret", etiket: "E-ticaret", ikon: ShoppingBag },
  { deger: "kurumsal", etiket: "Kurumsal", ikon: Briefcase },
  { deger: "hizmet", etiket: "Hizmet", ikon: Wrench },
  { deger: "blog", etiket: "Blog", ikon: Newspaper },
  { deger: "pazaryeri", etiket: "Pazaryeri", ikon: Store },
  { deger: "diger", etiket: "Diğer", ikon: Blocks },
];

/** Yeni proje oluşturma formu. */
export function YeniProjeFormu() {
  const [durum, gonder, bekliyor] = useActionState(projeOlustur, BOS);
  const [tur, setTur] = useState<SiteTuru>("eticaret");

  return (
    <form action={gonder} className="space-y-6">
      <Alan
        etiket="Web sitesi adresi"
        name="site"
        type="text"
        inputMode="url"
        autoComplete="url"
        autoFocus
        placeholder="magazam.com"
        yardim="Alan adını yazmanız yeterli. Adresi biz düzenleriz."
        required
      />

      <input type="hidden" name="siteTuru" value={tur} />

      <div className="space-y-2.5">
        <span className="block text-[13px] font-medium text-ink-700">Site türü</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SITE_TURLERI.map((s) => {
            const secili = tur === s.deger;
            const Ikon = s.ikon;
            return (
              <button
                key={s.deger}
                type="button"
                onClick={() => setTur(s.deger)}
                aria-pressed={secili}
                className={
                  secili
                    ? "flex items-center gap-2 rounded-[11px] border border-ink-900 bg-ink-900/[0.03] px-3 py-2.5 text-[13px] font-medium text-ink-900 shadow-subtle transition-all"
                    : "flex items-center gap-2 rounded-[11px] border border-line bg-white px-3 py-2.5 text-[13px] text-ink-600 transition-all hover:border-ink-200 hover:bg-surface-muted"
                }
              >
                <Ikon className="size-4 shrink-0" aria-hidden />
                {s.etiket}
              </button>
            );
          })}
        </div>
      </div>

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}

      <Buton type="submit" boyut="lg" tamGenislik yukleniyor={bekliyor}>
        Analizi Başlat
      </Buton>

      <p className="text-center text-[12.5px] leading-relaxed text-ink-400">
        Analiz arka planda çalışır. Siteniz taranırken paneli kullanmaya devam edebilirsiniz.
      </p>
    </form>
  );
}

/** Proje adını düzenleme alanı. */
export function ProjeAdiFormu({ projeId, mevcutAd }: { projeId: string; mevcutAd: string }) {
  const [ad, setAd] = useState(mevcutAd);
  const [durum, setDurum] = useState<ProjeSonucu>({});
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  const degisti = ad.trim() !== mevcutAd;

  function kaydet() {
    basla(async () => {
      const sonuc = await projeAdiGuncelle(projeId, ad);
      setDurum(sonuc);
      if (sonuc.basari) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Alan
            etiket="Proje adı"
            name="ad"
            value={ad}
            onChange={(e) => setAd(e.target.value)}
            maxLength={80}
            yardim="Panelde ve raporlarda bu ad görünür."
          />
        </div>
        <Buton onClick={kaydet} disabled={!degisti} yukleniyor={bekliyor} className="sm:mb-[26px]">
          Kaydet
        </Buton>
      </div>
      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}
    </div>
  );
}

/** Proje silme akışı — alan adı yazılarak onaylanır. */
export function ProjeSilDugmesi({
  projeId,
  domain,
  gorunum = "tehlike",
}: {
  projeId: string;
  domain: string;
  gorunum?: "tehlike" | "ikincil";
}) {
  const [acik, setAcik] = useState(false);
  const [onay, setOnay] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function sil() {
    basla(async () => {
      const sonuc = await projeSil(projeId, onay);
      if (sonuc.hata) {
        setHata(sonuc.hata);
        return;
      }
      setAcik(false);
      setOnay("");
      router.refresh();
    });
  }

  return (
    <>
      <Buton gorunum={gorunum} boyut="sm" onClick={() => setAcik(true)}>
        Projeyi Sil
      </Buton>

      <Pencere
        acik={acik}
        kapat={() => setAcik(false)}
        baslik="Projeyi sil"
        aciklama={`${domain} ve bu projeye ait tüm veriler kaldırılacak.`}
        genislik="sm"
        altBolum={
          <>
            <Buton gorunum="sessiz" onClick={() => setAcik(false)}>
              Vazgeç
            </Buton>
            <Buton
              gorunum="tehlike"
              onClick={sil}
              yukleniyor={bekliyor}
              disabled={onay.trim().toLowerCase() !== domain.toLowerCase()}
            >
              Kalıcı Olarak Sil
            </Buton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13.5px] leading-relaxed text-ink-600">
            Bu projeye ait tüm analizler, anahtar kelimeler, rakip verileri, sayfa denetimleri ve
            raporlar silinecek. Devam eden analizler iptal edilir.
          </p>
          <Alan
            etiket={`Onaylamak için "${domain}" yazın`}
            name="onay"
            value={onay}
            onChange={(e) => {
              setOnay(e.target.value);
              setHata(null);
            }}
            placeholder={domain}
            autoComplete="off"
          />
          {hata ? <Uyari ton="kritik">{hata}</Uyari> : null}
        </div>
      </Pencere>
    </>
  );
}
