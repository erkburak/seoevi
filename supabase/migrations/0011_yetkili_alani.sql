-- ---------------------------------------------------------------------
-- Yetkili alanı
--
-- Ayrı bir yönetim uygulaması veya alan adı YOKTUR. Yönetim işlemleri
-- aynı Next.js uygulaması içindeki /yetkili yolunda, yalnızca
-- profiles.role = 'yetkili' olan kullanıcılara açık biçimde yapılır.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Sayfa üst verileri
--
-- Herkese açık sayfaların başlık ve açıklaması yetkili tarafından
-- düzenlenebilir. Kayıt yoksa koddaki varsayılan kullanılır; böylece
-- veritabanı boşken de site doğru çalışır.
-- ---------------------------------------------------------------------

create table if not exists public.page_meta (
  path         text primary key,
  title        text,
  description  text,
  /** Arama motorlarına kapatmak için. */
  noindex      boolean not null default false,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.page_meta is
  'Herkese açık sayfaların yetkili tarafından düzenlenebilen başlık ve açıklamaları.';

drop trigger if exists page_meta_updated_at on public.page_meta;
create trigger page_meta_updated_at before update on public.page_meta
  for each row execute function public.set_updated_at();

alter table public.page_meta enable row level security;

-- Okuma herkese açık: sayfa üst verisi zaten herkesin gördüğü bir bilgi.
drop policy if exists "page_meta_select" on public.page_meta;
create policy "page_meta_select" on public.page_meta
  for select using (true);

-- Yazma yalnızca yetkili.
drop policy if exists "page_meta_write" on public.page_meta;
create policy "page_meta_write" on public.page_meta
  for all using (public.is_yetkili()) with check (public.is_yetkili());

-- ---------------------------------------------------------------------
-- Marka ayarları (logo, favicon)
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'marka',
    '{"logo_url": null, "favicon_url": null, "logo_yukseklik": 28}'::jsonb,
    'Yetkili tarafından yüklenen logo ve favicon adresleri. null ise koddaki varsayılan sembol kullanılır.'
  )
on conflict (key) do nothing;

-- app_config okuması: marka bilgisi herkese açık sayfalarda da gerekiyor.
alter table public.app_config enable row level security;

drop policy if exists "app_config_select" on public.app_config;
create policy "app_config_select" on public.app_config
  for select using (true);

drop policy if exists "app_config_write" on public.app_config;
create policy "app_config_write" on public.app_config
  for all using (public.is_yetkili()) with check (public.is_yetkili());

-- ---------------------------------------------------------------------
-- Marka dosyaları için depolama alanı
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marka',
  'marka',
  true,
  2097152, -- 2 MB
  array['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/x-icon']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Herkes okuyabilir (logo sitede görünür), yalnızca yetkili yazabilir.
drop policy if exists "marka_okuma" on storage.objects;
create policy "marka_okuma" on storage.objects
  for select using (bucket_id = 'marka');

drop policy if exists "marka_yazma" on storage.objects;
create policy "marka_yazma" on storage.objects
  for insert with check (bucket_id = 'marka' and public.is_yetkili());

drop policy if exists "marka_guncelleme" on storage.objects;
create policy "marka_guncelleme" on storage.objects
  for update using (bucket_id = 'marka' and public.is_yetkili());

drop policy if exists "marka_silme" on storage.objects;
create policy "marka_silme" on storage.objects
  for delete using (bucket_id = 'marka' and public.is_yetkili());

-- ---------------------------------------------------------------------
-- Yetkili kullanıcıların ihtiyaç duyduğu okuma izinleri
--
-- Yetkili, kullanıcı listesini ve aboneliklerini görebilmeli; abonelik
-- paketini değiştirebilmeli. Normal kullanıcılar için hiçbir şey değişmez.
-- ---------------------------------------------------------------------

drop policy if exists "profiles_yetkili_select" on public.profiles;
create policy "profiles_yetkili_select" on public.profiles
  for select using (public.is_yetkili());

drop policy if exists "profiles_yetkili_update" on public.profiles;
create policy "profiles_yetkili_update" on public.profiles
  for update using (public.is_yetkili()) with check (public.is_yetkili());

drop policy if exists "subscriptions_yetkili_select" on public.subscriptions;
create policy "subscriptions_yetkili_select" on public.subscriptions
  for select using (public.is_yetkili());

drop policy if exists "subscriptions_yetkili_update" on public.subscriptions;
create policy "subscriptions_yetkili_update" on public.subscriptions
  for update using (public.is_yetkili()) with check (public.is_yetkili());

-- ---------------------------------------------------------------------
-- Yönetim işlemleri kaydı
--
-- Paket değiştirme gibi işlemler iz bırakır; kim ne zaman ne yaptı
-- sonradan görülebilsin.
-- ---------------------------------------------------------------------

create table if not exists public.admin_log (
  id          uuid primary key default gen_random_uuid(),
  yetkili_id  uuid references auth.users(id) on delete set null,
  islem       text not null,
  hedef_id    uuid,
  detay       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists admin_log_idx on public.admin_log (created_at desc);

alter table public.admin_log enable row level security;

drop policy if exists "admin_log_yetkili" on public.admin_log;
create policy "admin_log_yetkili" on public.admin_log
  for select using (public.is_yetkili());
