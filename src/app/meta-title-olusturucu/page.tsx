import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { MetaOlusturucu } from "@/components/marketing/meta-olusturucu";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/meta-title-olusturucu");
  const temel: Metadata = {
  title: "Başlık Etiketi Oluşturucu — Ücretsiz meta title aracı",
  description:
    "SEO uyumlu başlık etiketi oluşturun. Karakter sayısı ve piksel genişliği anlık ölçülür, arama sonucu önizlemesiyle kırpılmayı önceden görün. Ücretsiz.",
  alternates: { canonical: `${SITE.url}/meta-title-olusturucu` },
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
    baslik: "Anahtar kelimeyi başa alın",
    metin:
      "Arama motorları başlığın başındaki kelimelere daha çok ağırlık verir. Kullanıcı da ilk kelimeleri okur.",
  },
  {
    baslik: "60 karakteri aşmayın",
    metin:
      "Daha uzun başlıklar arama sonuçlarında kırpılır. Asıl ölçü karakter değil piksel genişliğidir; araç bunu da gösterir.",
  },
  {
    baslik: "Her sayfaya benzersiz başlık yazın",
    metin:
      "Yinelenen başlıklar arama motorunun sayfalarınızı ayırt etmesini zorlaştırır ve sıralamanızı düşürür.",
  },
  {
    baslik: "Markayı sona koyun",
    metin:
      "Marka adı genellikle sonda, dikey çizgi veya tire ile ayrılarak yer alır. Ana sayfada başa alınabilir.",
  },
  {
    baslik: "Kelime yığmayın",
    metin:
      "Aynı kelimeyi tekrarlamak fayda sağlamaz, aksine tıklama oranını düşürür. Başlık bir insana hitap etmeli.",
  },
];

export default function MetaTitleOlusturucuSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Ücretsiz Araç"
        baslik="Başlık etiketi oluşturucu"
        aciklama="Hedef kelimenizi girin, SEO uyumlu başlık önerileri alın. Karakter sayısı ve arama sonucundaki görünümü anlık olarak ölçülür."
      />

      <Icerik genislik="orta">
        <MetaOlusturucu tur="baslik" />

        <section className="mt-16">
          <h2 className="text-[24px] font-semibold tracking-[-0.025em] text-ink-900">
            İyi bir başlık etiketi nasıl yazılır?
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
