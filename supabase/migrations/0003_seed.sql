-- =====================================================================
-- SEO Evi — Sistem verileri (planlar ve yapılandırma)
-- Fiyatlar ve limitler buradan değil, üretimde veritabanından yönetilir.
-- =====================================================================

insert into public.plans
  (id, name, headline, description, audience, price_monthly, price_yearly, is_custom, is_featured, trial_days, sort_order, features, limits)
values
  (
    'baslangic',
    'Başlangıç',
    'Sitenizin SEO durumunu görün',
    'Tek mağazasını büyütmeye yeni başlayan e-ticaret siteleri için temel analiz ve fırsat takibi.',
    'Yeni büyümeye başlayan e-ticaret siteleri',
    1490, 14900, false, false, 7, 1,
    '["Teknik SEO taraması ve skoru","Anahtar kelime araştırması","Fırsat skoru ile kelime önceliklendirme","Ürün ve kategori SEO analizi","Aksiyon merkezi","WhatsApp desteği"]'::jsonb,
    '{"projeler":2,"anahtar_kelime":500,"gunluk_serp":50,"aylik_site_taramasi":4,"tarama_sayfa":200,"rakip":3,"aylik_rapor":2,"aylik_ai":50,"geri_baglanti":false,"merchant":false,"ai_gorunurlugu":false}'::jsonb
  ),
  (
    'profesyonel',
    'Profesyonel',
    'Rakiplerinizin önüne geçin',
    'Büyüyen e-ticaret siteleri için rakip analizi, Merchant görünürlüğü ve geri bağlantı verisi dahil tam kapsam.',
    'Düzenli SEO çalışması yapan e-ticaret ekipleri',
    3490, 34900, false, true, 7, 2,
    '["Başlangıç paketindeki her şey","Rakip analizi ve kelime boşluğu","Rakibin Açığı raporu","Merchant ve Google Shopping analizi","Geri bağlantı analizi","İçerik fırsatları","AI görünürlüğü","Öncelikli WhatsApp desteği"]'::jsonb,
    '{"projeler":10,"anahtar_kelime":5000,"gunluk_serp":300,"aylik_site_taramasi":20,"tarama_sayfa":2000,"rakip":10,"aylik_rapor":20,"aylik_ai":500,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb
  ),
  (
    'kurumsal',
    'Kurumsal',
    'Çok mağazalı büyüme',
    'Geniş ürün kataloğu ve birden fazla mağazası olan markalar için yüksek limitli kurumsal kullanım.',
    'Çok sayıda mağaza ve büyük katalog yöneten markalar',
    7900, 79000, false, false, 7, 3,
    '["Profesyonel paketteki her şey","25 projeye kadar mağaza yönetimi","Geniş katalog taraması","Gelişmiş Merchant sağlık analizi","Rakip ürün karşılaştırması","Sınırsıza yakın rapor","Kurulum desteği"]'::jsonb,
    '{"projeler":25,"anahtar_kelime":25000,"gunluk_serp":1500,"aylik_site_taramasi":100,"tarama_sayfa":10000,"rakip":25,"aylik_rapor":200,"aylik_ai":3000,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb
  ),
  (
    'konusalim',
    'Konuşalım',
    'İşletmeniz için özel SEO çözümü',
    'Pazaryeri, çoklu ülke veya özel entegrasyon ihtiyacı olan işletmeler için birlikte kurgulanan çözüm.',
    'Pazaryerleri ve özel ihtiyaçları olan işletmeler',
    null, null, true, false, 0, 4,
    '["Özel limitler ve kapsam","Çoklu ülke ve dil desteği","Özel entegrasyonlar","Birebir SEO danışmanlığı","Öncelikli teknik destek"]'::jsonb,
    '{"projeler":100,"anahtar_kelime":100000,"gunluk_serp":10000,"aylik_site_taramasi":500,"tarama_sayfa":50000,"rakip":100,"aylik_rapor":1000,"aylik_ai":20000,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  headline = excluded.headline,
  description = excluded.description,
  audience = excluded.audience,
  features = excluded.features,
  limits = excluded.limits,
  updated_at = now();

-- ---------------------------------------------------------------------
-- Skor ağırlıkları ve önbellek süreleri
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'seo_skoru_agirliklari',
    '{"teknik":25,"icerik":20,"keyword":20,"otorite":15,"eticaret":15,"ai":5}'::jsonb,
    'Genel SEO skorunun bileşen ağırlıkları (toplam 100).'
  ),
  (
    'firsat_skoru_agirliklari',
    '{"hacim":25,"rekabet":20,"mevcut_siralama":20,"ticari_amac":15,"serp_yapisi":10,"rakip_yogunlugu":10}'::jsonb,
    'Anahtar kelime fırsat skorunun sinyal ağırlıkları (toplam 100).'
  ),
  (
    'onbellek_sureleri',
    '{"keyword_data":86400,"serp":21600,"labs":259200,"onpage":604800,"backlinks":604800,"merchant":259200,"content_analysis":259200,"locations":2592000}'::jsonb,
    'DataForSEO uç noktalarına göre önbellek süresi (saniye).'
  ),
  (
    'deneme_ayarlari',
    '{"gun":7,"varsayilan_plan":"baslangic"}'::jsonb,
    'Ücretsiz deneme süresi ve varsayılan plan.'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
