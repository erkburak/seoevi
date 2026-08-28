import { KenarCubuguIcerigi } from "@/components/app/kenar-cubugu";
import { GoruntulemeBandi } from "@/components/app/goruntuleme-bandi";
import { UstCubuk } from "@/components/app/ust-cubuk";
import { YukseltmeKarti } from "@/components/app/yukseltme-karti";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu, kullanimOzeti, sonrakiPlan } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import type { Bildirim } from "@/types/database";

export default async function UygulamaYerlesimi({ children }: { children: React.ReactNode }) {
  const { kullanici, profil, proje, projeler, saltOkunur, goruntulenenEposta } =
    await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ data: bildirimVerisi }, { plan, abonelik, denemeGunKaldi }, kullanimlar] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", kullanici.id)
        .order("created_at", { ascending: false })
        .limit(12),
      abonelikDurumu(kullanici.id),
      kullanimOzeti(kullanici.id),
    ]);

  const bildirimler = (bildirimVerisi ?? []) as Bildirim[];
  const okunmamis = bildirimler.filter((b) => !b.is_read).length;

  const kullaniciAdi =
    profil?.full_name?.trim() || (kullanici.email ?? "Kullanıcı").split("@")[0];

  /* --- Paket yükseltme kartı --- */
  const sonraki = plan ? await sonrakiPlan(plan.id) : null;

  // En çok dolan limit, kullanıcıya en anlamlı yükseltme gerekçesidir.
  const enDolu = kullanimlar.reduce<{ ad: string; oran: number } | null>(
    (enYuksek, k) => (!enYuksek || k.oran > enYuksek.oran ? { ad: k.ad, oran: k.oran } : enYuksek),
    null,
  );

  const yukseltmeKarti = (
    <YukseltmeKarti
      planAdi={plan?.name ?? "Mevcut"}
      denemeMi={abonelik?.status === "deneme"}
      denemeGunKaldi={denemeGunKaldi}
      doluluk={enDolu?.oran ?? 0}
      darBogaz={enDolu?.ad ?? null}
      hedefPlanAdi={sonraki?.name ?? null}
    />
  );

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[236px] shrink-0 border-r border-line bg-white lg:block">
        <KenarCubuguIcerigi
          projeler={projeler}
          aktifProje={proje}
          kullaniciAdi={kullaniciAdi}
          eposta={kullanici.email ?? ""}
          yukseltmeKarti={yukseltmeKarti}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {saltOkunur ? <GoruntulemeBandi eposta={goruntulenenEposta} /> : null}
        <UstCubuk
          projeler={projeler}
          aktifProje={proje}
          kullaniciAdi={kullaniciAdi}
          eposta={kullanici.email ?? ""}
          bildirimler={bildirimler}
          okunmamis={okunmamis}
          yukseltmeKarti={yukseltmeKarti}
        />
        <main id="icerik" className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
