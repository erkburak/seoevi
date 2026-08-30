import { tarihSaat } from "@/lib/utils";

/**
 * Bir anahtar kelimenin sırasını gösterir.
 *
 * Üç durum bilerek birbirinden ayrılır:
 *
 *  1. Sıra biliniyor        → sayı gösterilir.
 *  2. Ölçüldü, sıra yok     → "ilk 30'da yok". Bu bir bilgidir: kelime
 *                             ölçüldü ve site ilk üç sayfada çıkmadı.
 *  3. Hiç ölçülmedi         → "ölçülmedi". Bu bilgi değil, bilgi
 *                             yokluğudur ve öyle söylenir.
 *
 * İkinci ve üçüncüyü aynı kefeye koymak (ikisine de "—" demek) kullanıcıya
 * ölçmediğimiz bir şeyi ölçmüş gibi gösterir.
 */
export function SiraHucresi({
  sira,
  olculduAt,
}: {
  sira: number | null;
  olculduAt: string | null;
}) {
  if (sira !== null) {
    return (
      <span
        className="tabular font-medium"
        title={olculduAt ? `${tarihSaat(olculduAt)} tarihinde ölçüldü.` : undefined}
      >
        {sira}
      </span>
    );
  }

  if (olculduAt) {
    return (
      <span
        className="text-[12.5px] text-ink-400"
        title={`${tarihSaat(olculduAt)} tarihinde ölçüldü; ilk 30 organik sonuçta bulunamadı.`}
      >
        ilk 30&apos;da yok
      </span>
    );
  }

  return (
    <span
      className="text-[12.5px] text-ink-300"
      title="Bu kelimenin sırası henüz ölçülmedi. Sıralar her analizde, paketinizin izin verdiği sayıda kelime için canlı olarak ölçülür."
    >
      ölçülmedi
    </span>
  );
}
