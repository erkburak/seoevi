-- ---------------------------------------------------------------------
-- Paketlerin yeni fiyat noktalarına göre yeniden kurgulanması
--
--   Başlangıç    1.490 TL → 499 TL
--   Profesyonel  3.490 TL → 999 TL
--   Kurumsal     9.900 TL → 1.499 TL
--   Konuşalım    fiyat yok (özel)
--
-- Fiyatlar düştüğü için limitler de düşürüldü: her paketin aylık en kötü
-- durum API maliyeti gelirin %25'ini aşmamalı (bkz. src/lib/maliyet.ts).
--
--   499 TL  = $10,37 → bütçe $2,59  → gerçekleşen $2,50 (%24,1)
--   999 TL  = $20,75 → bütçe $5,19  → gerçekleşen $5,15 (%24,8)
--   1.499 TL= $31,14 → bütçe $7,78  → gerçekleşen $7,74 (%24,8)
--
-- Doğrulamak için: npx tsx scripts/tani/paket-maliyeti.ts
--
-- Limitler belirlenirken en pahalı iki kalem belirleyici oldu:
--   Google Ads anahtar kelime araştırması  $0,09 / çağrı
--   Canlı SERP sorgusu                     $0,002 / sorgu
--
-- Proje sayısı cömert tutuldu: SERP ve tarama limitleri hesap genelinde
-- ortak havuzdur, dolayısıyla proje eklemek ek maliyet üretmez.
-- ---------------------------------------------------------------------

-- --- Deneme: kayıt başına maliyet 0,51 dolara indirildi ---
update public.plans set
  limits = '{"projeler":1,"anahtar_kelime":40,"aylik_kelime_arastirmasi":2,"gunluk_serp":5,"aylik_site_taramasi":1,"tarama_sayfa":100,"rakip":1,"aylik_rapor":2,"aylik_ai":8,"geri_baglanti":false,"merchant":false,"ai_gorunurlugu":false}'::jsonb,
  updated_at = now()
where id = 'deneme';

-- --- Başlangıç: 499 TL ---
update public.plans set
  price_monthly = 499,
  price_yearly  = 4990,
  headline    = 'Tek mağazanız için temel SEO',
  description = 'Sitesini yeni büyütmeye başlayan e-ticaret siteleri için teknik SEO, anahtar kelime takibi ve fırsat önceliklendirmesi.',
  audience    = 'Tek mağazasını büyütmeye başlayanlar',
  features = '["Teknik SEO taraması ve skoru","Anahtar kelime takibi","Fırsat skoru ile önceliklendirme","Ürün ve kategori SEO analizi","Aksiyon merkezi","Yapay zekâ önerileri","WhatsApp desteği"]'::jsonb,
  limits = '{"projeler":2,"anahtar_kelime":200,"aylik_kelime_arastirmasi":8,"gunluk_serp":15,"aylik_site_taramasi":2,"tarama_sayfa":300,"rakip":2,"aylik_rapor":5,"aylik_ai":35,"geri_baglanti":false,"merchant":false,"ai_gorunurlugu":false}'::jsonb,
  updated_at = now()
where id = 'baslangic';

-- --- Profesyonel: 999 TL ---
update public.plans set
  price_monthly = 999,
  price_yearly  = 9990,
  headline    = 'Rakiplerinizi ve Google Alışveriş''i ekleyin',
  description = 'Düzenli SEO çalışması yapan ekipler için rakip analizi, geri bağlantı verisi ve Merchant görünürlüğü dahil.',
  audience    = 'Düzenli SEO çalışması yapan e-ticaret ekipleri',
  features = '["Başlangıç paketindeki her şey","Rakip analizi ve kelime boşluğu","Rakibin Açığı raporu","Geri bağlantı analizi","Merchant ve Google Alışveriş analizi","İçerik fırsatları","Öncelikli WhatsApp desteği"]'::jsonb,
  limits = '{"projeler":5,"anahtar_kelime":500,"aylik_kelime_arastirmasi":12,"gunluk_serp":30,"aylik_site_taramasi":4,"tarama_sayfa":600,"rakip":5,"aylik_rapor":20,"aylik_ai":45,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":false}'::jsonb,
  updated_at = now()
where id = 'profesyonel';

-- --- Kurumsal: 1.499 TL ---
update public.plans set
  price_monthly = 1499,
  price_yearly  = 14990,
  headline    = 'Çoklu mağaza ve AI görünürlüğü',
  description = 'Birden fazla mağaza yöneten ve yapay zekâ aramalarındaki görünürlüğünü de ölçmek isteyen markalar için.',
  audience    = 'Birden fazla mağaza yöneten markalar',
  features = '["Profesyonel paketteki her şey","15 mağazaya kadar yönetim","AI görünürlüğü ölçümü","Geniş katalog taraması","Rakip ürün karşılaştırması","Gelişmiş raporlama","Kurulum desteği"]'::jsonb,
  limits = '{"projeler":15,"anahtar_kelime":1000,"aylik_kelime_arastirmasi":20,"gunluk_serp":45,"aylik_site_taramasi":6,"tarama_sayfa":1000,"rakip":10,"aylik_rapor":50,"aylik_ai":55,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb,
  updated_at = now()
where id = 'kurumsal';

-- --- Konuşalım: limitler görüşmeye göre tanımlanır ---
-- Buradaki değerler yalnızca üst sınır niteliğindedir; gerçek limitler
-- abonelik kaydındaki limit_overrides alanıyla müşteriye özel verilir.
update public.plans set
  headline    = 'İşletmeniz için özel SEO çözümü',
  description = 'Yüksek hacimli katalog, çoklu ülke veya özel entegrasyon ihtiyacı olan işletmeler için limitler birlikte belirlenir.',
  audience    = 'Pazaryerleri ve özel ihtiyaçları olan işletmeler',
  limits = '{"projeler":100,"anahtar_kelime":50000,"aylik_kelime_arastirmasi":300,"gunluk_serp":500,"aylik_site_taramasi":60,"tarama_sayfa":10000,"rakip":50,"aylik_rapor":500,"aylik_ai":1000,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb,
  updated_at = now()
where id = 'konusalim';
