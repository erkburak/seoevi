import type { Metadata } from "next";
import Link from "next/link";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi, YasalMetin } from "@/components/marketing/sayfa-kabugu";
import { SITE, YASAL_GUNCELLEME } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/cerez-politikasi");
  const temel: Metadata = {
  title: "Çerez Politikası",
  description:
    "SEO Evi hangi çerezleri neden kullanıyor? Yalnızca zorunlu çerezler kullanılır, reklam takibi yapılmaz.",
  alternates: { canonical: `${SITE.url}/cerez-politikasi` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const CEREZLER = [
  {
    ad: "sb-* (oturum)",
    amac: "Giriş yapmış kullanıcının oturumunu sürdürür. Bu çerez olmadan giriş yapılamaz.",
    tur: "Zorunlu",
    sure: "Oturum süresi / yenilenene kadar",
  },
  {
    ad: "seoevi_proje",
    amac: "Panelde hangi projenin aktif olduğunu hatırlar; her sayfada yeniden seçmenizi önler.",
    tur: "Zorunlu",
    sure: "1 yıl",
  },
];

export default function CerezPolitikasiSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="Yasal"
        baslik="Çerez Politikası"
        aciklama={`SEO Evi yalnızca hizmetin çalışması için zorunlu çerezleri kullanır. Son güncelleme: ${YASAL_GUNCELLEME}`}
      />

      <Icerik genislik="dar">
        <YasalMetin>
          <h2>Reklam ve takip çerezi kullanmıyoruz</h2>
          <p>
            SEO Evi&apos;nde üçüncü taraf reklam ağı, sosyal medya piksel takibi veya davranışsal
            profilleme amaçlı çerez bulunmaz. Bu nedenle karşınıza çerez onay penceresi çıkmaz —
            onaylamanız gereken isteğe bağlı bir çerez yoktur.
          </p>

          <h2>Kullanılan çerezler</h2>
          <div className="table-scroll not-prose my-6 rounded-[14px] border border-line bg-white">
            <table className="w-full border-collapse text-[13px]">
              <thead className="bg-surface-muted">
                <tr>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-left text-[12px] font-medium text-ink-500">
                    Çerez
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-left text-[12px] font-medium text-ink-500">
                    Amaç
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-left text-[12px] font-medium text-ink-500">
                    Tür
                  </th>
                  <th scope="col" className="border-b border-line px-4 py-2.5 text-left text-[12px] font-medium text-ink-500">
                    Süre
                  </th>
                </tr>
              </thead>
              <tbody>
                {CEREZLER.map((c) => (
                  <tr key={c.ad} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-medium text-ink-900">{c.ad}</td>
                    <td className="px-4 py-3 text-ink-600">{c.amac}</td>
                    <td className="px-4 py-3 text-ink-600">{c.tur}</td>
                    <td className="px-4 py-3 text-ink-600">{c.sure}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2>Güvenlik ayarları</h2>
          <p>
            Oturum çerezleri <code>httpOnly</code> olarak ayarlanır; tarayıcıdaki JavaScript
            tarafından okunamaz. Canlı ortamda <code>secure</code> bayrağıyla yalnızca şifreli
            bağlantı üzerinden iletilir ve <code>sameSite=lax</code> ile siteler arası isteklerde
            gönderilmez.
          </p>

          <h2>Çerezleri engellemek</h2>
          <p>
            Tarayıcı ayarlarınızdan çerezleri engelleyebilirsiniz. Ancak zorunlu çerezleri
            engellediğinizde giriş yapamaz ve panele erişemezsiniz; bu çerezler hizmetin çalışması
            için gereklidir.
          </p>

          <h2>Kullanım analitiği</h2>
          <p>
            Ürünü geliştirmek için hangi özelliğin ne sıklıkta kullanıldığını kendi sistemimizde
            kaydediyoruz (örneğin bir analizin başlatılması). Bu kayıtlar hesabınızla ilişkilendirilir
            ancak üçüncü taraf reklam ağlarıyla paylaşılmaz ve bunun için ayrı bir çerez kullanılmaz.
          </p>

          <h2>Daha fazlası</h2>
          <p>
            Verilerinizin işlenmesine ilişkin ayrıntılar için{" "}
            <Link href="/kvkk">KVKK Aydınlatma Metni</Link> ve{" "}
            <Link href="/gizlilik">Gizlilik Politikası</Link> sayfalarına bakabilirsiniz. Sorularınız
            için: {SITE.email}
          </p>
        </YasalMetin>
      </Icerik>
    </PazarlamaKabugu>
  );
}
