import { PAZARLAMA_SAYFALARI } from "@/config/pazarlama-icerikleri";

/**
 * Yetkili tarafından üst verisi düzenlenebilen herkese açık sayfalar.
 *
 * Buradaki başlık ve açıklamalar VARSAYILANDIR. Yetkili bir sayfa için
 * kayıt oluşturursa o kayıt varsayılanın yerine geçer; alan boş
 * bırakılırsa varsayılana geri dönülür.
 *
 * Panel sayfaları listede yoktur: arama motorlarına kapalıdırlar ve
 * üst verileri kullanıcıya göre değişir.
 */

export type DuzenlenebilirSayfa = {
  path: string;
  /** Yetkili ekranında görünen ad. */
  ad: string;
  grup: "Ana" | "Ücretsiz araçlar" | "Hizmet sayfaları" | "Kurumsal" | "Yasal";
  varsayilanTitle: string;
  varsayilanDescription: string;
};

const TEMEL: DuzenlenebilirSayfa[] = [
  {
    path: "/",
    ad: "Ana sayfa",
    grup: "Ana",
    // Hedef kelime başta: "e-ticaret SEO". Marka sona alınır; başlıkta
    // ilk sözcükler hem sıralamada hem tıklamada daha ağır basar.
    varsayilanTitle: "E-ticaret SEO Aracı — Ürün ve Kategori Analizi | SEO Evi",
    varsayilanDescription:
      "E-ticaret SEO platformu: teknik SEO taraması, anahtar kelime takibi, rakip analizi, ürün ve kategori sayfası skorları tek ekranda. Türkçe, e-ticaret için kurgulandı. 7 gün ücretsiz deneyin.",
  },
  {
    path: "/fiyatlandirma",
    ad: "Fiyatlandırma",
    grup: "Ana",
    varsayilanTitle: "Fiyatlandırma — E-ticaret SEO paketleri",
    varsayilanDescription:
      "SEO Evi paketleri ve limitleri. Mağazanızın büyüklüğüne göre seçin, 7 gün ücretsiz deneyin. Kredi kartı gerekmez.",
  },

  /* --- Ücretsiz araçlar --- */
  {
    path: "/google-sira-bulucu",
    ad: "Google Sıra Bulucu",
    grup: "Ücretsiz araçlar",
    varsayilanTitle: "Google Sıra Bulucu — Sitenizin sırasını ücretsiz öğrenin",
    varsayilanDescription:
      "Alan adınızı ve anahtar kelimenizi girin, Google'da kaçıncı sırada olduğunuzu anında görün. İlk 10 rakip, SERP alanları ve öneriler dahil. Günde 3 sorgu ücretsiz.",
  },
  {
    path: "/ucretsiz-seo-analizi",
    ad: "Ücretsiz SEO Analizi",
    grup: "Ücretsiz araçlar",
    varsayilanTitle: "Ücretsiz SEO Analizi — Sitenizi anında test edin",
    varsayilanDescription:
      "Web sitenizin adresini girin, temel SEO durumunu saniyeler içinde görün. Başlık, meta açıklama, H1, yapısal veri ve mobil uyumluluk kontrolü. Üyelik gerekmez.",
  },
  {
    path: "/meta-title-olusturucu",
    ad: "Başlık Etiketi Oluşturucu",
    grup: "Ücretsiz araçlar",
    varsayilanTitle: "Başlık Etiketi Oluşturucu — Ücretsiz meta title aracı",
    varsayilanDescription:
      "SEO uyumlu başlık etiketi oluşturun. Karakter sayısı ve piksel genişliği anlık ölçülür, arama sonucu önizlemesiyle kırpılmayı önceden görün. Ücretsiz.",
  },
  {
    path: "/meta-description-olusturucu",
    ad: "Meta Açıklama Oluşturucu",
    grup: "Ücretsiz araçlar",
    varsayilanTitle: "Meta Açıklama Oluşturucu — Ücretsiz meta description aracı",
    varsayilanDescription:
      "SEO uyumlu meta açıklama oluşturun. Karakter ve piksel ölçümü, arama sonucu önizlemesi ve hazır şablonlarla tıklama oranınızı artırın. Ücretsiz.",
  },

  /* --- Kurumsal --- */
  {
    path: "/hakkimizda",
    ad: "Hakkımızda",
    grup: "Kurumsal",
    varsayilanTitle: "Hakkımızda",
    varsayilanDescription:
      "SEO Evi, Türkiye'deki e-ticaret sitelerinin Google ve yapay zekâ aramalarındaki görünürlüğünü ölçen ve büyüten bir SEO karar destek platformudur.",
  },
  {
    path: "/iletisim",
    ad: "İletişim",
    grup: "Kurumsal",
    varsayilanTitle: "İletişim",
    varsayilanDescription:
      "SEO Evi ekibiyle iletişime geçin. SEO sorularınız, paket seçimi ve size özel çözümler için WhatsApp'tan yazabilirsiniz.",
  },

  /* --- Yasal --- */
  {
    path: "/kvkk",
    ad: "KVKK Aydınlatma Metni",
    grup: "Yasal",
    varsayilanTitle: "KVKK Aydınlatma Metni",
    varsayilanDescription:
      "SEO Evi kişisel verilerin işlenmesine ilişkin aydınlatma metni. Hangi verileri neden işlediğimiz ve haklarınız.",
  },
  {
    path: "/gizlilik",
    ad: "Gizlilik Politikası",
    grup: "Yasal",
    varsayilanTitle: "Gizlilik Politikası",
    varsayilanDescription:
      "SEO Evi gizlilik politikası. Verilerinizi nasıl topladığımız, sakladığımız ve koruduğumuz.",
  },
  {
    path: "/kullanim-kosullari",
    ad: "Kullanım Koşulları",
    grup: "Yasal",
    varsayilanTitle: "Kullanım Koşulları",
    varsayilanDescription:
      "SEO Evi hizmetinin kullanım koşulları, abonelik, iptal ve sorumluluk kapsamı.",
  },
  {
    path: "/cerez-politikasi",
    ad: "Çerez Politikası",
    grup: "Yasal",
    varsayilanTitle: "Çerez Politikası",
    varsayilanDescription:
      "SEO Evi hangi çerezleri neden kullanıyor? Yalnızca zorunlu çerezler kullanılır, reklam takibi yapılmaz.",
  },
];

/** Pazarlama açılış sayfaları kendi içeriklerinden türetilir. */
const HIZMET_SAYFALARI: DuzenlenebilirSayfa[] = PAZARLAMA_SAYFALARI.map((p) => ({
  path: `/${p.slug}`,
  ad: p.ustBaslik,
  grup: "Hizmet sayfaları" as const,
  varsayilanTitle: p.metaBaslik,
  varsayilanDescription: p.metaAciklama,
}));

export const DUZENLENEBILIR_SAYFALAR: DuzenlenebilirSayfa[] = [
  ...TEMEL,
  ...HIZMET_SAYFALARI,
];

/** Bir yolun varsayılan üst verisini döndürür. */
export function varsayilanUstVeri(
  yol: string,
): { title: string; description: string } | null {
  const s = DUZENLENEBILIR_SAYFALAR.find((x) => x.path === yol);
  if (!s) return null;
  return { title: s.varsayilanTitle, description: s.varsayilanDescription };
}
