import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { MarkaYukleyici } from "@/components/app/yetkili-formlar";
import { Uyari } from "@/components/ui/feedback";
import { BolumBasligi } from "@/components/ui/surface";
import { markaAyarlari } from "@/lib/marka";
import { yetkiliGerekli } from "@/lib/yetkili";

export default async function YetkiliMarkaSayfasi() {
  await yetkiliGerekli();
  const marka = await markaAyarlari();

  return (
    <>
      <SayfaBasligi
        baslik="Marka"
        aciklama="Logo ve favicon buradan değiştirilir. Yüklediğiniz görsel hem panelde hem herkese açık sayfalarda anında geçerli olur."
      />

      <div className="space-y-8">
        <div className="grid gap-4 lg:grid-cols-2">
          <MarkaYukleyici tur="logo" mevcutUrl={marka.logoUrl} />
          <MarkaYukleyici tur="favicon" mevcutUrl={marka.faviconUrl} />
        </div>

        <section>
          <BolumBasligi baslik="Öneriler" />
          <div className="mt-4 space-y-3">
            <Uyari ton="bilgi" baslik="Logo">
              SVG kullanın: her ekran yoğunluğunda net görünür ve dosya boyutu küçüktür. Yatay
              (geniş) bir logo panel başlığına daha iyi oturur. Şeffaf arka plan önerilir.
            </Uyari>
            <Uyari ton="bilgi" baslik="Favicon">
              Kare bir görsel yükleyin (en az 32×32, tercihen 512×512 PNG veya SVG). Tarayıcılar
              favicon&apos;u agresif önbelleğe alır; değişikliği görmek için sekmeyi kapatıp
              açmanız veya sayfayı zorla yenilemeniz (Ctrl+F5) gerekebilir.
            </Uyari>
            <Uyari ton="uyari" baslik="Görsel kaldırıldığında">
              &quot;Varsayılana dön&quot; dediğinizde kod içindeki SEO Evi sembolü yeniden
              kullanılır. Yüklenen dosya depolamada kalır ancak sitede gösterilmez.
            </Uyari>
          </div>
        </section>
      </div>
    </>
  );
}
