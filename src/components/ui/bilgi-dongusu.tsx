"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Bekleme sırasında dönen bilgi kartı.
 *
 * Analizler saniyeler sürebildiği için kullanıcıyı boş bir yükleme
 * göstergesiyle bekletmek yerine, o sırada işine yarayacak SEO bilgisi
 * gösterilir. Aynı bileşen hem panelde hem ücretsiz araçlarda kullanılır.
 */

export type Bilgi = { baslik: string; metin: string };

export const SEO_BILGILERI: Bilgi[] = [
  {
    baslik: "İlk sıra tıklamaların dörtte birini alır",
    metin:
      "Google'da birinci sıradaki sonuç ortalama %27,8 tıklama oranına sahip. İkinci sıra bunun neredeyse yarısı kadar.",
  },
  {
    baslik: "İkinci sayfayı kimse görmüyor",
    metin:
      "Aramaların yaklaşık dörtte üçü ilk sayfanın ötesine geçmiyor. 11. sıra ile 10. sıra arasındaki fark, tıklamada uçurum yaratıyor.",
  },
  {
    baslik: "Başlık etiketi ilk izlenimdir",
    metin:
      "60 karakteri aşan başlıklar arama sonuçlarında kırpılır. Hedef kelimeyi başa almak hem sıralamayı hem tıklamayı etkiler.",
  },
  {
    baslik: "Ürün verisi görünürlüğü belirler",
    metin:
      "GTIN, marka ve stok bilgisi eksik ürünler Google Alışveriş sonuçlarında eşleştirilemez; o alanda hiç görünmezsiniz.",
  },
  {
    baslik: "Yapısal veri makineler için yazılır",
    metin:
      "Schema işaretlemesi olan sayfalar hem zengin gösterimde hem de yapay zekâ cevaplarında daha sık kaynak gösteriliyor.",
  },
  {
    baslik: "En hızlı kazanç 11-20 arasındadır",
    metin:
      "İkinci sayfadaki kelimeler ilk sayfaya en yakın olanlardır. Sıfırdan içerik üretmek yerine bunları iyileştirmek daha verimlidir.",
  },
  {
    baslik: "Alt metni olmayan görsel aramada yok sayılır",
    metin:
      "Görsel alt metni hem görsel aramasında bulunmanızı sağlar hem de ekran okuyucular için gereklidir.",
  },
  {
    baslik: "Yinelenen başlık sinyali böler",
    metin:
      "Birden fazla sayfada aynı başlığı kullanmak, arama motorunun hangi sayfayı öne çıkaracağını belirsizleştirir.",
  },
];

export function BilgiDongusu({
  bilgiler = SEO_BILGILERI,
  aralikMs = 3400,
  className,
}: {
  bilgiler?: Bilgi[];
  aralikMs?: number;
  className?: string;
}) {
  const [sira, setSira] = useState(0);

  useEffect(() => {
    const z = setInterval(() => setSira((s) => (s + 1) % bilgiler.length), aralikMs);
    return () => clearInterval(z);
  }, [bilgiler.length, aralikMs]);

  const bilgi = bilgiler[sira];

  return (
    <div className={cn("rounded-[14px] border border-line bg-white p-5", className)}>
      <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-ink-300">
        Bunu biliyor muydunuz?
      </p>

      {/* key değişince giriş animasyonu yeniden çalışır */}
      <div key={sira} className="animate-rise mt-3">
        <p className="text-[14.5px] font-semibold tracking-[-0.01em] text-ink-900">{bilgi.baslik}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-500">{bilgi.metin}</p>
      </div>

      <div className="mt-5 flex gap-1.5" aria-hidden>
        {bilgiler.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-500",
              i === sira ? "bg-ink-900" : "bg-ink-100",
            )}
          />
        ))}
      </div>
    </div>
  );
}
