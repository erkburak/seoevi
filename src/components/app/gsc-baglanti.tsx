import { CheckCircle2, ExternalLink } from "lucide-react";

import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import type { GscOzeti } from "@/lib/gsc/senkron";
import { kisaSayi, tarihSaat } from "@/lib/utils";

/**
 * Search Console bağlantı kartı.
 *
 * Bağlantı kurulduğunda platformdaki tahmini metrikler gerçek ölçümle
 * değişir; bu yüzden kullanıcıya değeri net anlatılır.
 */

const DURUM_MESAJLARI: Record<string, { ton: "olumlu" | "kritik" | "uyari"; metin: string }> = {
  basarili: { ton: "olumlu", metin: "Search Console bağlandı. Veriler arka planda çekiliyor." },
  iptal: { ton: "uyari", metin: "Google izni verilmedi. Bağlantı kurulmadı." },
  mulk_yok: {
    ton: "kritik",
    metin:
      "Google hesabınızda doğrulanmış bir Search Console mülkü bulunamadı. Önce Search Console üzerinden sitenizi doğrulayın.",
  },
  eslesme_yok: {
    ton: "kritik",
    metin:
      "Search Console hesabınızda bu projenin alan adına ait bir mülk bulunamadı. Doğru Google hesabıyla giriş yaptığınızdan emin olun.",
  },
  sure_doldu: { ton: "uyari", metin: "İşlem zaman aşımına uğradı. Tekrar deneyin." },
  gecersiz: { ton: "kritik", metin: "Güvenlik doğrulaması başarısız. Tekrar deneyin." },
  yetkisiz: { ton: "kritik", metin: "Bu projeye erişim yetkiniz yok." },
  kayit_hatasi: { ton: "kritik", metin: "Bağlantı kaydedilemedi. Tekrar deneyin." },
  eksik: { ton: "kritik", metin: "Google'dan eksik yanıt geldi. Tekrar deneyin." },
  hata: { ton: "kritik", metin: "Bağlantı kurulamadı. Birkaç dakika sonra tekrar deneyin." },
};

const FAYDALAR = [
  "Sizi bulan tüm sorgular — takip listenizde olmayanlar dahil",
  "Gerçek tıklama oranı: yüksek gösterim + düşük tıklama = hızlı kazanç",
  "Aksiyonlarınızın etkisi tahminle değil ölçümle doğrulanır",
];

export function GscBaglantiKarti({
  ozet,
  durumAnahtari,
  yapilandirildi,
}: {
  ozet: GscOzeti;
  durumAnahtari?: string;
  yapilandirildi: boolean;
}) {
  const durum = durumAnahtari ? DURUM_MESAJLARI[durumAnahtari] : null;

  return (
    <div className="space-y-4">
      {durum ? <Uyari ton={durum.ton}>{durum.metin}</Uyari> : null}

      {!yapilandirildi ? (
        <Uyari ton="uyari" baslik="Entegrasyon yapılandırılmamış">
          Search Console bağlantısı için sunucuda <code>GOOGLE_CLIENT_ID</code> ve{" "}
          <code>GOOGLE_CLIENT_SECRET</code> tanımlı olmalı.
        </Uyari>
      ) : !ozet.bagli ? (
        <div className="rounded-[14px] border border-line bg-white p-5">
          <h3 className="text-[14.5px] font-semibold text-ink-900">
            Google Search Console&apos;u bağlayın
          </h3>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-500">
            Şu anda trafik ve tıklama oranı sıralamalarınızdan <strong>tahmin</strong> ediliyor.
            Search Console bağlandığında bunlar Google&apos;ın kendi kaydından gelen{" "}
            <strong>gerçek ölçümlere</strong> dönüşür: kaç gösterim aldınız, kaç tıklama geldi,
            hangi sorgularla bulundunuz.
          </p>

          <ul className="mt-4 space-y-1.5 text-[13px] text-ink-600">
            {FAYDALAR.map((m) => (
              <li key={m} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-positive" aria-hidden />
                {m}
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Buton asChild>
              <a href="/api/gsc/baglan">Search Console&apos;u Bağla</a>
            </Buton>
            <span className="text-[12px] text-ink-400">
              Yalnızca okuma izni istenir; hiçbir şey değiştirilmez.
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-[14px] border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-positive" aria-hidden />
                <h3 className="text-[14.5px] font-semibold text-ink-900">Search Console bağlı</h3>
              </div>
              <p className="mt-1 truncate text-[12.5px] text-ink-400">{ozet.property}</p>
              <p className="mt-0.5 text-[12px] text-ink-400">
                Son güncelleme:{" "}
                {ozet.sonSenkron ? tarihSaat(ozet.sonSenkron) : "henüz veri çekilmedi"}
              </p>
            </div>

            <Buton asChild gorunum="ikincil" boyut="sm">
              <a
                href="https://search.google.com/search-console"
                target="_blank"
                rel="noopener noreferrer"
              >
                Search Console&apos;u Aç
                <ExternalLink aria-hidden />
              </a>
            </Buton>
          </div>

          {ozet.sonHata ? (
            <Uyari ton="uyari" className="mt-4">
              Son veri çekiminde sorun oluştu. Bağlantıyı yenilemeyi deneyin.
            </Uyari>
          ) : null}

          {ozet.sorguSayisi > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-4 sm:grid-cols-4">
              <OzetDegeri etiket="Tıklama (28 gün)" deger={kisaSayi(ozet.toplamTiklama)} />
              <OzetDegeri etiket="Gösterim (28 gün)" deger={kisaSayi(ozet.toplamGosterim)} />
              <OzetDegeri
                etiket="Gerçek CTR"
                deger={ozet.ortalamaCtr !== null ? `%${ozet.ortalamaCtr}` : "—"}
              />
              <OzetDegeri
                etiket="Ortalama sıra"
                deger={ozet.ortalamaPozisyon !== null ? String(ozet.ortalamaPozisyon) : "—"}
                ipucu="Gösterim sayısıyla ağırlıklandırılmış gerçek ortalama sıra."
              />
            </div>
          ) : (
            <p className="mt-4 border-t border-line pt-4 text-[13px] text-ink-400">
              Veriler ilk senkronla birlikte görünecek. Google verisi 2-3 gün gecikmeli yayımlanır.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
