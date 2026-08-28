-- ---------------------------------------------------------------------
-- Deneme paketinin daraltılması
--
-- Eski limitler sağlayıcı maliyetine göre fazla cömertti: 7 günlük deneme
-- başına yaklaşık 21 TL. Kısıntı, ürünü gösteren kalemlerden değil pahalı
-- kalemlerden yapılır.
--
-- Gerçek DataForSEO birim fiyatlarıyla deneme başına maliyet payları:
--   kelime araştırması %41 · AI %33 · SERP %16 · tarama yalnızca %3
--
-- Bu yüzden kelime araştırması, AI ve SERP düşürülür; tarama sayfası
-- ARTIRILIR. Tarama bu sistemin en ucuz (100 sayfa = 0,72 TL) ve en ikna
-- edici parçasıdır: kategori sağlığı, sayfa çakışması ve iç bağlantı
-- önerileri ancak yeterli sayfa taranırsa anlamlı çıktı üretir.
--
-- Yeni maliyet: deneme başına yaklaşık 12 TL (%42 düşüş).
-- ---------------------------------------------------------------------

update public.plans
set limits = jsonb_build_object(
      'projeler',                 1,
      -- Takip edilen kelime sayısı maliyeti belirlemez; maliyeti gunluk_serp
      -- belirler. Bu yüzden burada cömert olmak ucuzdur ve pazaryeri radarı
      -- ile sayfa çakışması gibi modüllerin çıktı üretmesini sağlar.
      'anahtar_kelime',          25,
      'aylik_kelime_arastirmasi', 1,
      'gunluk_serp',              3,
      'aylik_site_taramasi',      1,
      'tarama_sayfa',           150,
      'rakip',                    1,
      'aylik_rapor',              1,
      'aylik_ai',                 4,
      'geri_baglanti',        false,
      'merchant',             false,
      'ai_gorunurlugu',       false
    )
where id = 'deneme';
