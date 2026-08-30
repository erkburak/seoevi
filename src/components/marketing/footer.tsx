import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { WhatsappButonu } from "@/components/marketing/whatsapp";
import { SITE, WHATSAPP_DISPLAY, WHATSAPP_MESSAGES } from "@/config/site";

const SUTUNLAR = [
  {
    baslik: "Ürün",
    baglantilar: [
      { etiket: "Özellikler", href: "/#ozellikler" },
      { etiket: "Fiyatlandırma", href: "/fiyatlandirma" },
      { etiket: "E-ticaret SEO", href: "/e-ticaret-seo" },
      { etiket: "Rakip Analizi", href: "/rakip-seo-analizi" },
      { etiket: "Google Alışveriş SEO", href: "/google-shopping-seo" },
      { etiket: "AI Görünürlüğü", href: "/ai-seo" },
    ],
  },
  {
    baslik: "Kaynaklar",
    baglantilar: [
      { etiket: "SEO Aracı", href: "/seo-araci" },
      { etiket: "Teknik SEO Analizi", href: "/teknik-seo-analizi" },
      { etiket: "Anahtar Kelime Araştırma Aracı", href: "/anahtar-kelime-arastirma-araci" },
      { etiket: "Google Sıra Bulucu", href: "/google-sira-bulucu" },
      { etiket: "Site Hızı Testi", href: "/site-hizi-testi" },
      { etiket: "Ürün Sayfası SEO Testi", href: "/urun-sayfasi-seo-testi" },
      { etiket: "Ücretsiz SEO Analizi", href: "/ucretsiz-seo-analizi" },
      { etiket: "Başlık Etiketi Oluşturucu", href: "/meta-title-olusturucu" },
      { etiket: "Açıklama Oluşturucu", href: "/meta-description-olusturucu" },
    ],
  },
  {
    baslik: "Şirket",
    baglantilar: [
      { etiket: "Hakkımızda", href: "/hakkimizda" },
      { etiket: "İletişim", href: "/iletisim" },
    ],
  },
  {
    baslik: "Yasal",
    baglantilar: [
      { etiket: "KVKK Aydınlatma Metni", href: "/kvkk" },
      { etiket: "Gizlilik Politikası", href: "/gizlilik" },
      { etiket: "Kullanım Koşulları", href: "/kullanim-kosullari" },
      { etiket: "Çerez Politikası", href: "/cerez-politikasi" },
    ],
  },
];

export function PazarlamaAltbilgisi() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Logo altMetin href={null} boyut={28} />
            <p className="mt-4 text-[13px] leading-relaxed text-ink-400">
              E-ticaret sitelerinin Google, Google Alışveriş ve yeni nesil arama sonuçlarındaki
              görünürlüğünü ölçen ve büyüten SEO karar destek platformu.
            </p>
            <div className="mt-5">
              <WhatsappButonu
                mesaj={WHATSAPP_MESSAGES.genel}
                kaynak="footer"
                gorunum="ikincil"
                boyut="sm"
                cocuk="Bizimle Konuşun"
              />
            </div>
          </div>

          {SUTUNLAR.map((s) => (
            <div key={s.baslik}>
              <h3 className="text-[12.5px] font-semibold text-ink-900">{s.baslik}</h3>
              <ul className="mt-3.5 space-y-2.5">
                {s.baglantilar.map((b) => (
                  <li key={b.href}>
                    <Link
                      href={b.href}
                      className="text-[13px] text-ink-400 transition-colors hover:text-ink-900"
                    >
                      {b.etiket}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] text-ink-400">
            © {new Date().getFullYear()} {SITE.name}. Tüm hakları saklıdır.
          </p>
          <p className="text-[12.5px] text-ink-400">
            WhatsApp: <span className="text-ink-700">{WHATSAPP_DISPLAY}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
