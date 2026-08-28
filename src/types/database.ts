/**
 * Veritabanı satır tipleri.
 * supabase/migrations altındaki şema ile birebir eşleşir.
 */

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type SiteTuru = "eticaret" | "kurumsal" | "hizmet" | "blog" | "pazaryeri" | "diger";
export type Cihaz = "desktop" | "mobile";
export type AramaAmaci = "bilgi" | "ticari" | "islem" | "gezinme";
export type Onem = "kritik" | "uyari" | "bilgi";
export type Oncelik = "kritik" | "yuksek" | "orta" | "dusuk";
export type Etki = "cok_yuksek" | "yuksek" | "orta" | "dusuk";
export type Zorluk = "kolay" | "orta" | "zor";
export type AksiyonDurumu = "bekliyor" | "devam_ediyor" | "tamamlandi" | "yoksayildi";
export type SorunDurumu = "acik" | "duzeltiliyor" | "cozuldu" | "yoksayildi";
export type IsDurumu = "bekliyor" | "isleniyor" | "tamamlandi" | "hatali" | "yeniden_deneniyor" | "iptal";
export type SayfaTuru = "anasayfa" | "urun" | "kategori" | "icerik" | "diger";
export type AbonelikDurumu = "deneme" | "aktif" | "gecikmis" | "iptal" | "sona_erdi";
export type FirsatTuru = "genel" | "urun" | "kategori" | "icerik" | "rakip_acigi" | "hizli_kazanim";

export type PlanLimitleri = {
  projeler: number;
  /** Aynı anda takip edilebilecek azami anahtar kelime (stok limiti). */
  anahtar_kelime: number;
  /** Aylık anahtar kelime araştırma çağrısı (akış limiti, maliyetli). */
  aylik_kelime_arastirmasi: number;
  gunluk_serp: number;
  aylik_site_taramasi: number;
  tarama_sayfa: number;
  rakip: number;
  aylik_rapor: number;
  aylik_ai: number;
  geri_baglanti: boolean;
  merchant: boolean;
  ai_gorunurlugu: boolean;
  /** İçeriğini tarayıcıda üreten sitelerde sayfaları JavaScript ile yeniden ölçme hakkı. */
  js_olcum: boolean;
  /** JavaScript ile yeniden ölçülecek azami sayfa sayısı. */
  js_olcum_sayfa: number;
};

export type Plan = {
  id: string;
  name: string;
  headline: string;
  description: string;
  audience: string;
  price_monthly: number | null;
  price_yearly: number | null;
  currency: string;
  is_custom: boolean;
  is_public: boolean;
  is_featured: boolean;
  trial_days: number;
  sort_order: number;
  features: string[];
  limits: PlanLimitleri;
  created_at: string;
  updated_at: string;
};

export type Profil = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  company: string | null;
  role: "kullanici" | "yetkili";
  onboarded_at: string | null;
  onboarding_step: number;
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export type Abonelik = {
  id: string;
  user_id: string;
  plan_id: string;
  status: AbonelikDurumu;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  limit_overrides: Partial<PlanLimitleri>;
  metadata: Record<string, Json>;
  created_at: string;
  updated_at: string;
};

export type Kullanim = {
  id: string;
  user_id: string;
  period: string;
  metric: string;
  used: number;
  updated_at: string;
};

export type ProjeSkorlari = {
  seo?: number;
  teknik?: number;
  icerik?: number;
  keyword?: number;
  otorite?: number;
  eticaret?: number;
  ai?: number;
  merchant?: number;
};

export type ProjeIstatistikleri = {
  siralanan_kelime?: number;
  tahmini_trafik?: number;
  gorunurluk?: number;
  taranan_sayfa?: number;
  tarama_siniri?: number;
  tarama_sinirina_takildi?: boolean;
  urun_sayisi?: number;
  kategori_sayisi?: number;
  kritik_sorun?: number;
  geri_baglanti?: number;
  referans_alan_adi?: number;
};

