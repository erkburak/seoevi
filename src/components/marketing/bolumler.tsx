import {
  ArrowRight,
  Bot,
  Boxes,
  FileSearch,
  Gauge,
  Layers,
  LineChart,
  ListChecks,
  Search,
  ShoppingBag,
  Target,
  Users,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { CubukGrafik } from "@/components/charts";
import {
  ORNEK_AI,
  ORNEK_AKSIYONLAR,
  ORNEK_MERCHANT,
  ORNEK_RAKIP,
  ORNEK_KELIMELER,
} from "@/components/marketing/ornek-veri";
import { Buton } from "@/components/ui/button";
import { OncelikRozeti, Rozet } from "@/components/ui/badge";
import { FirsatSkoru, SkorCubugu, SkorHalkasi } from "@/components/ui/score";
import { cn, sayi, yuzde } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Ortak kalıplar                                                      */
/* ------------------------------------------------------------------ */

function BolumBasi({
  ustBaslik,
  baslik,
  aciklama,
  ortala = false,
}: {
  ustBaslik: string;
  baslik: string;
  aciklama: string;
  ortala?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", ortala && "mx-auto text-center")}>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-400">{ustBaslik}</p>
      <h2 className="mt-3 text-[27px] font-semibold leading-[1.15] tracking-[-0.025em] text-ink-900 sm:text-[34px]">
        {baslik}
      </h2>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-500">{aciklama}</p>
    </div>
  );
}

function OrnekEtiketi() {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-white px-2 py-0.5 text-[10.5px] font-medium text-ink-400">
      Örnek proje
    </span>
  );
}

