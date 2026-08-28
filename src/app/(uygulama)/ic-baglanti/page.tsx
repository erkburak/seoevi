import { Link2 } from "lucide-react";
import type { Metadata } from "next";

import { IcBaglantiKarti } from "@/components/app/ic-baglanti-karti";
import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { BosDurum, Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { Sekmeler } from "@/components/ui/tabs";
import { Ipucu } from "@/components/ui/tooltip";
import { SITE_SEKMELERI } from "@/config/navigation";
import { icBaglantiOzeti } from "@/lib/analiz/ic-baglanti";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "İç Bağlantı",
  robots: { index: false, follow: false },
};

export default async function IcBaglantiSayfasi() {
  const { proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [ozet, { data: calisanIs }] = await Promise.all([
    icBaglantiOzeti(proje.id),
    supabase
      .from("audit_jobs")
      .select("id")
      .eq("project_id", proje.id)
      .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
      .limit(1)
      .maybeSingle(),
  ]);

  const baslik = (
    <SayfaBasligi
      baslik="İç Bağlantı"
      aciklama="Site içi bağlantı, tamamen sizin kontrolünüzdeki tek sıralama sinyalidir: ücretsizdir, kimseden izin gerektirmez ve etkisi hızlı görülür."
      aksiyon={
        <ModulAnaliziButonu
          projeId={proje.id}
          tur="onpage"
          etiket="Siteyi Yeniden Tara"
          gorunum="ikincil"
          calisanIsId={calisanIs?.id ?? null}
        />
      }
    />
  );

  if (!ozet.grafikVarMi) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={SITE_SEKMELERI} aktif="/ic-baglanti" className="mb-6" />
        <BosDurum
          ikon={Link2}
          baslik="Henüz bağlantı haritası çıkarılmadı."
          aciklama="Öneriler sitenizin mevcut bağlantı haritasından üretilir; hangi sayfanın hangisine zaten bağlantı verdiği bilinmeden yeni bağlantı önerilemez. Teknik taramayı çalıştırın."
        />
      </>
    );
  }

  if (!ozet.gruplar.length) {
    return (
      <>
        {baslik}
        <Sekmeler ogeler={SITE_SEKMELERI} aktif="/ic-baglanti" className="mb-6" />
        <BosDurum
          ikon={Link2}
          baslik="Şu an önerilecek bağlantı yok."
          aciklama={`${sayi(ozet.incelenenSayfa)} sayfa ve ${sayi(ozet.toplamBaglanti)} bağlantı incelendi. Öneri üretmek için sayfaların hangi kelimelerde sıralandığı da gerekir — anahtar kelime analizini çalıştırdıysanız bir sonraki taramada öneriler görünecek.`}
        />
      </>
    );
  }

  return (
    <>
      {baslik}
      <Sekmeler ogeler={SITE_SEKMELERI} aktif="/ic-baglanti" className="mb-6" />

      <div className="space-y-9">
        {ozet.oksuzSayfa > 0 ? (
          <Uyari
            ton="uyari"
            baslik={`${sayi(ozet.oksuzSayfa)} sayfanız hiç iç bağlantı almıyor`}
          >
            Site içinden bağlantı almayan sayfaları Google zor keşfeder ve değersiz sayar. Aşağıdaki
            öneriler önce bu sayfaları hedefler.
          </Uyari>
        ) : null}

        <section className="grid grid-cols-2 gap-6 rounded-[14px] border border-line bg-white p-5 sm:grid-cols-4">
          <OzetDegeri etiket="İncelenen sayfa" deger={sayi(ozet.incelenenSayfa)} />
          <OzetDegeri etiket="Mevcut iç bağlantı" deger={sayi(ozet.toplamBaglanti)} />
          <OzetDegeri
            etiket="Sayfa başına ortalama"
            deger={String(ozet.ortalamaGelenLink)}
            ipucu="Sayfa başına düşen ortalama iç bağlantı sayısı."
          />
          <OzetDegeri etiket="Bekleyen öneri" deger={sayi(ozet.bekleyenOneri)} />
        </section>

        <section>
          <BolumBasligi
            baslik="Bağlantı önerileri"
            aciklama="Her kart bir hedef sayfayı ve ona bağlantı verebilecek sayfaları gösterir. Kartı açıp önerilen bağlantı metnini kopyalayabilirsiniz."
            sag={
              <Ipucu metin="Puan; hedefin arama hacmi ve sırası, kaynak sayfanın konu yakınlığı ve kendi otoritesinden hesaplanır." />
            }
          />

          <div className="mt-4 space-y-2">
            {ozet.gruplar.map((g) => (
              <IcBaglantiKarti key={g.hedefUrl} grup={g} />
            ))}
          </div>
        </section>

        <section className="rounded-[14px] border border-line bg-surface-muted/50 p-5">
          <h2 className="text-[14.5px] font-semibold text-ink-900">İç bağlantı neden işe yarar?</h2>
          <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
            <li>
              <strong className="font-medium text-ink-900">Otoriteyi yönlendirir.</strong> Ana
              sayfanız ve çok bağlantı alan sayfalarınız güç biriktirir; iç bağlantı bu gücü
              ihtiyacı olan sayfalara taşır.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Konuyu anlatır.</strong> Bağlantı metni,
              Google&apos;a hedef sayfanın ne hakkında olduğunu söyler — bu yüzden metin
              &quot;tıklayın&quot; değil, sayfanın kelimesi olmalı.
            </li>
            <li>
              <strong className="font-medium text-ink-900">İkinci sayfayı ilk sayfaya taşır.</strong>{" "}
              11-20 arasındaki sayfalar Google&apos;ın gözünde zaten ilgilidir; çoğu zaman biraz iç
              otorite ilk sayfaya çıkmaya yeter.
            </li>
            <li>
              <strong className="font-medium text-ink-900">Aynı metni tekrarlamayın.</strong>{" "}
              Öneriler kasıtlı olarak farklı metinler kullanır; onlarca bağlantıyı aynı kelimeyle
              vermek yapay görünür.
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
