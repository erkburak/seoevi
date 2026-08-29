import { IlgiliSayfalar } from "@/components/marketing/ilgili-sayfalar";
import type { Metadata } from "next";
import Link from "next/link";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { Buton } from "@/components/ui/button";
import { SITE, WHATSAPP_MESSAGES } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/hakkimizda");
  const temel: Metadata = {
  title: "Hakkımızda",
  description:
    "SEO Evi, Türkiye'deki e-ticaret sitelerinin Google ve yapay zekâ aramalarındaki görünürlüğünü ölçen ve büyüten bir SEO karar destek platformudur.",
  alternates: { canonical: `${SITE.url}/hakkimizda` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const ILKELER = [
  {
    baslik: "Veri değil, karar",
    metin:
      "SEO araçlarının çoğu size yüzlerce satır veri gösterir ve ne yapacağınıza kendiniz karar vermenizi bekler. SEO Evi bunun tersini yapar: veriyi işler, önceliklendirir ve bu hafta yapmanız gereken işleri sıraya koyar.",
  },
  {
    baslik: "E-ticarete odaklı",
    metin:
      "Genel amaçlı SEO araçları ürün sayfalarını sıradan bir sayfa gibi görür. Oysa bir ürün sayfasının GTIN'i, stok durumu, fiyatı ve yapısal verisi vardır. SEO Evi ürün ve kategori sayfalarını kendi kurallarıyla değerlendirir.",
  },
  {
    baslik: "Gerçek veri",
    metin:
      "Gösterdiğimiz her sıralama, arama hacmi ve rakip verisi gerçek arama sonuçlarından gelir. Tahmini bir sayıysa bunu açıkça belirtiriz; örnek veriyi asla gerçek veri gibi göstermeyiz.",
  },
  {
    baslik: "Sizden habersiz iş yapmayız",
    metin:
      "Yapay zekâ önerileri size gösterilir, kararı siz verirsiniz. SEO Evi hiçbir zaman sitenizde otomatik değişiklik yapmaz.",
  },
];

export default function HakkimizdaSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Hakkımızda"
        baslik="SEO'yu eyleme dönüştürüyoruz"
        aciklama="SEO Evi; teknik SEO, anahtar kelimeler, rakipler, içerik, Google Alışveriş ve yapay zekâ görünürlüğünü tek bir platformda birleştiren bir SEO karar destek sistemidir."
      />

      <Icerik genislik="orta">
        <div className="space-y-5 text-[15px] leading-[1.8] text-ink-600">
          <p>
            Türkiye&apos;de binlerce e-ticaret sitesi her gün Google&apos;da görünürlük kaybediyor.
            Çoğu zaman sebep karmaşık değil: eksik bir başlık etiketi, yapısal verisi olmayan bir ürün
            sayfası, rakibin fark ettiği ama sizin görmediğiniz bir anahtar kelime.
          </p>
          <p>
            Sorun bu verilere ulaşamamak değil, hangisinin önce ele alınması gerektiğini bilmemek.
            SEO Evi&apos;ni tam olarak bu boşluğu kapatmak için kurduk.
          </p>
          <p>
            Amacımız size bir rapor teslim etmek değil. Platformdan çıkarken şunu söyleyebilmenizi
            istiyoruz: <strong className="font-semibold text-ink-900">
              &quot;Sitemi nasıl büyüteceğimi artık biliyorum.&quot;
            </strong>
          </p>
        </div>

        <section className="mt-16">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-900">
            Çalışma ilkelerimiz
          </h2>
          <div className="mt-8 space-y-8">
            {ILKELER.map((i, sira) => (
              <div key={i.baslik} className="flex gap-5">
                <span className="tabular shrink-0 text-[13px] font-semibold text-ink-300">
                  {String(sira + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0 border-l border-line pl-5">
                  <h3 className="text-[15.5px] font-semibold text-ink-900">{i.baslik}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-500">{i.metin}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[16px] border border-line bg-surface-muted/60 p-7 text-center">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em] text-ink-900">
            Mağazanızı birlikte büyütelim
          </h2>
          <p className="mx-auto mt-2.5 max-w-lg text-[14px] leading-relaxed text-ink-500">
            Alan adınızı ekleyin, ilk analiz birkaç dakika içinde hazır olsun. Sorularınız için
            ekibimize her zaman ulaşabilirsiniz.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Buton asChild>
              <Link href="/kayit">Ücretsiz Analize Başla</Link>
            </Buton>
            <WhatsappButonu
              mesaj={WHATSAPP_MESSAGES.genel}
              kaynak="hakkimizda"
              gorunum="ikincil"
              cocuk="Bizimle Konuşun"
            />
          </div>
        </section>
      </Icerik>
      <IlgiliSayfalar
        ogeler={[
            { etiket: "E-ticaret SEO", href: "/", aciklama: "Platformun ne yaptığına ve hangi parçalardan oluştuğuna genel bakış." },
            { etiket: "E-ticaret SEO aracı", href: "/seo-araci", aciklama: "Teknik tarama, kelime takibi ve rakip analizi tek ekranda." },
            { etiket: "Fiyatlandırma", href: "/fiyatlandirma", aciklama: "Paketler, limitler ve 7 günlük ücretsiz deneme." },
        ]}
      />
    </PazarlamaKabugu>
  );
}
