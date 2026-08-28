import type { Metadata } from "next";
import Link from "next/link";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi, YasalMetin } from "@/components/marketing/sayfa-kabugu";
import { SITE, YASAL_GUNCELLEME } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/gizlilik");
  const temel: Metadata = {
  title: "Gizlilik Politikası",
  description:
    "SEO Evi gizlilik politikası. Verilerinizi nasıl topladığımız, sakladığımız ve koruduğumuz.",
  alternates: { canonical: `${SITE.url}/gizlilik` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function GizlilikSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Yasal"
        baslik="Gizlilik Politikası"
        aciklama={`Verilerinizi nasıl işlediğimizi sade bir dille anlatıyoruz. Son güncelleme: ${YASAL_GUNCELLEME}`}
      />

      <Icerik genislik="dar">
        <YasalMetin>
          <h2>Kısaca</h2>
          <ul>
            <li>Yalnızca hizmeti sunmak için gereken verileri toplarız.</li>
            <li>Verilerinizi satmayız, reklam amacıyla üçüncü taraflarla paylaşmayız.</li>
            <li>Şifreniz geri döndürülemez biçimde şifrelenir; tarafımızca görülemez.</li>
            <li>Her kullanıcının verisi veritabanı düzeyinde birbirinden yalıtılmıştır.</li>
            <li>Projelerinizi ve hesabınızı dilediğiniz zaman silebilirsiniz.</li>
          </ul>

          <h2>1. Topladığımız veriler</h2>
          <h3>Sizin verdikleriniz</h3>
          <p>
            Kayıt sırasında ad soyad ve e-posta adresi; isteğe bağlı olarak şirket adı ve telefon
            numarası. Analiz için eklediğiniz alan adları ve rakip alan adları.
          </p>
          <h3>Otomatik toplananlar</h3>
          <p>
            Oturum bilgileri, platform içi işlem kayıtları (hangi analizin ne zaman başlatıldığı gibi)
            ve hata kayıtları. Hata kayıtlarında şifre veya API anahtarı gibi hassas bilgiler asla yer
            almaz.
          </p>
          <h3>Google ile giriş</h3>
          <p>
            Google hesabınızla giriş yapmayı seçerseniz Google&apos;dan yalnızca ad ve e-posta
            bilgisini alırız. Google şifrenize hiçbir zaman erişimimiz olmaz.
          </p>

          <h2>2. Analiz verileri</h2>
          <p>
            SEO Evi&apos;nin analiz ettiği veriler — sıralamalar, anahtar kelimeler, rakip bilgileri —
            herkese açık arama sonuçlarından elde edilir. Sitenizin taranması, herkese açık
            sayfalarınızın standart bir web tarayıcısı gibi okunmasıyla yapılır. Sitenize kod eklemenizi
            veya yönetici erişimi vermenizi istemeyiz.
          </p>

          <h2>3. Verilerin saklanması ve güvenliği</h2>
          <ul>
            <li>Tüm bağlantılar TLS ile şifrelenir.</li>
            <li>
              Veritabanı düzeyinde satır bazlı güvenlik (RLS) uygulanır; bir kullanıcı başka bir
              kullanıcının verisini hiçbir koşulda göremez.
            </li>
            <li>
              Servis sağlayıcı anahtarları yalnızca sunucu tarafında tutulur; tarayıcıya asla
              gönderilmez.
            </li>
            <li>Oturum çerezleri httpOnly olarak ayarlanır ve JavaScript ile okunamaz.</li>
          </ul>

          <h2>4. Üçüncü taraf hizmetler</h2>
          <p>
            Barındırma, veritabanı, SEO veri sağlayıcısı ve yapay zekâ sağlayıcısı ile çalışıyoruz.
            Bu sağlayıcılara yalnızca hizmetin gerektirdiği asgari veri iletilir. Ayrıntılar için{" "}
            <Link href="/kvkk">KVKK Aydınlatma Metni</Link> sayfasına bakabilirsiniz.
          </p>

          <h2>5. Çerezler</h2>
          <p>
            Yalnızca oturumun sürdürülmesi ve tercihlerinizin hatırlanması için zorunlu çerezler
            kullanırız. Reklam veya takip çerezi kullanmayız. Ayrıntılar:{" "}
            <Link href="/cerez-politikasi">Çerez Politikası</Link>.
          </p>

          <h2>6. Verilerinizin silinmesi</h2>
          <p>
            Bir projeyi sildiğinizde o projeye ait analizler, anahtar kelimeler, sayfa denetimleri ve
            raporlar erişilemez hâle gelir. Hesabınızın tamamen silinmesini isterseniz {SITE.email}{" "}
            adresine yazmanız yeterlidir.
          </p>

          <h2>7. Çocukların gizliliği</h2>
          <p>
            SEO Evi bir işletme hizmetidir ve 18 yaşın altındaki kişilere yönelik değildir. Bu yaş
            grubundan bilerek veri toplamayız.
          </p>

          <h2>8. İletişim</h2>
          <p>
            Gizlilikle ilgili her türlü soru ve talebiniz için: {SITE.email}
          </p>
        </YasalMetin>
      </Icerik>
    </PazarlamaKabugu>
  );
}
