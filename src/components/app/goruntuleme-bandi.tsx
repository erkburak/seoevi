"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { goruntulemeyiBitir } from "@/app/yetkili/actions";

/**
 * Kullanıcı görüntüleme bandı.
 *
 * Yetkili başkasının panelini incelerken bunu her ekranda görmeli:
 * hangi hesaba baktığını unutmak, yanlış hesapta iş yapmaya çalışmaya
 * ve verilen bilgilerin yanlış yorumlanmasına yol açar.
 */
export function GoruntulemeBandi({ eposta }: { eposta: string | null }) {
  const [bekliyor, basla] = useTransition();
  const router = useRouter();

  function bitir() {
    basla(async () => {
      await goruntulemeyiBitir();
      router.push("/yetkili/kullanicilar");
      router.refresh();
    });
  }

  return (
    <div className="sticky top-0 z-[80] flex flex-wrap items-center justify-between gap-3 border-b border-caution/30 bg-caution-soft px-5 py-2.5">
      <p className="flex items-center gap-2 text-[13px] text-ink-800">
        <Eye className="size-4 shrink-0 text-caution" aria-hidden />
        <span>
          <strong className="font-medium">{eposta ?? "Bir kullanıcı"}</strong> hesabını
          görüntülüyorsunuz — salt okunur, hiçbir değişiklik yapılamaz.
        </span>
      </p>
      <button
        type="button"
        onClick={bitir}
        disabled={bekliyor}
        className="cursor-pointer rounded-[8px] border border-ink-900/15 bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-900 transition-colors hover:bg-ink-50 disabled:opacity-60"
      >
        {bekliyor ? "Çıkılıyor…" : "Görüntülemeden çık"}
      </button>
    </div>
  );
}
