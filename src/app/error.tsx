"use client";

import { useEffect } from "react";

import { Logo } from "@/components/brand/logo";
import { Buton } from "@/components/ui/button";

/**
 * Beklenmeyen hatalar için genel ekran.
 * Kullanıcıya teknik ayrıntı gösterilmez; hata sunucu günlüğüne düşer.
 */
export default function HataSayfasi({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[arayuz] beklenmeyen hata", {
      mesaj: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col px-5 py-8 sm:px-10">
      <Logo boyut={26} />

      <main className="flex flex-1 items-center py-10">
        <div className="mx-auto w-full max-w-lg text-center">
          <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink-900">
            Bir şeyler ters gitti.
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-500">
            Bu sayfayı görüntülerken beklenmeyen bir sorun oluştu. Tekrar deneyebilir ya da panele
            dönebilirsiniz. Sorun sürerse bizimle iletişime geçin.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Buton onClick={reset}>Tekrar Dene</Buton>
            <Buton gorunum="ikincil" onClick={() => window.location.assign("/genel-bakis")}>
              Genel Bakışa Dön
            </Buton>
          </div>

          {error.digest ? (
            <p className="mt-8 text-[12px] text-ink-300">
              Destek için hata kodu: <span className="tabular">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
