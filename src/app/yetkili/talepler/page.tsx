import type { Metadata } from "next";

import { TalepYanitlama } from "@/components/app/yetkili-formlar";
import { Rozet } from "@/components/ui/badge";
import { BosDurum } from "@/components/ui/feedback";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { tarihSaat } from "@/lib/utils";
import { yetkiliGerekli } from "@/lib/yetkili";
import { MessagesSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Destek Talepleri",
  robots: { index: false, follow: false },
};

const DURUM_ADI: Record<string, { ad: string; ton: "notr" | "bilgi" | "olumlu" | "uyari" }> = {
  yeni: { ad: "Yeni", ton: "bilgi" },
  inceleniyor: { ad: "İnceleniyor", ton: "uyari" },
  cevaplandi: { ad: "Yanıtlandı", ton: "olumlu" },
  kapandi: { ad: "Kapandı", ton: "notr" },
};

export default async function TaleplerSayfasi() {
  await yetkiliGerekli();
  const supabase = yoneticiIstemcisi();

  const { data: talepler } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const liste = talepler ?? [];

  // Talep sahiplerinin kim olduğunu tek sorguda çöz.
  const kullaniciIdleri = [...new Set(liste.map((t) => t.user_id))];
  const { data: profiller } = kullaniciIdleri.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", kullaniciIdleri)
    : { data: [] };

  const kisiler = new Map((profiller ?? []).map((p) => [p.id, p]));

  const projeIdleri = [...new Set(liste.map((t) => t.project_id).filter(Boolean))] as string[];
  const { data: projeler } = projeIdleri.length
    ? await supabase.from("projects").select("id, domain").in("id", projeIdleri)
    : { data: [] };

  const projeAdlari = new Map((projeler ?? []).map((p) => [p.id, p.domain]));

  const bekleyen = liste.filter((t) => t.durum === "yeni" || t.durum === "inceleniyor").length;

  return (
    <>
      <SayfaBasligi
        baslik="Destek Talepleri"
        aciklama={
          bekleyen > 0
            ? `${bekleyen} talep yanıt bekliyor.`
            : "Bekleyen talep yok."
        }
      />

      {liste.length === 0 ? (
        <BosDurum
          ikon={MessagesSquare}
          baslik="Henüz talep yok."
          aciklama="Kullanıcılar Beraber İnceleyelim ekranından talep açtığında burada görünür."
        />
      ) : (
        <ul className="space-y-3">
          {liste.map((t) => {
            const durum = DURUM_ADI[t.durum] ?? DURUM_ADI.yeni;
            const kisi = kisiler.get(t.user_id);

            return (
              <li key={t.id} className="rounded-[14px] border border-line bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-ink-900">{t.konu}</p>
                    <p className="mt-0.5 text-[12.5px] text-ink-400">
                      {kisi?.full_name ? `${kisi.full_name} · ` : ""}
                      {kisi?.email ?? t.user_id}
                      {t.project_id && projeAdlari.get(t.project_id)
                        ? ` · ${projeAdlari.get(t.project_id)}`
                        : ""}
                      {t.kaynak_sayfa ? ` · ${t.kaynak_sayfa}` : ""}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-300">{tarihSaat(t.created_at)}</p>
                  </div>
                  <Rozet ton={durum.ton}>{durum.ad}</Rozet>
                </div>

                <p className="mt-3 whitespace-pre-wrap border-t border-line pt-3 text-[13.5px] leading-relaxed text-ink-600">
                  {t.mesaj}
                </p>

                {t.yanit ? (
                  <div className="mt-3 rounded-[12px] border border-positive/20 bg-positive-soft/40 p-3.5">
                    <p className="text-[12.5px] font-medium text-ink-900">
                      Verilen yanıt
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

                <div className="mt-4 border-t border-line pt-4">
                  <TalepYanitlama
                    talepId={t.id}
                    mevcutYanit={t.yanit ?? ""}
                    mevcutDurum={t.durum}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
