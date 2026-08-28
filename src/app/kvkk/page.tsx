import type { Metadata } from "next";
import Link from "next/link";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi, YasalMetin } from "@/components/marketing/sayfa-kabugu";
import { SIRKET, SITE, YASAL_GUNCELLEME } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/kvkk");
  const temel: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description:
    "SEO Evi kişisel verilerin işlenmesine ilişkin aydınlatma metni. Hangi verileri neden işlediğimiz ve haklarınız.",
  alternates: { canonical: `${SITE.url}/kvkk` },
  robots: { index: true, follow: true },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function KvkkSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Yasal"
        baslik="KVKK Aydınlatma Metni"
        aciklama={`6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında hazırlanmıştır. Son güncelleme: ${YASAL_GUNCELLEME}`}
      />

      <Icerik genislik="dar">
        <YasalMetin>
          <h2>1. Veri sorumlusu</h2>
          <p>
            Kişisel verileriniz, veri sorumlusu sıfatıyla {SIRKET.veriSorumlusu} tarafından aşağıda
            açıklanan kapsamda işlenmektedir. İletişim: {SITE.email} · {SIRKET.adres}
          </p>

          <h2>2. İşlenen kişisel veriler</h2>
          <p>SEO Evi hizmetini sunabilmek için yalnızca gerekli olan verileri işleriz:</p>
          <ul>
            <li>
              <strong>Kimlik ve iletişim verileri:</strong> ad soyad, e-posta adresi, isteğe bağlı
              olarak telefon numarası ve şirket adı.
            </li>
            <li>
              <strong>Hesap verileri:</strong> şifreniz geri döndürülemez biçimde şifrelenerek
              saklanır; tarafımızca görülemez.
            </li>
            <li>
              <strong>Kullanım verileri:</strong> analiz başlatma, rapor oluşturma gibi platform
              içi işlem kayıtları ve oturum bilgileri.
            </li>
            <li>
              <strong>Proje verileri:</strong> analiz için eklediğiniz alan adları ve bu alan
              adlarına ilişkin herkese açık SEO verileri.
            </li>
            <li>
              <strong>Fatura verileri:</strong> abonelik başlatmanız hâlinde ödeme sağlayıcısı
              tarafından iletilen sınırlı bilgiler.
            </li>
          </ul>
          <p>
            Özel nitelikli kişisel veri toplamıyoruz. Kredi kartı bilgileriniz sistemlerimizde
            saklanmaz.
          </p>

          <h2>3. İşleme amaçları</h2>
          <ul>
            <li>Hesabınızın oluşturulması ve oturumunuzun sürdürülmesi</li>
            <li>Talep ettiğiniz SEO analizlerinin yürütülmesi ve sonuçlarının sunulması</li>
            <li>Abonelik ve paket limitlerinin yönetilmesi</li>
            <li>Destek taleplerinizin karşılanması</li>
            <li>Hizmet güvenliğinin sağlanması ve kötüye kullanımın önlenmesi</li>
            <li>Yasal yükümlülüklerimizin yerine getirilmesi</li>
          </ul>

          <h2>4. Hukuki sebep</h2>
          <p>
            Kişisel verileriniz KVKK m.5/2 uyarınca <em>sözleşmenin kurulması ve ifası</em>,{" "}
            <em>hukuki yükümlülüğün yerine getirilmesi</em> ve <em>meşru menfaat</em> hukuki
            sebeplerine dayanılarak işlenir. Pazarlama iletileri yalnızca açık rızanız hâlinde
            gönderilir; bu rızayı istediğiniz zaman geri çekebilirsiniz.
          </p>

          <h2>5. Aktarım</h2>
          <p>
            Verileriniz, hizmetin sunulabilmesi için aşağıdaki hizmet sağlayıcılarla sınırlı olarak
            paylaşılır:
          </p>
          <ul>
            <li>
              <strong>Barındırma ve veritabanı:</strong> uygulama altyapısı ve verilerin saklanması.
            </li>
            <li>
              <strong>SEO veri sağlayıcısı:</strong> analiz ettiğiniz alan adı ve anahtar kelimeler
              sorgu amacıyla iletilir. Kimlik bilgileriniz aktarılmaz.
            </li>
            <li>
              <strong>Yapay zekâ sağlayıcısı:</strong> yalnızca sizin başlattığınız öneri
              taleplerinde, ilgili SEO verisi işlenmek üzere iletilir.
            </li>
          </ul>
          <p>
            Bu sağlayıcıların bir kısmı yurt dışında bulunmaktadır; aktarım KVKK m.9 kapsamında ve
            gerekli güvenlik tedbirleri alınarak gerçekleştirilir. Verileriniz reklam veya satış
            amacıyla üçüncü taraflara satılmaz.
          </p>

          <h2>6. Saklama süresi</h2>
          <p>
            Hesabınız aktif olduğu sürece verileriniz saklanır. Hesabınızı kapatmanız hâlinde
            verileriniz, yasal saklama yükümlülükleri saklı kalmak kaydıyla makul süre içinde silinir
            veya anonim hâle getirilir. Projelerinizi platform üzerinden dilediğiniz zaman
            silebilirsiniz.
          </p>

          <h2>7. Haklarınız</h2>
          <p>KVKK m.11 uyarınca şu haklara sahipsiniz:</p>
          <ul>
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme</li>
            <li>İşlemenin münhasıran otomatik sistemlerle analiz edilmesine itiraz etme</li>
            <li>Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
          </ul>
          <p>
            Taleplerinizi {SITE.email} adresine iletebilirsiniz. Başvurularınız en geç 30 gün içinde
            sonuçlandırılır.
          </p>

          <h2>8. Değişiklikler</h2>
          <p>
            Bu metin gerektiğinde güncellenebilir. Önemli değişikliklerde kayıtlı kullanıcılarımızı
            e-posta ile bilgilendiririz. Ayrıca{" "}
            <Link href="/gizlilik">Gizlilik Politikası</Link> ve{" "}
            <Link href="/cerez-politikasi">Çerez Politikası</Link> metinlerini de inceleyebilirsiniz.
          </p>
        </YasalMetin>
      </Icerik>
    </PazarlamaKabugu>
  );
}
