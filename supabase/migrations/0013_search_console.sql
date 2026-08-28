-- ---------------------------------------------------------------------
-- Google Search Console entegrasyonu
--
-- Şimdiye kadar trafik ve tıklama oranı, sıralamadan TAHMİN ediliyordu.
-- Search Console gerçek veriyi verir: kaç gösterim, kaç tıklama, hangi
-- sorgular. Bu, tahmine dayalı her metriği ölçüme çevirir.
--
-- Search Console verisi siteye özel olduğu için API anahtarıyla değil,
-- yalnızca site sahibinin OAuth onayıyla okunabilir.
-- ---------------------------------------------------------------------

create table if not exists public.gsc_connections (
  project_id     uuid primary key references public.projects(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,

  /** Seçilen Search Console mülkü (ör. sc-domain:magazam.com). */
  property       text not null,
  /** Uzun ömürlü yenileme anahtarı. Yalnızca sunucu tarafından okunur. */
  refresh_token  text not null,
  /** Kısa ömürlü erişim anahtarı ve bitiş zamanı — gereksiz yenilemeyi önler. */
  access_token   text,
  expires_at     timestamptz,

  last_sync_at   timestamptz,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists gsc_connections_updated_at on public.gsc_connections;
create trigger gsc_connections_updated_at before update on public.gsc_connections
  for each row execute function public.set_updated_at();

-- Anahtarlar hiçbir istemciye açılmaz: okuma dahil tüm erişim kapalı,
-- yalnızca servis rolü (sunucu) erişebilir.
alter table public.gsc_connections enable row level security;
revoke all on public.gsc_connections from anon, authenticated;

-- ---------------------------------------------------------------------
-- Gerçek performans verisi
-- ---------------------------------------------------------------------

create table if not exists public.gsc_performance (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,

  /** 'sorgu' | 'sayfa' */
  boyut        text not null check (boyut in ('sorgu', 'sayfa')),
  /** Sorgu metni veya sayfa adresi. */
  deger        text not null,

  tiklama      integer not null default 0,
  gosterim     integer not null default 0,
  /** Gerçek tıklama oranı (%). */
  ctr          numeric(6,2),
  /** Gerçek ortalama sıra. */
  pozisyon     numeric(6,2),

  /** Verinin kapsadığı dönem. */
  baslangic    date not null,
  bitis        date not null,
  created_at   timestamptz not null default now(),

  unique (project_id, boyut, deger, baslangic, bitis)
);

create index if not exists gsc_performance_project_idx
  on public.gsc_performance (project_id, boyut, gosterim desc);

create index if not exists gsc_performance_donem_idx
  on public.gsc_performance (project_id, bitis desc);

alter table public.gsc_performance enable row level security;

drop policy if exists "gsc_performance_select" on public.gsc_performance;
create policy "gsc_performance_select" on public.gsc_performance
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "gsc_performance_write" on public.gsc_performance;
create policy "gsc_performance_write" on public.gsc_performance
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Günlük görünürlük anlık görüntüsü ve alarm
--
-- Kullanıcı sabah panele girdiğinde "dün ne oldu?" sorusunun cevabını
-- görmeli. Bu tablo her gün bir satır tutar; alarmlar iki gün arasındaki
-- farktan üretilir.
-- ---------------------------------------------------------------------

create table if not exists public.daily_snapshot (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  gun               date not null,

  siralanan_kelime  integer not null default 0,
  ilk_uc            integer not null default 0,
  ilk_on            integer not null default 0,
  ortalama_pozisyon numeric(6,2),
  tahmini_trafik    numeric(12,2) not null default 0,
  gorunurluk        numeric(6,2) not null default 0,

  /** Search Console bağlıysa gerçek veriler. */
  gsc_tiklama       integer,
  gsc_gosterim      integer,

  created_at        timestamptz not null default now(),
  unique (project_id, gun)
);

create index if not exists daily_snapshot_idx on public.daily_snapshot (project_id, gun desc);

alter table public.daily_snapshot enable row level security;

drop policy if exists "daily_snapshot_select" on public.daily_snapshot;
create policy "daily_snapshot_select" on public.daily_snapshot
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "daily_snapshot_write" on public.daily_snapshot;
create policy "daily_snapshot_write" on public.daily_snapshot
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Alarmlar
-- ---------------------------------------------------------------------

create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,

  /** gorunurluk_dususu | kelime_dususu | kelime_kazanimi | url_dususu | yeni_firsat */
  tur         text not null,
  onem        text not null default 'bilgi' check (onem in ('kritik', 'uyari', 'bilgi', 'olumlu')),
  baslik      text not null,
  detay       text,
  /** Sayısal değişim — arayüzde vurgulanır. */
  deger       numeric(12,2),
  birim       text,
  /** İlgili kelime veya adresler. */
  ogeler      jsonb not null default '[]'::jsonb,
  href        text,

  gun         date not null default current_date,
  okundu      boolean not null default false,
  created_at  timestamptz not null default now(),

  unique (project_id, tur, gun)
);

create index if not exists alerts_project_idx on public.alerts (project_id, gun desc, onem);

alter table public.alerts enable row level security;

drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select" on public.alerts
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "alerts_write" on public.alerts;
create policy "alerts_write" on public.alerts
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Alarm eşikleri — kod dağıtmadan ayarlanabilir
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'alarm_esikleri',
    '{
      "gorunurluk_dusus_yuzde": 8,
      "kelime_dusus_sira": 10,
      "kelime_dusus_adet": 3,
      "url_dusus_sira": 5,
      "yeni_kelime_adet": 5
    }'::jsonb,
    'Günlük alarm üretimi için eşik değerleri. Bu değerlerin altındaki değişimler gürültü sayılır.'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
