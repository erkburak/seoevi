import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { MetaOlusturucu } from "@/components/marketing/meta-olusturucu";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/meta-description-olusturucu");
  const temel: Metadata = {
  title: "Meta Açıklama Oluşturucu — Ücretsiz meta description aracı",
  description:
    "SEO uyumlu meta açıklama oluşturun. Karakter ve piksel ölçümü, arama sonucu önizlemesi ve hazır şablonlarla tıklama oranınızı artırın. Ücretsiz.",
  alternates: { canonical: `${SITE.url}/meta-description-olusturucu` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const IPUCLARI = [
  {
    baslik: "120-158 karakter arasında kalın",
    metin:
      "Çok kısa açıklamalar alanı boş bırakır, çok uzun olanlar kırpılır. İdeal aralıkta kalmak tıklama oranını artırır.",
  },
  {
    baslik: "Sıralama değil tıklama getirir",
    metin:
      "Meta açıklama doğrudan bir sıralama sinyali değildir. Ancak kullanıcının tıklama kararını etkilediği için dolaylı olarak çok değerlidir.",
  },
  {
    baslik: "Hedef kelimeyi doğal biçimde geçirin",
    metin:
      "Arama terimi açıklamada geçtiğinde kalın gösterilir ve gözü çeker. Zorlamadan, akıcı bir cümle içinde kullanın.",
  },
  {
    baslik: "Bir eylem çağrısı ekleyin",
    metin:
      "\"Hemen inceleyin\", \"Fiyatları karşılaştırın\" gibi net bir yönlendirme tıklama oranını yükseltir.",
  },
  {
    baslik: "Farkınızı yazın",
    metin:
      "Ücretsiz kargo, hızlı teslimat veya kolay iade gibi somut bir avantaj, rakip sonuçlar arasında öne çıkmanızı sağlar.",
  },
  {
    baslik: "Boş bırakmayın",
    metin:
      "Açıklama yazmazsanız arama motoru sayfadan rastgele bir bölüm seçer. Bu bölüm çoğu zaman ikna edici olmaz.",
  },
];

export default function MetaDescriptionOlusturucuSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Ücretsiz Araç"
        baslik="Meta açıklama oluşturucu"
        aciklama="Hedef kelimenizi girin, tıklama getiren meta açıklama önerileri alın. Uzunluk ve arama sonucundaki görünüm anlık olarak ölçülür."
      />

      <Icerik genislik="orta">
        <MetaOlusturucu tur="aciklama" />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            İyi bir meta açıklama nasıl yazılır?
          </h2>
          <ul className="mt-8 space-y-6">
            {IPUCLARI.map((i, sira) => (
              <li key={i.baslik} className="flex gap-5">
                <span className="tabular shrink-0 text-[13px] font-semibold text-ink-300">
                  {String(sira + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 border-l border-line pl-5">
                  <h3 className="text-[15px] font-semibold text-ink-900">{i.baslik}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">{i.metin}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </Icerik>
    </PazarlamaKabugu>
  );
}
