import { ArrowDown, ArrowUp, Minus, TrendingUp } from "lucide-react";

import { Ipucu } from "@/components/ui/tooltip";
import type { EtkiOzeti, KazancOzeti } from "@/lib/analiz/etki";
import { cn, para, sayi } from "@/lib/utils";

/**
 * Etki göstergeleri.
 *
 * Kullanıcının "bu işi yaptım, ne oldu?" sorusuna cevap verir.
 * Nedensellik iddia edilmez: sıralamalar başka nedenlerle de değişir,
 * bu yüzden dil "şu aksiyondan sonra şu oldu" biçimindedir.
 */

/* ------------------------------------------------------------------ */
/* Tek aksiyonun etkisi — aksiyon kartının altında                     */
/* ------------------------------------------------------------------ */

export function AksiyonEtkisi({ etki }: { etki: EtkiOzeti }) {
  if (etki.durum === "veri_yok") {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-400">
        Bu aksiyona bağlanabilecek sıralanan kelime bulunamadı; etkisi ölçülemiyor.
      </p>
    );
  }

  if (etki.olcumSayisi === 0) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-400">
        Etki ölçümü sürüyor. İlk sonuç birkaç gün içinde görünecek
        {etki.kelimeSayisi > 0 ? ` (${sayi(etki.kelimeSayisi)} kelime izleniyor)` : ""}.
      </p>
    );
  }

  const yukseldi = etki.pozisyonDegisimi !== null && etki.pozisyonDegisimi < 0;
  const dustu = etki.pozisyonDegisimi !== null && etki.pozisyonDegisimi > 0;

  return (
    <div className="mt-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.05em] text-ink-400">
          <TrendingUp className="size-3.5" aria-hidden />
          {etki.gunGecti} gün sonra
        </span>

        {/* Sıralama */}
        {etki.pozisyonDegisimi !== null ? (
          <span
            className={cn(
              "tabular inline-flex items-center gap-1 text-[13px] font-medium",
              yukseldi ? "text-positive" : dustu ? "text-critical" : "text-ink-400",
            )}
          >
            {yukseldi ? (
              <ArrowUp className="size-3.5" aria-hidden />
            ) : dustu ? (
              <ArrowDown className="size-3.5" aria-hidden />
            ) : (
              <Minus className="size-3.5" aria-hidden />
            )}
            {Math.abs(etki.pozisyonDegisimi).toFixed(1)} sıra
            <span className="font-normal text-ink-400">ortalama</span>
          </span>
        ) : null}

        {/* Trafik */}
        {etki.etvDegisimi !== 0 ? (
          <span
            className={cn(
              "tabular text-[13px] font-medium",
              etki.etvDegisimi > 0 ? "text-positive" : "text-critical",
            )}
          >
            {etki.etvDegisimi > 0 ? "+" : ""}
            {sayi(etki.etvDegisimi)}
            <span className="ml-1 font-normal text-ink-400">aylık ziyaret</span>
          </span>
        ) : null}

        {/* Parasal karşılık */}
        {etki.degerDegisimi !== 0 ? (
          <span className="inline-flex items-center gap-1">
            <span
              className={cn(
                "tabular text-[13px] font-medium",
                etki.degerDegisimi > 0 ? "text-positive" : "text-critical",
              )}
            >
              {etki.degerDegisimi > 0 ? "+" : ""}
              {para(etki.degerDegisimi)}
            </span>
            <Ipucu metin="Bu trafiği Google reklamlarıyla satın almanın tahmini aylık maliyeti. Kelimelerin tıklama başı reklam maliyetinden hesaplanır." />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toplam kazanç — genel bakış ve aksiyon merkezi başında              */
/* ------------------------------------------------------------------ */

export function KazancPaneli({ ozet }: { ozet: KazancOzeti }) {
  // Hiç tamamlanmış aksiyon yoksa panel gösterilmez.
  if (ozet.olculenAksiyon === 0 && ozet.bekleyenAksiyon === 0) return null;

  // Ölçüm başlamadıysa yalnızca bilgilendirme gösterilir.
  if (ozet.olculenAksiyon === 0) {
    return (
      <div className="rounded-[14px] border border-line bg-white p-5">
        <p className="text-[13.5px] font-medium text-ink-900">Etki ölçümü başladı</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">
          Tamamladığınız {sayi(ozet.bekleyenAksiyon)} aksiyonun sıralamalara etkisi izleniyor.
          İlk sonuçlar birkaç gün içinde burada görünecek.
        </p>
      </div>
    );
  }

  const kazandi = ozet.toplamDegerDegisimi > 0;

  return (
    <div className="glass rounded-[16px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-400">
            Yaptığınız işler ne getirdi?
            <Ipucu metin="Tamamladığınız aksiyonlardan sonra, o sayfalarda sıralanan kelimelerde ne olduğunu ölçüyoruz. Sıralamalar başka nedenlerle de değişebilir; bu ölçüm nedensellik iddia etmez." />
          </p>

          <p className="mt-3 text-[15px] leading-relaxed text-ink-700">
            {sayi(ozet.olculenAksiyon)} tamamlanmış aksiyon ölçüldü.{" "}
            {ozet.yukselenAksiyon > 0 ? (
              <>
                Bunların{" "}
                <span className="font-semibold text-ink-900">
                  {sayi(ozet.yukselenAksiyon)} tanesinde
                </span>{" "}
                sıralama yükseldi.
              </>
            ) : (
              "Henüz belirgin bir sıralama artışı ölçülmedi."
            )}
          </p>
        </div>

        {/* Parasal karşılık */}
        {ozet.toplamDegerDegisimi !== 0 ? (
          <div className="text-right">
            <p
              className={cn(
                "tabular text-[26px] font-semibold tracking-[-0.025em]",
                kazandi ? "text-positive" : "text-critical",
              )}
            >
              {kazandi ? "+" : ""}
              {para(ozet.toplamDegerDegisimi)}
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-400">aylık trafik değeri</p>
          </div>
        ) : null}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-t border-line/60 pt-4 sm:grid-cols-3">
        <div>
          <dt className="text-[11.5px] text-ink-400">Ortalama sıra değişimi</dt>
          <dd
            className={cn(
              "tabular mt-0.5 text-[15px] font-semibold",
              ozet.ortalamaPozisyonDegisimi === null
                ? "text-ink-400"
                : ozet.ortalamaPozisyonDegisimi < 0
                  ? "text-positive"
                  : ozet.ortalamaPozisyonDegisimi > 0
                    ? "text-critical"
                    : "text-ink-600",
            )}
          >
            {ozet.ortalamaPozisyonDegisimi === null
              ? "—"
              : ozet.ortalamaPozisyonDegisimi < 0
                ? `↑ ${Math.abs(ozet.ortalamaPozisyonDegisimi).toFixed(1)}`
                : ozet.ortalamaPozisyonDegisimi > 0
                  ? `↓ ${ozet.ortalamaPozisyonDegisimi.toFixed(1)}`
                  : "değişmedi"}
          </dd>
        </div>

        <div>
          <dt className="text-[11.5px] text-ink-400">Aylık ziyaret değişimi</dt>
          <dd
            className={cn(
              "tabular mt-0.5 text-[15px] font-semibold",
              ozet.toplamEtvDegisimi > 0
                ? "text-positive"
                : ozet.toplamEtvDegisimi < 0
                  ? "text-critical"
                  : "text-ink-600",
            )}
          >
            {ozet.toplamEtvDegisimi > 0 ? "+" : ""}
            {sayi(ozet.toplamEtvDegisimi)}
          </dd>
        </div>

        <div>
          <dt className="text-[11.5px] text-ink-400">Ölçümü süren</dt>
          <dd className="tabular mt-0.5 text-[15px] font-semibold text-ink-600">
            {sayi(ozet.bekleyenAksiyon)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
