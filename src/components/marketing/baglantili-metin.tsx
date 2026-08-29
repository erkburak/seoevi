import Link from "next/link";
import type { ReactNode } from "react";

import { sayfaIcinLinkler, type IcLink } from "@/config/ic-linkler";

/**
 * Metindeki anahtar ifadeleri iç bağlantıya çevirir.
 *
 * Bağlantı metni, hedef sayfanın gerçekten sıralanmak istediği ifadedir;
 * "buraya tıklayın" gibi metinler arama motoruna hiçbir şey söylemez.
 *
 * Aynı ifade sayfa boyunca yalnızca bir kez bağlanır: `kullanilan`
 * kümesi paragraflar arasında taşınarak bu sağlanır.
 */

/** Türkçe'ye duyarlı, büyük/küçük harf ayrımsız arama. */
function kucult(metin: string): string {
  return metin.toLocaleLowerCase("tr-TR");
}

/**
 * Bir metin parçasını, verilen bağlantıları uygulayarak parçalara böler.
 *
 * Yalnızca sözcük sınırında eşleşir: "SEO aracı" ifadesi
 * "SEO araçları" içinde yanlışlıkla bağlanmaz.
 */
function parcala(metin: string, linkler: IcLink[], kullanilan: Set<string>): ReactNode[] {
  for (const link of linkler) {
    if (kullanilan.has(link.href)) continue;

    const kucukMetin = kucult(metin);
    const kucukIfade = kucult(link.ifade);
    const indeks = kucukMetin.indexOf(kucukIfade);
    if (indeks === -1) continue;

    // Sözcük sınırı: öncesinde ve sonrasında harf/rakam olmamalı.
    const oncesi = indeks === 0 ? "" : metin[indeks - 1];
    const sonrasiIndeks = indeks + link.ifade.length;
    const sonrasi = sonrasiIndeks >= metin.length ? "" : metin[sonrasiIndeks];
    const harfMi = (k: string) => k !== "" && /[\p{L}\p{N}]/u.test(k);

    if (harfMi(oncesi) || harfMi(sonrasi)) continue;

    kullanilan.add(link.href);

    const bas = metin.slice(0, indeks);
    const gecen = metin.slice(indeks, sonrasiIndeks);
    const son = metin.slice(sonrasiIndeks);

    return [
      ...parcala(bas, linkler, kullanilan),
      <Link
        key={`${link.href}-${indeks}`}
        href={link.href}
        className="font-medium text-ink-900 underline decoration-ink-200 underline-offset-2 transition-colors hover:decoration-ink-900"
      >
        {gecen}
      </Link>,
      ...parcala(son, linkler, kullanilan),
    ];
  }

  return [metin];
}

/**
 * İç bağlantıları uygulanmış paragraf.
 *
 * `kullanilan`, aynı hedefe ikinci kez bağlanmayı önlemek için çağıran
 * tarafından oluşturulup paragraflar arasında paylaşılır.
 */
export function BaglantiliMetin({
  metin,
  mevcutYol,
  kullanilan,
  className,
  etiket: Etiket = "p",
}: {
  metin: string;
  /** Bu sayfanın yolu — kendine bağlanmaması için. */
  mevcutYol: string;
  kullanilan: Set<string>;
  className?: string;
  /** Sarmalayıcı etiket; tanım listesi gibi yapılarda `dd` gerekir. */
  etiket?: "p" | "dd" | "div";
}) {
  const linkler = sayfaIcinLinkler(mevcutYol);
  return <Etiket className={className}>{parcala(metin, linkler, kullanilan)}</Etiket>;
}
