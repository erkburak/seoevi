import type { Metadata } from "next";
import Link from "next/link";

import { ProfilFormu, SifreFormu } from "@/components/app/hesap-formlari";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { KullanimCubugu } from "@/components/ui/score";
import { Ayirac, BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { WHATSAPP_MESSAGES } from "@/config/site";
import { LIMIT_ADLARI, limitMetni, planlariGetir } from "@/lib/plans";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu, kullanimOzeti, sonrakiPlan } from "@/lib/subscription";
import { para, tarih } from "@/lib/utils";
import type { PlanLimitleri } from "@/types/database";

export const metadata: Metadata = {
  title: "Hesabım",
  robots: { index: false, follow: false },
};

const DURUM_ETIKET: Record<string, string> = {
  deneme: "Ücretsiz deneme",
  aktif: "Aktif",
  gecikmis: "Ödeme bekliyor",
  iptal: "İptal edildi",
  sona_erdi: "Süresi doldu",
};

const SEKMELER = [
  { etiket: "Paket ve kullanım", href: "/hesabim" },
  { etiket: "Profil", href: "/hesabim?bolum=profil" },
  { etiket: "Güvenlik", href: "/hesabim?bolum=guvenlik" },
];

export default async function HesabimSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ bolum?: string }>;
}) {
  const { bolum } = await searchParams;
  const { kullanici, profil } = await projeBaglami();

  const [{ plan, abonelik, limitler, denemeGunKaldi, aktifMi }, kullanimlar, planlar] =
    await Promise.all([
      abonelikDurumu(kullanici.id),
      kullanimOzeti(kullanici.id),
      planlariGetir(),
    ]);

  const yukseltme = plan ? await sonrakiPlan(plan.id) : null;
  const aktifSekme =
    bolum === "profil" ? SEKMELER[1].href : bolum === "guvenlik" ? SEKMELER[2].href : SEKMELER[0].href;

  return (
    <>
      <SayfaBasligi baslik="Hesabım" aciklama="Paketiniz, kullanım durumunuz ve hesap bilgileriniz." />

      <Sekmeler ogeler={SEKMELER} aktif={aktifSekme} className="mb-8" />

      {bolum === "profil" ? (
        <section className="max-w-lg">
          <BolumBasligi baslik="Profil bilgileri" aciklama="Panelde ve raporlarda görünen bilgiler." />
          <div className="mt-5">
            <ProfilFormu profil={profil} eposta={kullanici.email ?? ""} />
          </div>
        </section>
      ) : bolum === "guvenlik" ? (
        <section className="max-w-lg space-y-8">
          <div>
            <BolumBasligi
              baslik="Şifre"
              aciklama="Hesabınıza giriş yaparken kullandığınız şifreyi değiştirin."
            />
            <div className="mt-5">
              <SifreFormu />
            </div>
          </div>

          <Ayirac />

          <div>
            <BolumBasligi baslik="Oturum" aciklama="Bu cihazdaki oturumunuzu sonlandırın." />
            <form action="/auth/cikis" method="post" className="mt-4">
              <Buton type="submit" gorunum="ikincil">
                Çıkış Yap
              </Buton>
            </form>
          </div>
        </section>
      ) : (
        <div className="space-y-10">
          {/* --- Mevcut paket --- */}
          <section>
            <div className="glass rounded-[16px] p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
                      {plan?.name ?? "Paket bulunamadı"}
                    </h2>
                    {abonelik ? (
                      <Rozet ton={aktifMi ? "olumlu" : "uyari"} nokta>
                        {DURUM_ETIKET[abonelik.status] ?? abonelik.status}
                      </Rozet>
                    ) : null}
                  </div>
                  <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-ink-500">
                    {plan?.headline ?? "Aboneliğiniz bulunamadı. Destek ekibiyle iletişime geçin."}
                  </p>

                  {abonelik?.status === "deneme" && denemeGunKaldi !== null ? (
                    <p className="mt-3 text-[13px] font-medium text-ink-700">
                      Deneme sürenizin bitmesine {denemeGunKaldi} gün kaldı.
                    </p>
                  ) : abonelik?.current_period_end ? (
                    <p className="mt-3 text-[13px] text-ink-500">
                      Dönem bitişi: {tarih(abonelik.current_period_end)}
                    </p>
                  ) : null}
                </div>

                <div className="text-right">
                  {plan && plan.price_monthly !== null ? (
                    <p className="tabular text-[26px] font-semibold tracking-[-0.025em] text-ink-900">
                      {para(plan.price_monthly)}
                      <span className="ml-1 text-[13px] font-normal text-ink-400">/ ay</span>
                    </p>
                  ) : (
                    <p className="text-[15px] font-medium text-ink-700">Size özel</p>
                  )}
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {yukseltme ? (
                      <Buton asChild boyut="sm">
                        <Link href="/fiyatlandirma">{yukseltme.name} Paketine Geç</Link>
                      </Buton>
                    ) : null}
                    <WhatsappButonu
                      mesaj={WHATSAPP_MESSAGES.ozel}
                      kaynak="hesabim"
                      paket={plan?.id}
                      gorunum="ikincil"
                      boyut="sm"
                      cocuk="WhatsApp'tan Konuşalım"
                    />
                  </div>
                </div>
              </div>
            </div>

            {!aktifMi ? (
              <Uyari ton="uyari" baslik="Aboneliğiniz aktif değil" className="mt-4">
                Analizler ve veri güncellemeleri durduruldu. Paketinizi yenilemek için bizimle
                iletişime geçebilirsiniz.
              </Uyari>
            ) : null}
          </section>

          {/* --- Kullanım --- */}
          <section>
            <BolumBasligi
              baslik="Kullanımınız"
              aciklama="Bu dönemde paket limitlerinizin ne kadarını kullandınız."
            />
            <div className="mt-5 grid gap-x-10 gap-y-5 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-2">
              {kullanimlar.map((k) => (
                <KullanimCubugu key={k.metrik} etiket={k.ad} kullanilan={k.kullanilan} limit={k.limit} />
              ))}
            </div>

            {kullanimlar.some((k) => k.oran >= 80) ? (
              <Uyari ton="uyari" baslik="Limitlerinize yaklaştınız" className="mt-4">
                Analizlerin kesintisiz sürmesi için paketinizi yükseltebilir veya size özel bir
                çözüm için bizimle konuşabilirsiniz.{" "}
                <Link href="/fiyatlandirma" className="font-medium underline underline-offset-2">
                  Paketleri inceleyin
                </Link>
                .
              </Uyari>
            ) : null}
          </section>

          {/* --- Paket limitleri --- */}
          {limitler ? (
            <section>
              <BolumBasligi baslik="Paket limitleri" />
              <dl className="mt-5 divide-y divide-line rounded-[14px] border border-line bg-white">
                {(Object.keys(LIMIT_ADLARI) as (keyof PlanLimitleri)[]).map((k) => (
                  <div key={k} className="flex items-baseline justify-between gap-4 px-4 py-3">
                    <dt className="text-[13px] text-ink-500">{LIMIT_ADLARI[k]}</dt>
                    <dd className="tabular text-[13px] font-medium text-ink-900">
                      {limitMetni(limitler[k])}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}

          {/* --- Diğer paketler --- */}
          {planlar.length ? (
            <section>
              <BolumBasligi
                baslik="Diğer paketler"
                aciklama="İhtiyacınız büyüdüğünde dilediğiniz zaman geçiş yapabilirsiniz."
                sag={
                  <Buton asChild gorunum="ikincil" boyut="sm">
                    <Link href="/fiyatlandirma">Tümünü Karşılaştır</Link>
                  </Buton>
                }
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {planlar.map((p) => {
                  const mevcutMu = p.id === plan?.id;
                  return (
                    <div
                      key={p.id}
                      className={
                        mevcutMu
                          ? "rounded-[14px] border border-ink-900 bg-white p-4 shadow-subtle"
                          : "rounded-[14px] border border-line bg-white p-4"
                      }
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[14px] font-semibold text-ink-900">{p.name}</h3>
                        {mevcutMu ? <Rozet ton="koyu">Mevcut</Rozet> : null}
                      </div>
                      <p className="tabular mt-2 text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
                        {p.price_monthly !== null ? (
                          <>
                            {para(p.price_monthly)}
                            <span className="ml-1 text-[12px] font-normal text-ink-400">/ ay</span>
                          </>
                        ) : (
                          "Size özel"
                        )}
                      </p>
                      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">{p.audience}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
