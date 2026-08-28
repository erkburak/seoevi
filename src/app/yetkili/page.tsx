import { Image as ImageIcon, Tags, Users } from "lucide-react";
import Link from "next/link";

import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { onbellekIstatistigi } from "@/lib/dataforseo/cache";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { goreliZaman, sayi } from "@/lib/utils";
import { yetkiliGerekli } from "@/lib/yetkili";

const KISAYOLLAR = [
  {
    baslik: "Kullanıcılar",
    aciklama: "Paket değiştir, hesap kısıtla",
    href: "/yetkili/kullanicilar",
    ikon: Users,
  },
  {
    baslik: "Marka",
    aciklama: "Logo ve favicon yükle",
    href: "/yetkili/marka",
    ikon: ImageIcon,
  },
  {
    baslik: "Sayfa Bilgileri",
    aciklama: "Başlık ve açıklamaları düzenle",
    href: "/yetkili/sayfa-bilgileri",
    ikon: Tags,
  },
];

const ISLEM_ADI: Record<string, string> = {
  paket_degistir: "Paket değiştirildi",
  kullanici_kisitla: "Hesap kısıtlandı",
  kullanici_ac: "Kısıtlama kaldırıldı",
  marka_gorseli_yukle: "Marka görseli yüklendi",
  marka_gorseli_sil: "Marka görseli kaldırıldı",
  sayfa_ust_verisi: "Sayfa bilgisi güncellendi",
};

export default async function YetkiliGenelSayfasi() {
  await yetkiliGerekli();
  const supabase = yoneticiIstemcisi();

  const [
    { count: kullaniciSayisi },
    { count: projeSayisi },
    { data: abonelikler },
    { data: kayitlar },
    onbellek,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false),
    supabase.from("subscriptions").select("plan_id, status"),
    supabase
      .from("admin_log")
      .select("islem, detay, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    onbellekIstatistigi(30),
  ]);

  const planDagilimi = new Map<string, number>();
  for (const a of abonelikler ?? []) {
    planDagilimi.set(a.plan_id, (planDagilimi.get(a.plan_id) ?? 0) + 1);
  }

  const odeyen = (abonelikler ?? []).filter(
    (a) => a.status === "aktif" && a.plan_id !== "deneme",
  ).length;

  return (
    <>
      <SayfaBasligi
        baslik="Yetkili"
        aciklama="Kullanıcılar, marka ayarları ve sayfa bilgileri. Bu alan yalnızca yetkili rolüne açıktır."
      />

      <div className="space-y-9">
        {/* --- Özet --- */}
        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="Kullanıcı" deger={sayi(kullaniciSayisi ?? 0)} />
          <OzetDegeri etiket="Ödeyen abone" deger={sayi(odeyen)} />
          <OzetDegeri etiket="Aktif proje" deger={sayi(projeSayisi ?? 0)} />
          <OzetDegeri
            etiket="Deneme"
            deger={sayi(planDagilimi.get("deneme") ?? 0)}
          />
        </section>

        {/* --- Sağlayıcı maliyeti --- */}
        <section>
          <BolumBasligi
            baslik="Sağlayıcı maliyeti"
            aciklama="Son 30 gün. Önbellek tasarrufu, aynı verinin tekrar satın alınmadığı tutardır."
          />
          <div className="mt-4 grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
            <OzetDegeri
              etiket="Harcanan"
              deger={`$${onbellek.harcanan.toFixed(2)}`}
              ipucu="DataForSEO'ya gerçekte ödenen tutar."
            />
            <OzetDegeri
              etiket="Önbellek tasarrufu"
              deger={`$${onbellek.tasarruf.toFixed(2)}`}
              ipucu="Önbellek olmasaydı ek olarak ödenecek tutar."
            />
            <OzetDegeri etiket="İsabet oranı" deger={`%${onbellek.isabetOrani}`} />
            <OzetDegeri etiket="Saklanan kayıt" deger={sayi(onbellek.kayitSayisi)} />
          </div>
        </section>

        {/* --- Kısayollar --- */}
        <section>
          <BolumBasligi baslik="Yönetim" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {KISAYOLLAR.map((k) => {
              const Ikon = k.ikon;
              return (
                <Link
                  key={k.href}
                  href={k.href}
                  className="rounded-[14px] border border-line bg-white p-5 transition-all duration-200 hover:border-ink-200 hover:shadow-raised"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface-muted text-ink-500">
                    <Ikon className="size-4" aria-hidden />
                  </span>
                  <h3 className="mt-3.5 text-[14.5px] font-semibold text-ink-900">{k.baslik}</h3>
                  <p className="mt-1 text-[12.5px] text-ink-400">{k.aciklama}</p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* --- Son işlemler --- */}
        <section>
          <BolumBasligi
            baslik="Son yönetim işlemleri"
            aciklama="Yetkili alanında yapılan değişiklikler iz bırakır."
          />
          {kayitlar?.length ? (
            <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
              {kayitlar.map((k, i) => (
                <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="min-w-0 text-[13.5px] text-ink-700">
                    {ISLEM_ADI[k.islem] ?? k.islem}
                    {(k.detay as { path?: string; tur?: string })?.path ? (
                      <span className="ml-2 text-[12.5px] text-ink-400">
                        {(k.detay as { path?: string }).path}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-[12px] text-ink-400">
                    {goreliZaman(k.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-400">
              Henüz yönetim işlemi yapılmadı.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
