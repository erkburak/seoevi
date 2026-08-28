import { Globe, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { projeyeGec } from "@/app/(uygulama)/projeler/actions";
import { ProjeSilDugmesi } from "@/components/app/proje-formu";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { BosDurum } from "@/components/ui/feedback";
import { SkorHalkasi } from "@/components/ui/score";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu, projeLimitiUygunMu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { goreliZaman, sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Projeler",
  robots: { index: false, follow: false },
};

const SITE_TURU_ADI: Record<string, string> = {
  eticaret: "E-ticaret",
  kurumsal: "Kurumsal",
  hizmet: "Hizmet",
  blog: "Blog",
  pazaryeri: "Pazaryeri",
  diger: "Diğer",
};

export default async function ProjelerSayfasi() {
  const { kullanici, proje: aktifProje, projeler } = await projeBaglami();
  const [limit, { plan }, supabase] = await Promise.all([
    projeLimitiUygunMu(kullanici.id),
    abonelikDurumu(kullanici.id),
    sunucuIstemcisi(),
  ]);

  // Devam eden analizler — proje kartında durum göstermek için.
  const { data: isVerisi } = await supabase
    .from("audit_jobs")
    .select("project_id, status")
    .in(
      "project_id",
      projeler.map((p) => p.id),
    )
    .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"]);

  const calisanlar = new Set((isVerisi ?? []).map((i) => i.project_id));

  return (
    <>
      <SayfaBasligi
        baslik="Projeler"
        aciklama="Yönettiğiniz web siteleri. Her proje kendi analizleri, anahtar kelimeleri ve rakipleriyle ayrı takip edilir."
        aksiyon={
          limit.uygun ? (
            <Buton asChild>
              <Link href="/projeler/yeni">
                <Plus aria-hidden />
                Proje Ekle
              </Link>
            </Buton>
          ) : (
            <Buton asChild gorunum="ikincil">
              <Link href="/hesabim">Paketi Yükselt</Link>
            </Buton>
          )
        }
      />

      {projeler.length === 0 ? (
        <BosDurum
          ikon={Globe}
          baslik="Henüz proje bulunmuyor."
          aciklama="Analiz etmek istediğiniz web sitesini ekleyin; teknik SEO, anahtar kelime ve rakip analizini biz başlatalım."
          aksiyon={
            <Buton asChild>
              <Link href="/projeler/yeni">Proje Ekle</Link>
            </Buton>
          }
        />
      ) : (
        <div className="space-y-6">
          <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
            {projeler.map((p) => {
              const aktifMi = p.id === aktifProje.id;
              const calisiyor = calisanlar.has(p.id);

              return (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-4 sm:px-5">
                  <SkorHalkasi skor={p.scores?.seo ?? null} boyut={54} kalinlik={5} />

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[14.5px] font-medium text-ink-900">{p.name}</span>
                      {aktifMi ? <Rozet ton="koyu">Aktif</Rozet> : null}
                      {calisiyor ? (
                        <Rozet ton="bilgi" nokta>
                          Analiz sürüyor
                        </Rozet>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[12.5px] text-ink-400">
                      {p.domain} · {SITE_TURU_ADI[p.site_type] ?? "Diğer"} ·{" "}
                      {p.last_audit_at ? `Son analiz ${goreliZaman(p.last_audit_at)}` : "Henüz analiz edilmedi"}
                    </p>
                  </div>

                  <dl className="hidden gap-7 md:flex">
                    <div>
                      <dt className="text-[11.5px] text-ink-400">Sıralanan kelime</dt>
                      <dd className="tabular mt-0.5 text-[14px] font-medium text-ink-800">
                        {sayi(p.stats?.siralanan_kelime ?? 0)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11.5px] text-ink-400">Kritik sorun</dt>
                      <dd className="tabular mt-0.5 text-[14px] font-medium text-ink-800">
                        {sayi(p.stats?.kritik_sorun ?? 0)}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex shrink-0 items-center gap-2">
                    {aktifMi ? (
                      <Buton asChild gorunum="ikincil" boyut="sm">
                        <Link href="/genel-bakis">Panele Git</Link>
                      </Buton>
                    ) : (
                      <form action={projeyeGec}>
                        <input type="hidden" name="projeId" value={p.id} />
                        <Buton type="submit" gorunum="ikincil" boyut="sm">
                          Bu Projeye Geç
                        </Buton>
                      </form>
                    )}
                    <ProjeSilDugmesi projeId={p.id} domain={p.domain} gorunum="ikincil" />
                  </div>
                </li>
              );
            })}
          </ul>

          <p className="text-[12.5px] text-ink-400">
            {plan?.name ?? "Mevcut"} paketinde {limit.mevcut} / {limit.limit} proje kullanılıyor.
            {!limit.uygun ? (
              <>
                {" "}
                <Link href="/hesabim" className="font-medium text-ink-700 underline underline-offset-2">
                  Daha fazlası için paketinizi yükseltin.
                </Link>
              </>
            ) : null}
          </p>
        </div>
      )}
    </>
  );
}
