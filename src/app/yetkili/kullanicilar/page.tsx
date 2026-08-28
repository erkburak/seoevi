import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import {
  GoruntuleDugmesi,
  KisitlaDugmesi,
  PaketDegistirDugmesi,
} from "@/components/app/yetkili-formlar";
import { Rozet } from "@/components/ui/badge";
import { tumPaketler } from "@/lib/plans";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { goreliZaman, tarih } from "@/lib/utils";
import { yetkiliGerekli } from "@/lib/yetkili";

const DURUM_ETIKET: Record<string, string> = {
  deneme: "Deneme",
  aktif: "Aktif",
  gecikmis: "Ödeme bekliyor",
  iptal: "İptal",
  sona_erdi: "Süresi doldu",
};

const DURUM_TONU: Record<string, "olumlu" | "bilgi" | "uyari" | "kritik" | "notr"> = {
  aktif: "olumlu",
  deneme: "bilgi",
  gecikmis: "uyari",
  iptal: "notr",
  sona_erdi: "kritik",
};

export default async function YetkiliKullanicilarSayfasi() {
  await yetkiliGerekli();
  const supabase = yoneticiIstemcisi();

  const [{ data: profiller }, { data: abonelikler }, { data: projeler }, planlar] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, company, role, is_blocked, created_at, onboarded_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("subscriptions").select("user_id, plan_id, status, current_period_end"),
      supabase.from("projects").select("user_id").eq("is_deleted", false),
      tumPaketler(),
    ]);

  // Yetkili, listelenmeyen deneme paketini de atayabilmeli.
  const atanabilirPlanlar = planlar;

  const abonelikHaritasi = new Map(
    (abonelikler ?? []).map((a) => [a.user_id, a]),
  );

  const projeSayilari = new Map<string, number>();
  for (const p of projeler ?? []) {
    projeSayilari.set(p.user_id, (projeSayilari.get(p.user_id) ?? 0) + 1);
  }

  return (
    <>
      <SayfaBasligi
        baslik="Kullanıcılar"
        aciklama={`${profiller?.length ?? 0} kayıtlı kullanıcı. Paketleri buradan değiştirebilir, kötüye kullanımda hesabı kısıtlayabilirsiniz.`}
      />

      <div className="table-scroll rounded-[14px] border border-line bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-surface-muted">
            <tr>
              {["Kullanıcı", "Paket", "Durum", "Proje", "Kayıt", "İşlem"].map((b, i) => (
                <th
                  key={b}
                  scope="col"
                  className={`whitespace-nowrap border-b border-line px-4 py-3 text-[12px] font-medium text-ink-500 ${
                    i >= 3 ? "text-right" : "text-left"
                  }`}
                >
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(profiller ?? []).map((p) => {
              const abonelik = abonelikHaritasi.get(p.id);
              const plan = atanabilirPlanlar.find((x) => x.id === abonelik?.plan_id);

              return (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium text-ink-900">
                        {p.full_name?.trim() || "—"}
                        {p.role === "yetkili" ? <Rozet ton="koyu">Yetkili</Rozet> : null}
                        {p.is_blocked ? <Rozet ton="kritik">Kısıtlı</Rozet> : null}
                      </p>
                      <p className="truncate text-[12px] text-ink-400">{p.email}</p>
                      {p.company ? (
                        <p className="truncate text-[12px] text-ink-300">{p.company}</p>
                      ) : null}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-ink-700">
                    {plan?.name ?? "—"}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    {abonelik ? (
                      <div>
                        <Rozet ton={DURUM_TONU[abonelik.status] ?? "notr"}>
                          {DURUM_ETIKET[abonelik.status] ?? abonelik.status}
                        </Rozet>
                        {abonelik.current_period_end ? (
                          <p className="mt-1 text-[11.5px] text-ink-400">
                            {tarih(abonelik.current_period_end)}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-ink-300">abonelik yok</span>
                    )}
                  </td>

                  <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-700">
                    {projeSayilari.get(p.id) ?? 0}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3 text-right text-[12px] text-ink-400">
                    {goreliZaman(p.created_at)}
                    {!p.onboarded_at ? (
                      <span className="block text-[11px] text-ink-300">kurulum yapmadı</span>
                    ) : null}
                  </td>

                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <PaketDegistirDugmesi
                        kullaniciId={p.id}
                        eposta={p.email ?? ""}
                        mevcutPlanId={abonelik?.plan_id ?? null}
                        mevcutDurum={abonelik?.status ?? null}
                        planlar={atanabilirPlanlar}
                      />
                      <GoruntuleDugmesi kullaniciId={p.id} />
                      <KisitlaDugmesi kullaniciId={p.id} kisitli={p.is_blocked ?? false} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!profiller?.length ? (
        <p className="mt-4 rounded-[12px] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink-400">
          Henüz kayıtlı kullanıcı yok.
        </p>
      ) : null}
    </>
  );
}
