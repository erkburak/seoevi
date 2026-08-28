-- ---------------------------------------------------------------------
-- Önbellek sürelerinin maliyete göre yeniden ayarlanması
--
-- Süreler verinin gerçekte ne sıklıkta değiştiğine göre belirlenir.
-- Gereğinden kısa bir süre, değişmemiş veriyi tekrar satın almak demektir.
--
--   keyword_data  24 saat → 7 gün
--     Google Ads arama hacimleri aylık güncellenir; günlük yenilemek
--     anlamsız. Üstelik çağrı başına $0,09 ile en pahalı uç nokta.
--
--   serp_arac     yeni, 24 saat
--     Ücretsiz araçlar (Google Sıra Bulucu) için ayrı grup. Sıralama
--     takibinde tazelik önemli olduğundan "serp" 6 saatte kalır, ancak
--     ücretsiz araçta bir günlük veri fazlasıyla yeterlidir.
--
-- Bu değerler koddaki varsayılanları ezer (src/lib/dataforseo/cache.ts).
-- ---------------------------------------------------------------------

update public.app_config
set value = '{
  "keyword_data": 604800,
  "serp": 21600,
  "serp_arac": 86400,
  "labs": 259200,
  "onpage": 604800,
  "backlinks": 604800,
  "merchant": 259200,
  "content_analysis": 259200,
  "locations": 2592000
}'::jsonb,
    description = 'DataForSEO uç noktalarına göre önbellek süresi (saniye). Veri değişim hızına ve birim maliyete göre belirlenir.',
    updated_at = now()
where key = 'onbellek_sureleri';

-- ---------------------------------------------------------------------
-- Elle yenilemede kabul edilen azami yaş
--
-- Kullanıcı "Yenile" dediğinde önbellek körü körüne atlanmaz. Veri bu
-- süreden gençse yine kayıttan verilir; arka arkaya yenileme tıklamaları
-- ve aynı alan adını analiz eden farklı projeler iki kez ödetmez.
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'yenileme_asgari_yasi',
    '{
      "keyword_data": 21600,
      "serp": 1800,
      "serp_arac": 3600,
      "labs": 21600,
      "onpage": 3600,
      "backlinks": 43200,
      "merchant": 21600,
      "content_analysis": 21600,
      "locations": 604800
    }'::jsonb,
    'Elle yenilemede sağlayıcıya gitmeden önce kaydın geçmesi gereken asgari yaş (saniye).'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();

-- ---------------------------------------------------------------------
-- Deneme ayarları: varsayılan plan artık ayrı 'deneme' paketi
-- (0006_paketler_maliyet.sql ile eklendi)
-- ---------------------------------------------------------------------

update public.app_config
set value = '{"gun":7,"varsayilan_plan":"deneme"}'::jsonb,
    updated_at = now()
where key = 'deneme_ayarlari';
