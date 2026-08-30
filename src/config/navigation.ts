import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Search,
  Sparkles,
  Users,
  Wrench,
  FileText,
  ShoppingBag,
  Link2,
  Bot,
  ListChecks,
  FolderKanban,
  BarChart3,
  MessagesSquare,
  MessageSquare,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Alt sayfalar — aktif durum eşleşmesi için */
  match?: string[];
};

export type NavGroup = {
  label: string | null;
  items: NavItem[];
};

export const APP_NAV: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Genel Bakış", href: "/genel-bakis", icon: LayoutGrid },
      { label: "Aksiyon Merkezi", href: "/aksiyon-merkezi", icon: ListChecks },
    ],
  },
  {
    label: "Arama",
    items: [
      {
        label: "Anahtar Kelimeler",
        href: "/anahtar-kelimeler",
        icon: Search,
        match: ["/anahtar-kelime-arastirmasi", "/serp-analizi", "/mevsimsellik", "/yamyamlik"],
      },
      { label: "Kelime Fırsatları", href: "/kelime-firsatlari", icon: Sparkles },
      { label: "Rakipler", href: "/rakipler", icon: Users, match: ["/rakip-analizi"] },
    ],
  },
  {
    label: "Site",
    items: [
      { label: "Teknik SEO", href: "/teknik-seo", icon: Wrench, match: ["/sayfa-hizi"] },
      { label: "Sayfa Analizi", href: "/sayfa-analizi", icon: FileText },
      { label: "İçerik Analizi", href: "/icerik-analizi", icon: FileText },
      { label: "Geri Bağlantılar", href: "/geri-baglantilar", icon: Link2 },
    ],
  },
  {
    label: "E-ticaret",
    items: [
      {
        label: "E-ticaret SEO",
        href: "/e-ticaret",
        icon: ShoppingBag,
        match: ["/urun-seo", "/kategori-seo", "/merchant-analizi", "/pazaryeri-radari", "/fiyat-konumu"],
      },
      { label: "AI Görünürlüğü", href: "/ai-gorunurlugu", icon: Bot },
      { label: "İşletme Yorumları", href: "/isletme-yorumlari", icon: MessageSquare },
    ],
  },
  {
    label: "Yönetim",
    items: [
      { label: "Projeler", href: "/projeler", icon: FolderKanban },
      { label: "Raporlar", href: "/raporlar", icon: BarChart3 },
      { label: "Beraber İnceleyelim", href: "/beraber-inceleyelim", icon: MessagesSquare },
    ],
  },
];

/** Genel arama ve komut paleti için düz liste. */
export const APP_NAV_FLAT = APP_NAV.flatMap((g) => g.items);

/* ------------------------------------------------------------------ */
/* Modül içi sekmeler                                                  */
/* ------------------------------------------------------------------ */

/**
 * Bir modülün alt sayfaları arasındaki sekmeler.
 * Sayfa dosyalarından dışa aktarılamaz (Next.js yalnızca belirli
 * dışa aktarımlara izin verir), bu yüzden burada tutulur.
 */
export type SekmeTanimi = { etiket: string; href: string };

export const KELIME_SEKMELERI: SekmeTanimi[] = [
  { etiket: "Tüm kelimeler", href: "/anahtar-kelimeler" },
  { etiket: "Fırsatlar", href: "/kelime-firsatlari" },
  { etiket: "Araştırma", href: "/anahtar-kelime-arastirmasi" },
  { etiket: "SERP analizi", href: "/serp-analizi" },
  { etiket: "Mevsimsellik", href: "/mevsimsellik" },
  { etiket: "Sayfa Çakışması", href: "/yamyamlik" },
];

export const SITE_SEKMELERI: SekmeTanimi[] = [
  { etiket: "Teknik SEO", href: "/teknik-seo" },
  { etiket: "Sayfa Hızı", href: "/sayfa-hizi" },
  { etiket: "Sayfalar", href: "/sayfa-analizi" },
  { etiket: "İçerik", href: "/icerik-analizi" },
  { etiket: "İç bağlantı", href: "/ic-baglanti" },
  { etiket: "Geri bağlantılar", href: "/geri-baglantilar" },
];

export const ETICARET_SEKMELERI: SekmeTanimi[] = [
  { etiket: "Genel", href: "/e-ticaret" },
  { etiket: "Ürün SEO", href: "/urun-seo" },
  { etiket: "Kategori SEO", href: "/kategori-seo" },
  { etiket: "Merchant", href: "/merchant-analizi" },
  { etiket: "Pazaryeri Radarı", href: "/pazaryeri-radari" },
  { etiket: "Fiyat Konumu", href: "/fiyat-konumu" },
];

/* ------------------------------------------------------------------ */
/* Genel arama hedefleri                                               */
/* ------------------------------------------------------------------ */

/**
 * Genel aramada eşleşebilecek sayfalar.
 * Kullanıcının verisi henüz oluşmamışken bile arama işe yarar olsun diye
 * modül adları ve eş anlamlıları burada tutulur.
 */
export type AramaHedefi = {
  baslik: string;
  aciklama: string;
  href: string;
  /** Eşleşmeyi artıran ek terimler. */
  terimler: string[];
};

