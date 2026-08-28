import { MessagesSquare } from "lucide-react";
import type { Metadata } from "next";

import { DestekFormu } from "@/components/app/destek-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { tarihSaat } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Beraber İnceleyelim",
  robots: { index: false, follow: false },
};

const DURUM_ADI: Record<string, { ad: string; ton: "notr" | "bilgi" | "olumlu" | "uyari" }> = {
  yeni: { ad: "İletildi", ton: "bilgi" },
  inceleniyor: { ad: "İnceleniyor", ton: "uyari" },
  cevaplandi: { ad: "Yanıtlandı", ton: "olumlu" },
  kapandi: { ad: "Kapandı", ton: "notr" },
};

type Talep = {
  id: string;
  konu: string;
  mesaj: string;
  durum: string;
  yanit: string | null;
  created_at: string;
  yanitlandi_at: string | null;
};

export default async function BeraberInceleyelimSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const { data } = await supabase
    .from("support_tickets")
    .select("id, konu, mesaj, durum, yanit, created_at, yanitlandi_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const talepler = (data ?? []) as Talep[];

  return (
    <>
      <SayfaBasligi
        baslik="Beraber İnceleyelim"
        aciklama="Verilerinizde anlamadığınız ya da emin olamadığınız bir şey mi var? Bize yazın, detaylı inceleyip dönüş sağlayalım."
      />

      <div className="space-y-9">
        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <div className="flex items-start gap-3">
            <MessagesSquare className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
            <div>
              <p className="text-[14px] font-medium text-ink-900">
                Bu hizmet tamamen ücretsizdir
              </p>
              <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-600">
                Paketinizden hiçbir hak düşmez. SEO Evi&apos;nin ürettiği veriyi yorumlamak
                bazen deneyim ister; takıldığınız yerde sizi yalnız bırakmıyoruz. Talebinizi
                aldıktan sonra projenizin verilerini detaylı inceleyip somut bir yanıtla
                döneceğiz.
              </p>
            </div>
          </div>
        </section>

        <section>
          <BolumBasligi
            baslik="Yeni talep"
            aciklama="Hangi ekranda ne gördüğünüzü yazarsanız dönüşümüz daha isabetli olur."
          />
          <div className="mt-4">
            <DestekFormu projeId={proje.id} />
          </div>
        </section>

        {talepler.length > 0 ? (
          <section>
            <BolumBasligi baslik="Talepleriniz" />
            <ul className="mt-4 space-y-2">
              {talepler.map((t) => {
                const durum = DURUM_ADI[t.durum] ?? DURUM_ADI.yeni;
                return (
                  <li key={t.id} className="rounded-[14px] border border-line bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-ink-900">{t.konu}</p>
                        <p className="mt-0.5 text-[12px] text-ink-400">
                          {tarihSaat(t.created_at)}
                        </p>
                      </div>
                      <Rozet ton={durum.ton}>{durum.ad}</Rozet>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-[13.5px] leading-relaxed text-ink-600">
                      {t.mesaj}
                    </p>

                    {t.yanit ? (
                      <div className="mt-3 rounded-[12px] border border-positive/20 bg-positive-soft/40 p-3.5">
                        <p className="text-[12.5px] font-medium text-ink-900">
                          SEO Evi yanıtı
                          {t.yanitlandi_at ? (
                            <span className="ml-2 font-normal text-ink-400">
                              {tarihSaat(t.yanitlandi_at)}
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-700">
                          {t.yanit}
                        </p>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
