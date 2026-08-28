import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { SayfaUstVerisiFormu } from "@/components/app/yetkili-formlar";
import { Uyari } from "@/components/ui/feedback";
import { BolumBasligi } from "@/components/ui/surface";
import { DUZENLENEBILIR_SAYFALAR, type DuzenlenebilirSayfa } from "@/config/sayfa-listesi";
import { tumSayfaUstVerileri } from "@/lib/marka";
import { yetkiliGerekli } from "@/lib/yetkili";

const GRUP_SIRASI: DuzenlenebilirSayfa["grup"][] = [
  "Ana",
  "Ücretsiz araçlar",
  "Hizmet sayfaları",
  "Kurumsal",
  "Yasal",
];

export default async function YetkiliSayfaBilgileriSayfasi() {
  await yetkiliGerekli();
  const ustVeriler = await tumSayfaUstVerileri();

  const ozellestirilen = DUZENLENEBILIR_SAYFALAR.filter((s) => {
    const k = ustVeriler.get(s.path);
    return Boolean(k?.title || k?.description);
  }).length;

  return (
    <>
      <SayfaBasligi
        baslik="Sayfa Bilgileri"
        aciklama={`Herkese açık sayfaların arama sonuçlarındaki başlık ve açıklamaları. ${DUZENLENEBILIR_SAYFALAR.length} sayfadan ${ozellestirilen} tanesi özelleştirilmiş.`}
      />

      <Uyari ton="bilgi" className="mb-7">
        Bir alanı boş bırakırsanız o sayfa koddaki varsayılan metnini kullanır. Başlık için
        30-60, açıklama için 70-158 karakter aralığı önerilir; sayaçlar bunu gösterir.
      </Uyari>

      <div className="space-y-9">
        {GRUP_SIRASI.map((grup) => {
          const sayfalar = DUZENLENEBILIR_SAYFALAR.filter((s) => s.grup === grup);
          if (!sayfalar.length) return null;

          return (
            <section key={grup}>
              <BolumBasligi baslik={grup} />
              <div className="mt-4 space-y-2">
                {sayfalar.map((s) => {
                  const kayit = ustVeriler.get(s.path);
                  return (
                    <SayfaUstVerisiFormu
                      key={s.path}
                      path={s.path}
                      ad={s.ad}
                      varsayilanTitle={s.varsayilanTitle}
                      varsayilanDescription={s.varsayilanDescription}
                      mevcutTitle={kayit?.title ?? null}
                      mevcutDescription={kayit?.description ?? null}
                      mevcutNoindex={kayit?.noindex ?? false}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