export const ARAMA_HEDEFLERI: AramaHedefi[] = [
  { baslik: "Genel Bakış", aciklama: "Projenizin güncel SEO durumu", href: "/genel-bakis", terimler: ["panel", "dashboard", "ozet", "skor", "anasayfa"] },
  { baslik: "Aksiyon Merkezi", aciklama: "Bu hafta yapılacaklar", href: "/aksiyon-merkezi", terimler: ["yapilacak", "gorev", "todo", "oncelik", "is"] },
  { baslik: "Anahtar Kelimeler", aciklama: "Sıralamalarınız ve takip listeniz", href: "/anahtar-kelimeler", terimler: ["kelime", "keyword", "siralama", "pozisyon"] },
  { baslik: "Kelime Fırsatları", aciklama: "Kazanılması en olası kelimeler", href: "/kelime-firsatlari", terimler: ["firsat", "opportunity", "potansiyel", "kolay kazanim"] },
  { baslik: "Anahtar Kelime Araştırması", aciklama: "Yeni kelime bulun", href: "/anahtar-kelime-arastirmasi", terimler: ["arastirma", "research", "yeni kelime", "oneri"] },
  { baslik: "SERP Analizi", aciklama: "Arama sonuçlarını inceleyin", href: "/serp-analizi", terimler: ["serp", "arama sonucu", "google"] },
  { baslik: "Rakipler", aciklama: "Rakip alan adlarınız", href: "/rakipler", terimler: ["rakip", "competitor", "karsilastirma"] },
  { baslik: "Teknik SEO", aciklama: "Tarama ve teknik sorunlar", href: "/teknik-seo", terimler: ["teknik", "tarama", "crawl", "sorun", "hata", "indeks"] },
  { baslik: "Sayfa Hızı", aciklama: "Çekirdek Web Verileri", href: "/sayfa-hizi", terimler: ["hiz", "hız", "speed", "lighthouse", "core web vitals", "lcp", "cls", "yavas"] },
  { baslik: "Sayfa Analizi", aciklama: "Sayfa bazlı SEO sağlığı", href: "/sayfa-analizi", terimler: ["sayfa", "page", "url"] },
  { baslik: "İçerik Analizi", aciklama: "İçerik boşlukları ve planı", href: "/icerik-analizi", terimler: ["icerik", "content", "blog", "yazi"] },
  { baslik: "Geri Bağlantılar", aciklama: "Backlink ve referans alan adları", href: "/geri-baglantilar", terimler: ["backlink", "geri baglanti", "link", "otorite"] },
  { baslik: "E-ticaret SEO", aciklama: "Ürün ve kategori genel görünümü", href: "/e-ticaret", terimler: ["eticaret", "magaza", "shop"] },
  { baslik: "Ürün SEO", aciklama: "Ürün sayfası skorları", href: "/urun-seo", terimler: ["urun", "product"] },
  { baslik: "Kategori SEO", aciklama: "Kategori sayfası skorları", href: "/kategori-seo", terimler: ["kategori", "category"] },
  { baslik: "Merchant Analizi", aciklama: "Google Alışveriş görünürlüğü", href: "/merchant-analizi", terimler: ["merchant", "alisveris", "shopping", "gtin"] },
  { baslik: "Mevsimsellik", aciklama: "Hangi kelimede ne zaman çalışmalı", href: "/mevsimsellik", terimler: ["mevsim", "sezon", "takvim", "zirve", "ramazan", "black friday", "okula donus"] },
  { baslik: "Sayfa Çakışması", aciklama: "Kendi sayfalarınız birbiriyle yarışıyor", href: "/yamyamlik", terimler: ["cakisma", "yamyam", "kanibalizasyon", "cannibalization", "ayni kelime"] },
  { baslik: "Fiyat Konumu", aciklama: "Rakiplere göre fiyatınız", href: "/fiyat-konumu", terimler: ["fiyat", "price", "ucuz", "pahali", "rekabet", "satici"] },
  { baslik: "İşletme Yorumları", aciklama: "Google puanı ve yorumlar", href: "/isletme-yorumlari", terimler: ["yorum", "puan", "review", "isletme", "google isletme", "yildiz", "itibar"] },
  { baslik: "Pazaryeri Radarı", aciklama: "Trendyol ve rakip pazaryeri baskısı", href: "/pazaryeri-radari", terimler: ["pazaryeri", "trendyol", "hepsiburada", "n11", "cimri", "akakce", "radar", "amazon"] },
  { baslik: "AI Görünürlüğü", aciklama: "Yapay zekâ aramalarındaki yeriniz", href: "/ai-gorunurlugu", terimler: ["ai", "yapay zeka", "gorunurluk"] },
  { baslik: "Raporlar", aciklama: "SEO raporu oluşturun", href: "/raporlar", terimler: ["rapor", "report", "pdf", "sunum"] },
  { baslik: "Projeler", aciklama: "Mağazalarınızı yönetin", href: "/projeler", terimler: ["proje", "site", "magaza", "domain", "alan adi"] },
  { baslik: "Ayarlar", aciklama: "Analiz ve bildirim ayarları", href: "/ayarlar", terimler: ["ayar", "settings", "yapilandirma", "tarama sikligi"] },
  { baslik: "Hesabım", aciklama: "Paket, kullanım ve profil", href: "/hesabim", terimler: ["hesap", "paket", "abonelik", "fatura", "limit", "kullanim", "profil", "sifre"] },
];
