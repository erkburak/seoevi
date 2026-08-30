"use client";

import { useActionState } from "react";

import { ayarlariKaydet, type AyarSonucu } from "@/app/(uygulama)/ayarlar/actions";
import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { Alan, SecimAlani } from "@/components/ui/form";
import { Ayirac, BolumBasligi } from "@/components/ui/surface";
import type { ProjeAyarlari } from "@/types/database";

const BOS: AyarSonucu = {};

export function AyarFormu({
  ayarlar,
  planSayfaLimiti,
}: {
  ayarlar: ProjeAyarlari;
  planSayfaLimiti: number;
}) {
  const [durum, gonder, bekliyor] = useActionState(ayarlariKaydet, BOS);

  return (
    <form action={gonder} className="space-y-9">
      {/* --- Analiz --- */}
      <section>
        <BolumBasligi
          baslik="Analiz"
          aciklama="Sitenizin hangi sıklıkta ve hangi kapsamda taranacağını belirler."
        />
        <div className="mt-5 grid max-w-2xl gap-5 sm:grid-cols-2">
          <SecimAlani
            etiket="Varsayılan cihaz"
            name="cihaz"
            defaultValue={ayarlar.device}
            yardim="SERP sıralamaları bu cihaza göre ölçülür."
          >
            <option value="desktop">Masaüstü</option>
            <option value="mobile">Mobil</option>
          </SecimAlani>

          <SecimAlani
            etiket="Tarama sıklığı"
            name="taramaSikligi"
            defaultValue={ayarlar.audit_frequency}
            yardim="Otomatik tarama kapalıysa dikkate alınmaz."
          >
            <option value="gunluk">Günlük</option>
            <option value="haftalik">Haftalık</option>
            <option value="aylik">Aylık</option>
            <option value="manuel">Yalnızca ben başlattığımda</option>
          </SecimAlani>

          <Alan
            etiket="Tarama başına sayfa"
            name="maksSayfa"
            type="number"
            min={10}
            max={planSayfaLimiti}
            defaultValue={ayarlar.max_crawl_pages}
            yardim={`Paketinizde en fazla ${planSayfaLimiti} sayfa taranabilir.`}
          />
        </div>

        <label className="mt-5 flex max-w-2xl cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            name="otomatikTarama"
            defaultChecked={ayarlar.auto_audit}
            className="mt-0.5 size-4 accent-ink-900"
          />
          <span className="text-[13px] leading-relaxed text-ink-600">
            Otomatik tarama açık. Seçtiğiniz sıklıkta siteniz yeniden taranır ve değişiklikler
            aksiyon merkezine düşer.
          </span>
        </label>
      </section>

      <Ayirac />

      {/* --- E-ticaret --- */}
      <section>
        <BolumBasligi
          baslik="E-ticaret sayfa desenleri"
          aciklama="Ürün ve kategori sayfalarınızı ayırt edebilmemiz için adres kalıplarını girin. Boş bırakırsanız otomatik tespit edilir."
        />
        <div className="mt-5 grid max-w-2xl gap-5 sm:grid-cols-2">
          <Alan
            etiket="Ürün adresi deseni"
            name="urunDeseni"
            defaultValue={ayarlar.product_url_pattern ?? ""}
            placeholder="/urun/"
            yardim="Örnek: /urun/ veya /p/"
          />
          <Alan
            etiket="Kategori adresi deseni"
            name="kategoriDeseni"
            defaultValue={ayarlar.category_url_pattern ?? ""}
            placeholder="/kategori/"
            yardim="Örnek: /kategori/ veya /c/"
          />
        </div>
      </section>

      <Ayirac />

      {/* --- Google İşletme --- */}
      <section>
        <BolumBasligi
          baslik="Google İşletme kaydı"
          aciklama="Marka aramalarında görünen işletme kartınızın puanını ve yorumlarını izleyebilmemiz için kaydın adı gerekli."
        />
        <div className="mt-5 max-w-2xl">
          <Alan
            etiket="İşletme adı"
            name="isletmeAdi"
            defaultValue={ayarlar.google_isletme_adi ?? ""}
            placeholder="Örnek: Chuba Mağazacılık Ataşehir"
            yardim="Google Haritalar'da göründüğü biçimde yazın. Tahminle arama yapmıyoruz; yanlış ad yanlış işletmenin yorumlarını getirir. Yalnızca çevrim içi satıyorsanız ve kaydınız yoksa boş bırakın."
          />
        </div>
      </section>

      <Ayirac />

      {/* --- Bildirimler --- */}
      <section>
        <BolumBasligi
          baslik="Bildirimler"
          aciklama="Analiz sonuçları ve kritik değişiklikler hakkında nasıl haberdar olmak istersiniz?"
        />
        <div className="mt-5 max-w-2xl space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              name="uygulamaBildirimi"
              defaultChecked={ayarlar.notification_prefs?.uygulama ?? true}
              className="mt-0.5 size-4 accent-ink-900"
            />
            <span className="text-[13px] leading-relaxed text-ink-600">
              Uygulama içi bildirimler — analiz tamamlandığında ve kritik sorun bulunduğunda.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              name="epostaBildirimi"
              defaultChecked={ayarlar.notification_prefs?.email ?? true}
              className="mt-0.5 size-4 accent-ink-900"
            />
            <span className="text-[13px] leading-relaxed text-ink-600">
              E-posta bildirimleri — haftalık özet ve önemli sıralama değişiklikleri.
            </span>
          </label>
        </div>
      </section>

      {durum.hata ? <Uyari ton="kritik">{durum.hata}</Uyari> : null}
      {durum.basari ? <Uyari ton="olumlu">{durum.basari}</Uyari> : null}

      <Buton type="submit" yukleniyor={bekliyor}>
        Ayarları Kaydet
      </Buton>
    </form>
  );
}
