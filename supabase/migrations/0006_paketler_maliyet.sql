-- ---------------------------------------------------------------------
-- Paketlerin DataForSEO maliyetlerine göre yeniden kurgulanması
--
-- Limitler artık tahminle değil, sağlayıcının kendi fiyat listesindeki
-- birim maliyetlerle hesaplanmıştır (bkz. src/lib/maliyet.ts):
--
--   SERP canlı            $0.002  / sorgu
--   OnPage tarama         $0.00015 / sayfa
--   Labs                  $0.00012 + $0.012 / 1000 satır
--   Google Ads kelime     $0.09   / çağrı   ← en pahalı uç nokta
--   Geri bağlantı         $0.000036 + $0.024 / 1000 satır
--   Merchant görev        $0.001  / görev
--
-- Her paketin aylık en kötü durum maliyeti gelirin %25'ini aşmaz.
-- Doğrulamak için: npx tsx scripts/tani/paket-maliyeti.ts
--
-- Ayrıca ücretsiz denemenin kötüye kullanımını sınırlamak için ayrı bir
-- 'deneme' paketi eklenmiştir. Kayıt olan kullanıcı artık Başlangıç
-- limitleriyle değil, kayıt başına azami ~$0.72 maliyet üreten çok daha
-- dar limitlerle başlar.
-- ---------------------------------------------------------------------

-- --- Yeni limit alanı: mevcut paketlere varsayılan ekle ---
update public.plans
set limits = limits || jsonb_build_object(
  'aylik_kelime_arastirmasi',
  coalesce((limits->>'anahtar_kelime')::int / 20, 10)
)
where not (limits ? 'aylik_kelime_arastirmasi');

-- --- Deneme paketi ---
insert into public.plans
  (id, name, headline, description, audience, price_monthly, price_yearly,
   is_custom, is_public, is_featured, trial_days, sort_order, features, limits)
values
  (
    'deneme',
    'Ücretsiz Deneme',
    'SEO Evi''ni 7 gün boyunca deneyin',
    'Kayıt sonrası otomatik olarak tanımlanan tanıtım paketi. Platformun tüm ekranlarını gerçek verilerle görmenizi sağlar; analiz hacmi sınırlıdır.',
    'Platformu değerlendirmek isteyenler',
    0, 0, false, false, false, 7, 0,
    '["Tek mağaza analizi","Teknik SEO taraması (150 sayfaya kadar)","Sınırlı anahtar kelime araştırması","Fırsat skoru","Aksiyon merkezi"]'::jsonb,
    '{"projeler":1,"anahtar_kelime":50,"aylik_kelime_arastirmasi":3,"gunluk_serp":10,"aylik_site_taramasi":1,"tarama_sayfa":150,"rakip":1,"aylik_rapor":2,"aylik_ai":10,"geri_baglanti":false,"merchant":false,"ai_gorunurlugu":false}'::jsonb
  )
on conflict (id) do update set
  name = excluded.name,
  headline = excluded.headline,
  description = excluded.description,
  audience = excluded.audience,
  price_monthly = excluded.price_monthly,
  price_yearly = excluded.price_yearly,
  is_public = excluded.is_public,
  trial_days = excluded.trial_days,
  sort_order = excluded.sort_order,
  features = excluded.features,
  limits = excluded.limits,
  updated_at = now();

-- --- Ücretli paketlerin limitleri ve fiyatları ---
update public.plans set
  limits = '{"projeler":2,"anahtar_kelime":500,"aylik_kelime_arastirmasi":25,"gunluk_serp":40,"aylik_site_taramasi":4,"tarama_sayfa":500,"rakip":3,"aylik_rapor":10,"aylik_ai":100,"geri_baglanti":false,"merchant":false,"ai_gorunurlugu":false}'::jsonb,
  updated_at = now()
where id = 'baslangic';

update public.plans set
  limits = '{"projeler":10,"anahtar_kelime":3000,"aylik_kelime_arastirmasi":45,"gunluk_serp":100,"aylik_site_taramasi":12,"tarama_sayfa":1500,"rakip":10,"aylik_rapor":40,"aylik_ai":150,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb,
  updated_at = now()
where id = 'profesyonel';

-- Kurumsal fiyatı, limitlerin gerçek maliyetini karşılayacak biçimde
-- 7.900 TL'den 9.900 TL'ye güncellendi. Eski fiyatta bu limitler
-- gelirin %28'ini aşan bir API maliyeti üretiyordu.
update public.plans set
  price_monthly = 9900,
  price_yearly = 99000,
  limits = '{"projeler":25,"anahtar_kelime":15000,"aylik_kelime_arastirmasi":100,"gunluk_serp":250,"aylik_site_taramasi":25,"tarama_sayfa":2500,"rakip":25,"aylik_rapor":200,"aylik_ai":600,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb,
  updated_at = now()
where id = 'kurumsal';

update public.plans set
  limits = '{"projeler":100,"anahtar_kelime":100000,"aylik_kelime_arastirmasi":1000,"gunluk_serp":2000,"aylik_site_taramasi":200,"tarama_sayfa":25000,"rakip":100,"aylik_rapor":1000,"aylik_ai":5000,"geri_baglanti":true,"merchant":true,"ai_gorunurlugu":true}'::jsonb,
  updated_at = now()
where id = 'konusalim';

-- ---------------------------------------------------------------------
-- Kayıt akışı: yeni kullanıcı artık 'deneme' paketiyle başlar
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trial_days integer;
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;

  select coalesce(trial_days, 7) into v_trial_days from public.plans where id = 'deneme';

  insert into public.subscriptions (user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
  values (
    new.id,
    'deneme',
    'deneme',
    now() + make_interval(days => coalesce(v_trial_days, 7)),
    now(),
    now() + make_interval(days => coalesce(v_trial_days, 7))
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Maliyet parametreleri yapılandırmadan yönetilebilir olsun
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'maliyet_parametreleri',
    '{"usd_try":48.14,"hedef_maliyet_orani":0.25,"guncelleme":"2026-08-27"}'::jsonb,
    'Paket limitlerinin maliyet hesabında kullanılan kur ve hedef maliyet oranı.'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
