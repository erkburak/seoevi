import { Check } from "lucide-react";
import Link from "next/link";

import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { Buton } from "@/components/ui/button";
import { Rozet } from "@/components/ui/badge";
import { WHATSAPP_MESSAGES } from "@/config/site";
import { LIMIT_ADLARI, limitMetni } from "@/lib/plans";
import { cn, para } from "@/lib/utils";
import type { Plan, PlanLimitleri } from "@/types/database";

/** Kart üzerinde gösterilecek limitler. */
const VITRIN_LIMITLERI: (keyof PlanLimitleri)[] = [
  "projeler",
  "anahtar_kelime",
  "gunluk_serp",
  "aylik_site_taramasi",
  "rakip",
];

export function PaketKartlari({
  planlar,
  kaynak,
  baslikGoster = true,
}: {
  planlar: Plan[];
  kaynak: string;
  baslikGoster?: boolean;
}) {
  const standart = planlar.filter((p) => !p.is_custom);
  const ozel = planlar.find((p) => p.is_custom);

  return (
    <div>
      {baslikGoster ? (
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-400">Fiyatlandırma</p>
          <h2 className="mt-3 text-[27px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink-900 sm:text-[34px]">
            Mağazanızın büyüklüğüne göre
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-500">
            Tüm paketlerde 7 gün ücretsiz deneme. Kredi kartı gerekmez, istediğiniz zaman
            vazgeçebilirsiniz.
          </p>
        </div>
      ) : null}

      <div className={cn("grid gap-4 lg:grid-cols-3", baslikGoster && "mt-12")}>
        {standart.map((p) => (
          <PaketKarti key={p.id} plan={p} kaynak={kaynak} />
        ))}
      </div>

      {ozel ? <OzelPaket plan={ozel} kaynak={kaynak} /> : null}
    </div>
  );
}

function PaketKarti({ plan, kaynak }: { plan: Plan; kaynak: string }) {
  const oneCikan = plan.is_featured;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-[16px] border p-6",
        oneCikan ? "border-ink-900 bg-white shadow-float" : "border-line bg-white shadow-subtle",
      )}
    >
      {oneCikan ? (
        <span className="absolute -top-2.5 left-6 rounded-full bg-ink-900 px-2.5 py-0.5 text-[11px] font-medium text-white">
          En çok tercih edilen
        </span>
      ) : null}

      <h3 className="text-[16px] font-semibold text-ink-900">{plan.name}</h3>
      <p className="mt-1 text-[13px] text-ink-400">{plan.headline}</p>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="tabular text-[32px] font-semibold tracking-[-0.03em] text-ink-900">
          {para(plan.price_monthly)}
        </span>
        <span className="text-[13px] text-ink-400">/ ay</span>
      </div>
      <p className="mt-1 text-[12px] text-ink-400">
        Yıllık ödemede {para(plan.price_yearly)} (2 ay hediye)
      </p>

      <div className="mt-5 flex flex-col gap-2">
        <Buton asChild gorunum={oneCikan ? "birincil" : "ikincil"} tamGenislik>
          <Link href={`/kayit?paket=${plan.id}`}>7 Gün Ücretsiz Dene</Link>
        </Buton>
        <WhatsappButonu
          mesaj={WHATSAPP_MESSAGES.paket(plan.name)}
          kaynak={kaynak}
          paket={plan.id}
          gorunum="sessiz"
          boyut="sm"
          tamGenislik
          cocuk="WhatsApp'tan Bilgi Al"
        />
      </div>

      <p className="mt-6 text-[12px] font-medium text-ink-400">{plan.audience}</p>

      <ul className="mt-4 space-y-2.5 border-t border-line pt-4">
        {plan.features.map((o) => (
          <li key={o} className="flex items-start gap-2.5 text-[13px] text-ink-600">
            <Check className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
            {o}
          </li>
        ))}
      </ul>

      <dl className="mt-5 space-y-2 border-t border-line pt-4">
        {VITRIN_LIMITLERI.map((k) => (
          <div key={k} className="flex items-baseline justify-between gap-3 text-[12.5px]">
            <dt className="text-ink-400">{LIMIT_ADLARI[k]}</dt>
            <dd className="tabular font-medium text-ink-800">{limitMetni(plan.limits[k])}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OzelPaket({ plan, kaynak }: { plan: Plan; kaynak: string }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[16px] border border-line bg-ink-900">
      <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <Rozet ton="notr" className="border-white/15 bg-white/10 text-white/80">
            {plan.name}
          </Rozet>
          <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-white">
            İşletmeniz için özel SEO çözümü
          </h3>
          <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/60">{plan.description}</p>
          <div className="mt-6">
            <WhatsappButonu
              mesaj={WHATSAPP_MESSAGES.ozel}
              kaynak={kaynak}
              paket={plan.id}
              gorunum="ikincil"
              cocuk="WhatsApp'tan Konuşalım"
            />
          </div>
        </div>

        <ul className="space-y-2.5 lg:border-l lg:border-white/10 lg:pl-8">
          {plan.features.map((o) => (
            <li key={o} className="flex items-start gap-2.5 text-[13.5px] text-white/70">
              <Check className="mt-0.5 size-3.5 shrink-0 text-white/40" aria-hidden />
              {o}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