export type Proje = {
  id: string;
  user_id: string;
  name: string;
  domain: string;
  url: string;
  site_type: SiteTuru;
  primary_goal: string | null;
  industry: string | null;
  country_code: string;
  location_code: number | null;
  location_name: string | null;
  language_code: string;
  language_name: string;
  favicon_url: string | null;
  last_audit_at: string | null;
  scores: ProjeSkorlari;
  stats: ProjeIstatistikleri;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjeAyarlari = {
  project_id: string;
  device: Cihaz;
  auto_audit: boolean;
  audit_frequency: "gunluk" | "haftalik" | "aylik" | "manuel";
  max_crawl_pages: number;
  product_url_pattern: string | null;
  category_url_pattern: string | null;
  notification_prefs: { email: boolean; uygulama: boolean };
  updated_at: string;
};

export type Rakip = {
  id: string;
  project_id: string;
  domain: string;
  name: string | null;
  source: "manuel" | "otomatik";
  is_active: boolean;
  metrics: {
    organik_kelime?: number;
    tahmini_trafik?: number;
    ilk_uc?: number;
    ilk_on?: number;
    ortak_kelime?: number;
  };
  last_synced_at: string | null;
  created_at: string;
};

export type AnahtarKelime = {
  id: string;
  project_id: string;
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  competition_level: string | null;
  difficulty: number | null;
  intent: AramaAmaci | null;
  trend: { yil: number; ay: number; hacim: number }[];
  is_tracked: boolean;
  source: string;
  location_code: number | null;
  language_code: string | null;
  last_refreshed_at: string | null;
  created_at: string;
};

export type KelimeSiralamasi = {
  id: string;
  project_id: string;
  keyword_id: string;
  domain: string;
  is_competitor: boolean;
  position: number | null;
  previous_position: number | null;
  url: string | null;
  device: Cihaz;
  etv: number | null;
  checked_at: string;
};

export type KelimeFirsati = {
  id: string;
  project_id: string;
  keyword_id: string;
  score: number;
  potential_traffic: number | null;
  current_position: number | null;
  target_position: number | null;
  reason: string | null;
  signals: Record<string, number>;
  opportunity_type: FirsatTuru;
  status: "acik" | "degerlendiriliyor" | "kapatildi";
  created_at: string;
};

export type SerpOgesi = {
  tur: string;
  pozisyon: number | null;
  baslik: string | null;
  aciklama: string | null;
  url: string | null;
  alan_adi: string | null;
  bizim_mi: boolean;
  rakip_mi: boolean;
  ek: Record<string, Json>;
};

export type SerpSonucu = {
  id: string;
  project_id: string;
  keyword_id: string | null;
  keyword: string;
  device: Cihaz;
  location_code: number | null;
  language_code: string | null;
  se_results_count: number | null;
  items: SerpOgesi[];
  fetched_at: string;
};

export type SerpOzelligi = {
  id: string;
  serp_id: string;
  project_id: string;
  feature_type: string;
  position: number | null;
  owned: boolean;
  data: Record<string, Json>;
};

export type Sayfa = {
  id: string;
  project_id: string;
  url: string;
  path: string | null;
  page_type: SayfaTuru;
  status_code: number | null;
  title: string | null;
  title_length: number | null;
  meta_description: string | null;
  meta_description_length: number | null;
  h1: string | null;
  h1_count: number | null;
  h2_count: number | null;
  word_count: number | null;
  internal_links_count: number | null;
  external_links_count: number | null;
  images_count: number | null;
  images_without_alt: number | null;
  canonical_url: string | null;
  is_indexable: boolean | null;
  click_depth: number | null;
  is_orphan: boolean;
  has_schema: boolean;
  schema_types: string[];
  load_time_ms: number | null;
  onpage_score: number | null;
  seo_score: number | null;
  checks: Record<string, Json>;
  last_crawled_at: string | null;
  created_at: string;
};

export type TeknikSorun = {
  id: string;
  project_id: string;
  page_id: string | null;
  url: string | null;
  code: string;
  category: string;
  severity: Onem;
  title: string;
  description: string | null;
  recommendation: string | null;
  impact: Etki;
  status: SorunDurumu;
  detected_at: string;
  resolved_at: string | null;
  data: Record<string, Json>;
};

export type Urun = {
  id: string;
  project_id: string;
  page_id: string | null;
  url: string;
  name: string | null;
  brand: string | null;
  price: number | null;
  currency: string | null;
  availability: string | null;
  gtin: string | null;
  mpn: string | null;
  sku: string | null;
  rating: number | null;
  reviews_count: number | null;
  images_count: number | null;
  has_product_schema: boolean;
  has_breadcrumb: boolean;
  description_length: number | null;
  specs_count: number | null;
  seo_score: number | null;
  checks: Record<string, Json>;
  last_analyzed_at: string | null;
  created_at: string;
};

export type Kategori = {
  id: string;
  project_id: string;
  page_id: string | null;
  url: string;
  name: string | null;
  product_count: number | null;
  subcategory_count: number | null;
  description_length: number | null;
  internal_links_count: number | null;
  target_keyword: string | null;
  seo_score: number | null;
  checks: Record<string, Json>;
  last_analyzed_at: string | null;
  created_at: string;
};

export type MerchantDenetimi = {
  id: string;
  project_id: string;
  product_id: string | null;
  health_score: number | null;
  missing_fields: string[];
  shopping_visible: boolean;
  shopping_position: number | null;
  seller_count: number | null;
  price_position: string | null;
  competitors: { alan_adi: string; fiyat: number | null; baslik: string | null }[];
  data: Record<string, Json>;
  created_at: string;
};

export type ReferansAlanAdi = {
  id: string;
  project_id: string;
  domain: string;
  target_domain: string;
  is_competitor: boolean;
  rank: number | null;
  backlinks_count: number | null;
  first_seen: string | null;
  lost_at: string | null;
  is_lost: boolean;
  created_at: string;
};

export type GeriBaglanti = {
  id: string;
  project_id: string;
  referring_domain_id: string | null;
  source_url: string;
  target_url: string | null;
  anchor: string | null;
  is_dofollow: boolean;
  rank: number | null;
  first_seen: string | null;
  last_seen: string | null;
  is_lost: boolean;
  is_new: boolean;
  created_at: string;
};

export type IcerikAnalizi = {
  id: string;
  project_id: string;
  keyword: string;
  search_intent: string | null;
  avg_word_count: number | null;
  common_topics: { konu: string; kapsam: number }[];
  headings: string[];
  questions: string[];
  semantic_terms: { terim: string; siklik: number }[];
  competitor_pages: { url: string; alan_adi: string; kelime_sayisi: number | null; pozisyon: number | null }[];
  gaps: string[];
  created_at: string;
};

export type IcerikFirsati = {
  id: string;
  project_id: string;
  analysis_id: string | null;
  keyword: string;
  title_suggestion: string | null;
  outline: string[];
  questions: string[];
  internal_links: { url: string; anahtar_kelime: string }[];
  estimated_traffic: number | null;
  difficulty: number | null;
  status: "acik" | "planlandi" | "yazildi" | "yayinlandi";
  created_at: string;
};

export type AiGorunurlugu = {
  id: string;
  project_id: string;
  score: number | null;
  brand_visibility: number | null;
  content_trust: number | null;
  topic_authority: number | null;
  product_visibility: number | null;
  question_coverage: number | null;
  breakdown: Record<string, Json>;
  created_at: string;
};

export type AiBahsi = {
  id: string;
  project_id: string;
  query: string;
  mention_type: "marka" | "urun" | "icerik";
  is_mentioned: boolean;
  position: number | null;
  source: string | null;
  context: string | null;
  competitors_mentioned: string[];
  created_at: string;
};

export type AiOnerisi = {
  ozet: string;
  neden: string[];
  oneriler: { baslik: string; icerik: string }[];
  onerilen_title?: string;
  onerilen_aciklama?: string;
  uretildi: string;
};

export type SeoAksiyonu = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  recommendation: string | null;
  category: string;
  priority: Oncelik;
  impact: Etki;
  effort: Zorluk;
  status: AksiyonDurumu;
  affected_count: number;
  source_urls: string[];
  data: Record<string, Json>;
  ai_suggestion: AiOnerisi | null;
  dedupe_key: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Rapor = {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  sections: string[];
  snapshot: Record<string, Json>;
  status: "hazirlaniyor" | "hazir" | "hatali";
  created_at: string;
};

export type IsAdimi = { ad: string; durum: "bekliyor" | "isleniyor" | "tamamlandi" | "hatali" };

export type AnalizIsi = {
  id: string;
  project_id: string;
  user_id: string;
  job_type: string;
  provider: string;
  provider_task_id: string | null;
  status: IsDurumu;
  progress: number;
  steps: IsAdimi[];
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  params: Record<string, Json>;
  error: string | null;
  error_code: string | null;
  raw_data: Json | null;
  normalized_data: Json | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
};

export type AnalizGecmisi = {
  id: string;
  project_id: string;
  job_id: string | null;
  scores: ProjeSkorlari;
  stats: ProjeIstatistikleri;
  created_at: string;
};

export type Bildirim = {
  id: string;
  user_id: string;
  project_id: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  severity: "bilgi" | "basari" | "uyari" | "kritik";
  is_read: boolean;
  created_at: string;
};

/* ------------------------------------------------------------------ */
/* Görünümler                                                          */
/* ------------------------------------------------------------------ */

export type KelimeOzeti = {
  id: string;
  project_id: string;
  keyword: string;
  search_volume: number | null;
  cpc: number | null;
  competition: number | null;
  competition_level: string | null;
  difficulty: number | null;
  intent: AramaAmaci | null;
  is_tracked: boolean;
  source: string;
  trend: { yil: number; ay: number; hacim: number }[];
  position: number | null;
  previous_position: number | null;
  url: string | null;
  etv: number | null;
  checked_at: string | null;
  opportunity_score: number | null;
  potential_traffic: number | null;
  target_position: number | null;
  opportunity_reason: string | null;
  opportunity_type: FirsatTuru | null;
};

export type SayfaOzeti = {
  id: string;
  project_id: string;
  url: string;
  path: string | null;
  page_type: SayfaTuru;
  status_code: number | null;
  title: string | null;
  title_length: number | null;
  meta_description: string | null;
  meta_description_length: number | null;
  h1: string | null;
  word_count: number | null;
  internal_links_count: number | null;
  images_count: number | null;
  images_without_alt: number | null;
  canonical_url: string | null;
  is_indexable: boolean | null;
  click_depth: number | null;
  has_schema: boolean;
  onpage_score: number | null;
  seo_score: number | null;
  last_crawled_at: string | null;
  issue_count: number;
  critical_count: number;
};
