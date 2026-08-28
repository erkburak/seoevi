import type { Metadata } from "next";
import Link from "next/link";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi, YasalMetin } from "@/components/marketing/sayfa-kabugu";
import { SIRKET, SITE, YASAL_GUNCELLEME } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/kullanim-kosullari");
  const temel: Metadata = {
  title: "Kullanım Koşulları",
  description: "SEO Evi hizmetinin kullanım koşulları, abonelik, iptal ve sorumluluk kapsamı.",
  alternates: { canonical: `${SITE.url}/kullanim-kosullari` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function KullanimKosullariSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Yasal"
        baslik="Kullanım Koşulları"
        aciklama={`SEO Evi'ni kullanarak bu koşulları kabul etmiş olursunuz. Son güncelleme: ${YASAL_GUNCELLEME}`}
      />

      <Icerik genislik="dar">
        <YasalMetin>
          <h2>1. Taraflar ve kapsam</h2>
          <p>
            Bu koşullar, {SIRKET.unvan} tarafından {SITE.url} adresinde sunulan SEO Evi hizmetinin
            kullanımını düzenler. Hesap oluşturarak veya hizmeti kullanarak bu koşulları kabul etmiş
            sayılırsınız.
          </p>

          <h2>2. Hesap</h2>
          <ul>
            <li>Hesap açarken doğru ve güncel bilgi vermeniz gerekir.</li>
            <li>Hesap güvenliğinden ve şifrenizin gizliliğinden siz sorumlusunuz.</li>
            <li>Hesabınızın yetkisiz kullanıldığını fark ederseniz bize bildirmelisiniz.</li>
            <li>Bir hesap yalnızca bir işletme veya kişi tarafından kullanılabilir.</li>
          </ul>

          <h2>3. Hizmetin kullanımı</h2>
          <p>Aşağıdaki davranışlar yasaktır:</p>
          <ul>
            <li>Size ait olmayan veya analiz yetkiniz bulunmayan siteleri kötüye kullanım amacıyla taramak</li>
            <li>Platformu otomatik araçlarla aşırı yüklemek veya limitleri aşmaya çalışmak</li>
            <li>Hizmeti tersine mühendislik yapmak, kopyalamak veya yeniden satmak</li>
            <li>Elde ettiğiniz verileri üçüncü taraflara veri hizmeti olarak yeniden pazarlamak</li>
            <li>Platformun güvenlik önlemlerini aşmaya teşebbüs etmek</li>
          </ul>
          <p>
            Bu koşulların ihlali hâlinde hesabınızı askıya alma veya kapatma hakkımız saklıdır.
          </p>

          <h2>4. Abonelik ve ücretlendirme</h2>
          <ul>
            <li>
              Paketler ve limitler <Link href="/fiyatlandirma">Fiyatlandırma</Link> sayfasında yer alır.
            </li>
            <li>Ücretsiz deneme süresi boyunca ödeme alınmaz ve kredi kartı istenmez.</li>
            <li>Abonelikler dönemsel olarak yenilenir; dönem sonuna kadar iptal edebilirsiniz.</li>
            <li>
              İptal ettiğinizde hizmet, ödemesi yapılmış dönemin sonuna kadar kullanılabilir olmaya
              devam eder.
            </li>
            <li>
              Fiyat değişikliklerini yürürlüğe girmeden önce makul süre içinde bildiririz; mevcut
              döneminiz etkilenmez.
            </li>
          </ul>

          <h2>5. Paket limitleri</h2>
          <p>
            Her paketin proje, anahtar kelime, analiz ve rapor limitleri vardır. Limitler aşıldığında
            ilgili işlem yapılamaz; paketinizi yükselterek veya bir sonraki döneme geçerek devam
            edebilirsiniz.
          </p>

          <h2>6. Veri ve içerik</h2>
          <p>
            Platforma eklediğiniz alan adları ve oluşturduğunuz raporlar size aittir. SEO Evi bu
            verileri yalnızca hizmeti sunmak amacıyla işler. Analiz sonuçları herkese açık arama
            verilerine dayanır ve arama motorlarının davranışına bağlı olarak değişebilir.
          </p>

          <h2>7. Yapay zekâ önerileri</h2>
          <p>
            Platform, yapay zekâ destekli öneriler üretir. Bu öneriler bilgilendirme amaçlıdır ve
            sitenizde otomatik olarak uygulanmaz. Önerileri uygulama kararı ve sonuçları tamamen size
            aittir.
          </p>

          <h2>8. Sorumluluk sınırı</h2>
          <p>
            SEO Evi, arama motorlarındaki belirli bir sıralamayı, trafik artışını veya satış sonucunu
            garanti etmez. Arama motoru algoritmaları bizim kontrolümüz dışındadır. Hizmet &quot;olduğu
            gibi&quot; sunulur. Dolaylı zararlardan sorumluluğumuz, ilgili dönemde tarafımıza ödediğiniz
            abonelik bedeliyle sınırlıdır.
          </p>

          <h2>9. Hizmetin sürekliliği</h2>
          <p>
            Bakım, güncelleme veya üçüncü taraf servis kesintileri nedeniyle hizmette geçici
            aksamalar olabilir. Planlı bakımları önceden duyurmaya çalışırız.
          </p>

          <h2>10. Değişiklikler ve uygulanacak hukuk</h2>
          <p>
            Bu koşullar güncellenebilir; önemli değişiklikler kayıtlı kullanıcılara bildirilir.
            Uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır ve İstanbul mahkemeleri ile icra
            daireleri yetkilidir.
          </p>

          <h2>11. İletişim</h2>
          <p>Sorularınız için: {SITE.email}</p>
        </YasalMetin>
      </Icerik>
    </PazarlamaKabugu>
  );
}
