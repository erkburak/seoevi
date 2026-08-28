import { Clock, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";

import { sayfaUstVerisi } from "@/lib/marka";
import { Icerik, PazarlamaKabugu, SayfaGirisi } from "@/components/marketing/sayfa-kabugu";
import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { SITE, WHATSAPP_DISPLAY, WHATSAPP_MESSAGES } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  // Yetkili alanından özelleştirilmişse o değer kullanılır.
  const ustVeri = await sayfaUstVerisi("/iletisim");
  const temel: Metadata = {
  title: "İletişim",
  description:
    "SEO Evi ekibiyle iletişime geçin. SEO sorularınız, paket seçimi ve size özel çözümler için WhatsApp'tan yazabilirsiniz.",
  alternates: { canonical: `${SITE.url}/iletisim` },
  };

  return {
    ...temel,
    title: ustVeri?.title?.trim() || temel.title,
    description: ustVeri?.description?.trim() || temel.description,
    ...(ustVeri?.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

const KANALLAR = [
  {
    ikon: MessageCircle,
    baslik: "WhatsApp",
    aciklama: "En hızlı yanıt aldığınız kanal. Sorularınızı doğrudan ekibimize iletebilirsiniz.",
    deger: WHATSAPP_DISPLAY,
  },
  {
    ikon: Mail,
    baslik: "E-posta",
    aciklama: "Detaylı sorularınız, teklif talepleri ve kurumsal görüşmeler için.",
    deger: SITE.email,
  },
  {
    ikon: Clock,
    baslik: "Çalışma saatleri",
    aciklama: "Hafta içi mesai saatlerinde yazılan mesajlar aynı gün yanıtlanır.",
    deger: "Pazartesi – Cuma, 09.00 – 18.00",
  },
];

const KONULAR = [
  {
    baslik: "Paket seçimi",
    metin: "Mağazanızın büyüklüğüne ve hedeflerinize uygun paketi birlikte belirleyelim.",
    mesaj: WHATSAPP_MESSAGES.genel,
  },
  {
    baslik: "Size özel çözüm",
    metin:
      "Çok sayıda mağaza, yüksek ürün adedi veya özel raporlama ihtiyacınız varsa Konuşalım paketini değerlendirelim.",
    mesaj: WHATSAPP_MESSAGES.ozel,
  },
  {
    baslik: "Kullanım desteği",
    metin: "Platformu kullanırken takıldığınız bir nokta varsa adım adım yardımcı olalım.",
    mesaj: WHATSAPP_MESSAGES.destek,
  },
];

export default function IletisimSayfasi() {
  return (
    <PazarlamaKabugu>
      <SayfaGirisi
        ustBaslik="İletişim"
        baslik="Bir SEO sorunuz mu var?"
        aciklama="Ekibimizle konuşun. Mağazanızın durumunu birlikte değerlendirelim, size gerçekten uygun olanı önerelim."
      >
        <WhatsappButonu
          mesaj={WHATSAPP_MESSAGES.genel}
          kaynak="iletisim"
          boyut="lg"
          cocuk="WhatsApp'tan Yazın"
        />
      </SayfaGirisi>

      <Icerik genislik="genis">
        <div className="grid gap-4 sm:grid-cols-3">
          {KANALLAR.map((k) => {
            const Ikon = k.ikon;
            return (
              <div key={k.baslik} className="rounded-[14px] border border-line bg-white p-5">
                <span className="inline-flex size-9 items-center justify-center rounded-[10px] border border-line bg-surface-muted text-ink-500">
                  <Ikon className="size-4" aria-hidden />
                </span>
                <h2 className="mt-4 text-[14.5px] font-semibold text-ink-900">{k.baslik}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-400">{k.aciklama}</p>
                <p className="mt-3 text-[13.5px] font-medium text-ink-800">{k.deger}</p>
              </div>
            );
          })}
        </div>

        <section className="mt-16">
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink-900">
            Ne hakkında konuşmak istiyorsunuz?
          </h2>
          <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-500">
            Konuyu seçin; mesajınız hazır olarak açılsın. Uzun form doldurmanıza gerek yok.
          </p>

          <ul className="mt-8 divide-y divide-line rounded-[14px] border border-line bg-white">
            {KONULAR.map((k) => (
              <li key={k.baslik} className="flex flex-wrap items-center gap-4 px-5 py-5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14.5px] font-semibold text-ink-900">{k.baslik}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">{k.metin}</p>
                </div>
                <WhatsappButonu
                  mesaj={k.mesaj}
                  kaynak={`iletisim_${k.baslik}`}
                  gorunum="ikincil"
                  boyut="sm"
                  cocuk="Bu Konuda Yaz"
                />
              </li>
            ))}
          </ul>
        </section>
      </Icerik>
    </PazarlamaKabugu>
  );
}
