import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { YeniProjeFormu } from "@/components/app/proje-formu";
import { Uyari } from "@/components/ui/feedback";
import { oturumKullanicisi, projeleriGetir } from "@/lib/projects";
import { abonelikDurumu, projeLimitiUygunMu } from "@/lib/subscription";

export const metadata: Metadata = {
  title: "Yeni Proje",
  robots: { index: false, follow: false },
};

export default async function YeniProjeSayfasi() {
  const kullanici = await oturumKullanicisi();
  const [projeler, limit, { plan }] = await Promise.all([
    projeleriGetir(kullanici.id),
    projeLimitiUygunMu(kullanici.id),
    abonelikDurumu(kullanici.id),
  ]);

  const ilkProje = projeler.length === 0;

  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <div className="flex items-center justify-between gap-4">
        <Logo boyut={26} href={ilkProje ? null : "/genel-bakis"} />
        {ilkProje ? null : (
          <Link
            href="/projeler"
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 transition-colors hover:text-ink-900"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Projelere dön
          </Link>
        )}
      </div>

      <main id="icerik" className="flex flex-1 items-center py-10">
        <div className="mx-auto w-full max-w-[440px]">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink-900">
            {ilkProje ? "İlk projenizi oluşturun" : "Yeni proje ekleyin"}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-500">
            {ilkProje
              ? "Analiz etmek istediğiniz web sitesini ekleyin. Teknik SEO taraması, anahtar kelimeler ve rakipler otomatik olarak incelenir."
              : "Her proje kendi analizleri, anahtar kelimeleri ve rakipleriyle ayrı yönetilir."}
          </p>

          <div className="mt-8">
            {limit.uygun ? (
              <YeniProjeFormu />
            ) : (
              <div className="space-y-4">
                <Uyari ton="uyari" baslik="Proje hakkınız doldu">
                  {plan?.name ?? "Mevcut"} paketinde {limit.limit} proje yönetebilirsiniz ve{" "}
                  {limit.mevcut} tanesini kullanıyorsunuz. Yeni proje eklemek için paketinizi
                  yükseltebilir veya kullanmadığınız bir projeyi silebilirsiniz.
                </Uyari>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/hesabim"
                    className="inline-flex h-10 items-center rounded-[10px] bg-ink-900 px-4 text-sm font-medium text-white transition-colors hover:bg-ink-800"
                  >
                    Paketleri İncele
                  </Link>
                  <Link
                    href="/projeler"
                    className="inline-flex h-10 items-center rounded-[10px] border border-line-strong bg-white px-4 text-sm font-medium text-ink-800 transition-colors hover:bg-surface-muted"
                  >
                    Projelerimi Yönet
                  </Link>
                </div>
              </div>
            )}
          </div>

          {limit.uygun && !ilkProje ? (
            <p className="mt-6 text-center text-[12px] text-ink-400">
              {limit.mevcut} / {limit.limit} proje kullanılıyor
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
