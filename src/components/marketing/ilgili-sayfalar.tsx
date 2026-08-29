import Link from "next/link";

/**
 * Sayfa sonundaki ilgili sayfa bağlantıları.
 *
 * Ücretsiz araç ve kurumsal sayfalar bağlantı vermediğinde site içindeki
 * otorite orada birikip kalıyor — kullanıcı da o ekranda çıkmaza
 * giriyor. Bağlantı metinleri hedef sayfanın sıralanmak istediği
 * ifadedir; "detaylı bilgi" gibi metinler hiçbir şey söylemez.
 */
export function IlgiliSayfalar({
  baslik = "İlgili sayfalar",
  ogeler,
}: {
  baslik?: string;
  ogeler: { etiket: string; href: string; aciklama?: string }[];
}) {
  if (!ogeler.length) return null;

  return (
    <section className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-400">
          {baslik}
        </h2>
        <ul className="mt-5 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {ogeler.map((o) => (
            <li key={o.href}>
              <Link
                href={o.href}
                className="text-[14.5px] font-medium text-ink-900 underline decoration-ink-200 underline-offset-4 transition-colors hover:decoration-ink-900"
              >
                {o.etiket}
              </Link>
              {o.aciklama ? (
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{o.aciklama}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