function Bolum({
  id,
  children,
  koyu = false,
  className,
}: {
  id?: string;
  children: ReactNode;
  koyu?: boolean;
  className?: string;
}) {
  return (
    <section id={id} className={cn(koyu ? "bg-surface-muted" : "bg-white", className)}>
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Güven şeridi                                                        */
/* ------------------------------------------------------------------ */

export function GuvenSeridi() {
  const maddeler = [
    { deger: "DataForSEO", etiket: "Canlı Google verisi" },
    { deger: "Türkiye", etiket: "Yerel arama sonuçları" },
    { deger: "Masaüstü + Mobil", etiket: "İki cihazda sıralama" },
    { deger: "Google Alışveriş", etiket: "Merchant görünürlüğü" },
  ];

  return (
    <section className="border-y border-line bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-y-8 px-5 py-10 lg:grid-cols-4 lg:px-8">
        {maddeler.map((m) => (
          <div key={m.deger} className="text-center">
            <p className="text-[15px] font-semibold tracking-[-0.01em] text-ink-900">{m.deger}</p>
            <p className="mt-1 text-[12.5px] text-ink-400">{m.etiket}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Nasıl çalışır                                                       */
/* ------------------------------------------------------------------ */

export function NasilCalisir() {
  const adimlar = [
    {
      no: "01",
      baslik: "Mağazanızı ekleyin",
      metin: "Alan adınızı girin, sektörünüzü ve hedefinizi seçin. Kurulum iki dakika sürer.",
      ikon: Layers,
    },
    {
      no: "02",
      baslik: "Site taranır",
      metin: "Teknik SEO, ürün ve kategori sayfaları, sıralamalar ve rakipler arka planda analiz edilir.",
      ikon: FileSearch,
    },
    {
      no: "03",
      baslik: "Fırsatlar hesaplanır",
      metin: "Her kelime ve sayfa için fırsat skoru üretilir; kazanılabilir alanlar öne çıkar.",
      ikon: Target,
    },
    {
      no: "04",
      baslik: "Bu hafta ne yapacağınızı görürsünüz",
      metin: "Aksiyon merkezinde önceliklendirilmiş, etkisi ölçülmüş bir iş listesi bulursunuz.",
      ikon: ListChecks,
    },
  ];

  return (
    <Bolum id="nasil-calisir" koyu>
      <BolumBasi
        ustBaslik="Nasıl çalışır"
        baslik="Rapor değil, yapılacaklar listesi"
        aciklama="SEO Evi size veri yığını sunmaz. Sitenizi analiz eder, kaybettiğiniz yerleri bulur ve sırayla ne yapmanız gerektiğini söyler."
        ortala
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {adimlar.map((a) => (
          <div key={a.no} className="bg-white p-6">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface-muted text-ink-500">
                <a.ikon className="size-4" aria-hidden />
              </span>
              <span className="tabular text-[12px] font-semibold text-ink-300">{a.no}</span>
            </div>
            <h3 className="mt-4 text-[15px] font-semibold text-ink-900">{a.baslik}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{a.metin}</p>
          </div>
        ))}
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* SEO skoru                                                           */
/* ------------------------------------------------------------------ */

export function SkorBolumu() {
  return (
    <Bolum>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <BolumBasi
            ustBaslik="SEO skoru"
            baslik="Sitenizin durumu tek bir sayıya iniyor"
            aciklama="Teknik altyapı, içerik derinliği, kelime performansı, otorite, e-ticaret sinyalleri ve AI görünürlüğü ayrı ayrı ölçülür. Her bileşenin skora katkısı açıkça görülür."
          />
          <ul className="mt-7 space-y-3">
            {[
              "Gerçek tarama verisinden hesaplanır, tahmin değildir",
              "Skor düştüğünde hangi bileşenin etkilediğini gösterir",
              "Zaman içindeki değişimi haftalık olarak takip eder",
            ].map((m) => (
              <li key={m} className="flex items-start gap-2.5 text-[14px] text-ink-600">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink-900" />
                {m}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-6 shadow-raised">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-900">SEO skoru kırılımı</h3>
            <OrnekEtiketi />
          </div>
          <div className="flex items-center gap-6">
            <SkorHalkasi skor={68} boyut={112} etiket="Genel" />
            <div className="flex-1 space-y-3.5">
              <SkorCubugu etiket="Teknik SEO" skor={74} />
              <SkorCubugu etiket="İçerik" skor={61} />
              <SkorCubugu etiket="Anahtar kelime" skor={66} />
              <SkorCubugu etiket="Otorite" skor={52} />
              <SkorCubugu etiket="E-ticaret" skor={71} />
              <SkorCubugu etiket="AI görünürlüğü" skor={42} />
            </div>
          </div>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Kelime fırsatları                                                   */
/* ------------------------------------------------------------------ */

export function KelimeFirsatlariBolumu() {
  return (
    <Bolum koyu>
      <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <BolumBasi
            ustBaslik="Fırsat skoru"
            baslik="Hangi kelimeye çalışacağınızı tahmin etmeyin"
            aciklama="Arama hacmi, rekabet, mevcut sıralamanız, SERP yapısı ve ticari niyet birlikte değerlendirilir. Sonuç 0-100 arası tek bir fırsat skorudur."
          />
          <div className="mt-7 rounded-[12px] border border-line bg-white p-4">
            <p className="text-[13px] text-ink-500">
              <span className="font-medium text-ink-900">&quot;no frost buzdolabı&quot;</span> için fırsat skoru{" "}
              <span className="font-semibold text-ink-900">91/100</span>
            </p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">
              18. sıradasınız; ilk sayfaya çok yakınsınız, rekabet düşük, satın alma niyeti güçlü.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[16px] border border-line bg-white shadow-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-[13px] font-semibold text-ink-900">Kelime fırsatları</h3>
            <OrnekEtiketi />
          </div>
          <div className="table-scroll">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line bg-surface-muted text-[11.5px] text-ink-400">
                  <th className="px-4 py-2 text-left font-medium">Kelime</th>
                  <th className="px-3 py-2 text-right font-medium">Hacim</th>
                  <th className="px-3 py-2 text-right font-medium">Sıra</th>
                  <th className="px-3 py-2 text-right font-medium">Değişim</th>
                  <th className="px-4 py-2 text-right font-medium">Fırsat</th>
                </tr>
              </thead>
              <tbody>
                {ORNEK_KELIMELER.map((k) => (
                  <tr key={k.keyword} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink-800">{k.keyword}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-600">{sayi(k.hacim)}</td>
                    <td className="tabular px-3 py-2.5 text-right text-ink-600">{k.pozisyon ?? "—"}</td>
                    <td className="tabular px-3 py-2.5 text-right">
                      {k.degisim === 0 ? (
                        <span className="text-ink-300">—</span>
                      ) : (
                        <span className={k.degisim > 0 ? "text-positive" : "text-critical"}>
                          {k.degisim > 0 ? "↑" : "↓"} {Math.abs(k.degisim)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <FirsatSkoru skor={k.firsat} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Rakip analizi                                                       */
/* ------------------------------------------------------------------ */

export function RakipBolumu() {
  return (
    <Bolum>
      <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
        <div className="order-2 rounded-[16px] border border-line bg-white p-6 shadow-raised lg:order-1">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[13px] font-semibold text-ink-900">Rakibin Açığı</h3>
              <p className="mt-1 text-[12.5px] text-ink-400">
                {ORNEK_RAKIP.alan_adi} · {sayi(ORNEK_RAKIP.toplam_firsat)} fırsat bulundu
              </p>
            </div>
            <OrnekEtiketi />
          </div>
          <CubukGrafik
            veri={ORNEK_RAKIP.kirilim.map((k) => ({ etiket: k.etiket, deger: k.adet }))}
            vurgulanan="Ticari kelime"
          />
        </div>

        <div className="order-1 lg:order-2">
          <BolumBasi
            ustBaslik="Rakip analizi"
            baslik="Rakibinizin sizden önde olduğu her kelimeyi görün"
            aciklama="Rakip alan adını ekleyin; ortak kelimeler, kelime boşluğu, kaybedilen ve kazanılan sıralamalar ile trafik getiren sayfaları karşılaştırmalı olarak çıkarırız."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              { baslik: "Kelime boşluğu", metin: "Rakibin sıralandığı, sizin sıralanmadığınız kelimeler" },
              { baslik: "İçerik boşluğu", metin: "Rakibin kapsadığı, sizde eksik olan konular" },
              { baslik: "Backlink boşluğu", metin: "Rakibe link veren, size vermeyen alan adları" },
              { baslik: "Ürün karşılaştırması", metin: "Aynı üründe fiyat, içerik ve schema farkı" },
            ].map((m) => (
              <div key={m.baslik} className="rounded-[12px] border border-line bg-white p-4">
                <p className="text-[13.5px] font-medium text-ink-900">{m.baslik}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{m.metin}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* E-ticaret + Merchant                                                */
/* ------------------------------------------------------------------ */

export function EticaretBolumu() {
  return (
    <Bolum koyu>
      <BolumBasi
        ustBaslik="E-ticaret SEO"
        baslik="Ürün ve kategori sayfalarınız ayrı ayrı puanlanır"
        aciklama="Genel SEO araçları ürün sayfasını sıradan bir sayfa gibi görür. SEO Evi her ürünü 19 maddelik e-ticaret kontrol listesinden geçirir."
        ortala
      />

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[16px] border border-line bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-900">Ürün SEO kontrolü</h3>
            <OrnekEtiketi />
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
            {[
              ["Ürün başlığı", true],
              ["SEO başlığı", false],
              ["Meta açıklama", true],
              ["Ürün açıklaması", false],
              ["Teknik özellikler", true],
              ["Görsel alt metni", false],
              ["Ürün schema", true],
              ["GTIN", false],
              ["Marka", true],
              ["Stok durumu", true],
              ["Yorumlar", false],
              ["Breadcrumb", true],
            ].map(([ad, gecti]) => (
              <li key={ad as string} className="flex items-center gap-2 text-[13px]">
                <span
                  className={cn(
                    "inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    gecti ? "bg-positive-soft text-positive" : "bg-critical-soft text-critical",
                  )}
                  aria-hidden
                >
                  {gecti ? "✓" : "!"}
                </span>
                <span className={gecti ? "text-ink-500" : "text-ink-900"}>{ad as string}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="size-4 text-ink-400" aria-hidden />
              <h3 className="text-[13px] font-semibold text-ink-900">Merchant sağlık skoru</h3>
            </div>
            <OrnekEtiketi />
          </div>
          <div className="flex items-center gap-6">
            <SkorHalkasi skor={ORNEK_MERCHANT.saglik} boyut={96} etiket="Sağlık" />
            <div className="flex-1 space-y-2.5">
              <p className="text-[12.5px] text-ink-400">Eksik alan oranı</p>
              {ORNEK_MERCHANT.eksikler.map((e) => (
                <div key={e.alan} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="text-ink-600">{e.alan}</span>
                  <span className="tabular font-medium text-critical">{yuzde(e.oran)}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-400">
            Google Alışveriş&apos;te görünmek için gereken alanlar ürün ürün kontrol edilir; eksikler
            doğrudan aksiyon listesine düşer.
          </p>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* AI görünürlüğü                                                      */
/* ------------------------------------------------------------------ */

export function AiBolumu() {
  return (
    <Bolum>
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <BolumBasi
            ustBaslik="AI görünürlüğü"
            baslik="Arama artık yalnızca on mavi bağlantı değil"
            aciklama="Markanızın ve ürünlerinizin yapay zekâ destekli cevaplarda ne kadar görünür olduğunu ölçüyoruz: marka bahsedilmeleri, soru kapsaması, içerik güvenilirliği ve konu otoritesi."
          />
          <div className="mt-7">
            <Buton asChild gorunum="ikincil">
              <Link href="/ai-seo">
                AI görünürlüğü nasıl ölçülür?
                <ArrowRight aria-hidden />
              </Link>
            </Buton>
          </div>
        </div>

        <div className="rounded-[16px] border border-line bg-white p-6 shadow-raised">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bot className="size-4 text-ink-400" aria-hidden />
              <h3 className="text-[13px] font-semibold text-ink-900">AI görünürlüğü</h3>
            </div>
            <OrnekEtiketi />
          </div>
          <div className="flex items-center gap-6">
            <SkorHalkasi skor={ORNEK_AI.skor} boyut={104} etiket="Skor" />
            <div className="flex-1 space-y-3">
              {ORNEK_AI.kirilim.map((k) => (
                <SkorCubugu key={k.etiket} etiket={k.etiket} skor={k.deger} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Aksiyon merkezi                                                     */
/* ------------------------------------------------------------------ */

export function AksiyonBolumu() {
  return (
    <Bolum koyu>
      <div className="grid items-start gap-14 lg:grid-cols-[1fr_1.2fr]">
        <div className="lg:sticky lg:top-24">
          <BolumBasi
            ustBaslik="Aksiyon merkezi"
            baslik="&quot;Şimdi ne yapmalıyım?&quot; sorusunun cevabı"
            aciklama="Bulunan her sorun; önceliği, tahmini etkisi, zorluğu ve kaynak adresiyle birlikte tek bir listede toplanır. Tamamladıkça skorunuzun nasıl değiştiğini görürsünüz."
          />
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-ink-900">Bu hafta</h3>
            <OrnekEtiketi />
          </div>
          <div className="space-y-2.5">
            {ORNEK_AKSIYONLAR.map((a) => (
              <div
                key={a.baslik}
                className="rounded-[12px] border border-line bg-white p-4 transition-shadow hover:shadow-raised"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <OncelikRozeti oncelik={a.oncelik} />
                  <Rozet>Etki: {a.etki}</Rozet>
                  <Rozet>Zorluk: {a.zorluk}</Rozet>
                </div>
                <p className="mt-2.5 text-[14px] font-medium text-ink-900">{a.baslik}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{a.aciklama}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Özellikler                                                          */
/* ------------------------------------------------------------------ */

export function OzelliklerBolumu() {
  const ozellikler = [
    { ikon: Gauge, baslik: "Teknik SEO taraması", metin: "Tarama, indeksleme, meta veriler, başlık yapısı, link mimarisi ve schema kontrolü." },
    { ikon: Search, baslik: "Anahtar kelime araştırması", metin: "Arama hacmi, rekabet, zorluk, arama amacı, trend ve uzun kuyruk önerileri." },
    { ikon: LineChart, baslik: "SERP takibi", metin: "Masaüstü ve mobilde sıralama, SERP özellikleri ve pozisyon değişimleri." },
    { ikon: Users, baslik: "Rakip analizi", metin: "Kelime boşluğu, ortak kelimeler, rakibin kazandığı ve kaybettiği sıralamalar." },
    { ikon: Boxes, baslik: "Ürün ve kategori SEO", metin: "Her ürün ve kategori sayfası için ayrı skor ve düzeltme listesi." },
    { ikon: ShoppingBag, baslik: "Merchant analizi", metin: "GTIN, MPN, marka, fiyat ve stok alanlarının Alışveriş uyumluluğu." },
    { ikon: Bot, baslik: "AI görünürlüğü", metin: "Marka ve ürün bahsedilmeleri, soru kapsaması, konu otoritesi." },
    { ikon: ListChecks, baslik: "Aksiyon merkezi", metin: "Önceliklendirilmiş, etkisi hesaplanmış yapılacaklar listesi." },
  ];

  return (
    <Bolum id="ozellikler">
      <BolumBasi
        ustBaslik="Özellikler"
        baslik="Tek platformda, e-ticaret için kurgulanmış"
        aciklama="Farklı araçlar arasında veri taşımak yerine, mağazanızın büyümesi için gereken her sinyali aynı yerde tutun."
        ortala
      />

      <div className="mt-14 grid gap-px overflow-hidden rounded-[16px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {ozellikler.map((o) => (
          <div key={o.baslik} className="bg-white p-6 transition-colors hover:bg-surface-muted">
            <o.ikon className="size-[18px] text-ink-400" aria-hidden />
            <h3 className="mt-4 text-[14px] font-semibold text-ink-900">{o.baslik}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-500">{o.metin}</p>
          </div>
        ))}
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Sık sorulanlar                                                      */
/* ------------------------------------------------------------------ */

export const SSS_LISTESI = [
  {
    soru: "SEO Evi verileri nereden alıyor?",
    cevap:
      "Sıralama, anahtar kelime, geri bağlantı ve Google Alışveriş verileri DataForSEO altyapısından alınır. Site taraması ise kendi tarayıcımızla sitenizin sayfalarını doğrudan inceler. Gösterilen tüm veriler gerçek arama sonuçlarına dayanır.",
  },
  {
    soru: "Kurulum için teknik bilgiye ihtiyacım var mı?",
    cevap:
      "Hayır. Alan adınızı girmeniz yeterli. Site doğrulaması, kod ekleme veya geliştirici desteği gerekmez. İlk analiz birkaç dakika içinde başlar.",
  },
  {
    soru: "Kaç mağaza ekleyebilirim?",
    cevap:
      "Başlangıç paketinde 2, Profesyonel'de 5, Kurumsal'da 15 mağaza yönetebilirsiniz. Daha fazlası için Konuşalım paketiyle size özel limit tanımlıyoruz.",
  },
  {
    soru: "Pazaryeri mağazam için de kullanabilir miyim?",
    cevap:
      "Kendi alan adınıza sahip bir mağazanız varsa tüm özellikleri kullanabilirsiniz. Yalnızca pazaryerinde satış yapıyorsanız Konuşalım paketi kapsamında değerlendirme yapıyoruz.",
  },
  {
    soru: "AI önerileri sitemde otomatik değişiklik yapar mı?",
    cevap:
      "Hayır. SEO Evi hiçbir zaman sizden habersiz değişiklik yapmaz. Öneriler size gösterilir, uygulama kararı ve uygulaması tamamen sizde kalır.",
  },
  {
    soru: "Ücretsiz deneme nasıl işliyor?",
    cevap:
      "7 gün boyunca kredi kartı vermeden deneyebilirsiniz. Deneme süresince gerçek verilerle çalışırsınız; süre sonunda devam etmezseniz herhangi bir ücret alınmaz.",
  },
];

export function SssBolumu() {
  return (
    <Bolum koyu>
      <div className="grid gap-14 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <BolumBasi
            ustBaslik="Sık sorulanlar"
            baslik="Merak edilenler"
            aciklama="Aradığınız cevabı bulamazsanız WhatsApp'tan yazın, aynı gün dönüş yapalım."
          />
        </div>

        <div className="divide-y divide-line border-y border-line">
          {SSS_LISTESI.map((s) => (
            <details key={s.soru} className="group py-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <h3 className="text-[15px] font-medium text-ink-900">{s.soru}</h3>
                <span
                  className="mt-0.5 shrink-0 text-ink-300 transition-transform duration-200 group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">{s.cevap}</p>
            </details>
          ))}
        </div>
      </div>
    </Bolum>
  );
}

/* ------------------------------------------------------------------ */
/* Son çağrı                                                           */
/* ------------------------------------------------------------------ */

export function SonCagri() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-5 pb-24 lg:px-8">
        <div className="relative overflow-hidden rounded-[20px] bg-ink-900 px-8 py-16 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
              backgroundSize: "48px 48px",
              maskImage: "radial-gradient(ellipse 70% 70% at 50% 0%, #000 20%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse 70% 70% at 50% 0%, #000 20%, transparent 75%)",
            }}
            aria-hidden
          />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-[36px]">
              Google&apos;da daha fazla görünmek için önce nerede kaybettiğinizi bulun.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
              Mağazanızı ekleyin, ilk analiz birkaç dakika içinde hazır olsun.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Buton asChild boyut="lg" gorunum="ikincil">
                <Link href="/kayit">
                  Ücretsiz Analize Başla
                  <ArrowRight aria-hidden />
                </Link>
              </Buton>
              <Buton asChild boyut="lg" gorunum="sessiz" className="text-white/70 hover:bg-white/10 hover:text-white">
                <Link href="/fiyatlandirma">Paketleri İncele</Link>
              </Buton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
