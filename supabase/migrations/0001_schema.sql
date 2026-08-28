-- =====================================================================
-- SEO Evi — Temel şema
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- Ortak yardımcılar
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Planlar (paketler) — fiyat ve limitler veritabanından yönetilir
-- ---------------------------------------------------------------------

create table if not exists public.plans (
  id                text primary key,               -- 'baslangic', 'profesyonel', 'kurumsal', 'konusalim'
  name              text not null,
  headline          text not null,
  description       text not null,
  audience          text not null,                  -- "Kimler için"
  price_monthly     numeric(10,2),                  -- null => "Konuşalım"
  price_yearly      numeric(10,2),
  currency          text not null default 'TRY',
  is_custom         boolean not null default false,
  is_public         boolean not null default true,
  is_featured       boolean not null default false,
  trial_days        integer not null default 0,
  sort_order        integer not null default 0,
  features          jsonb not null default '[]'::jsonb,
  limits            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
drop trigger if exists plans_updated_at on public.plans;
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Uygulama yapılandırması (skor ağırlıkları, önbellek süreleri vb.)
-- ---------------------------------------------------------------------

create table if not exists public.app_config (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
drop trigger if exists app_config_updated_at on public.app_config;
create trigger app_config_updated_at before update on public.app_config
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text,
  email           text,
  avatar_url      text,
  phone           text,
  company         text,
  role            text not null default 'kullanici' check (role in ('kullanici', 'yetkili')),
  onboarded_at    timestamptz,
  onboarding_step integer not null default 0,
  marketing_opt_in boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Abonelikler ve kullanım
-- ---------------------------------------------------------------------

create table if not exists public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references auth.users(id) on delete cascade,
  plan_id               text not null references public.plans(id),
  status                text not null default 'deneme'
                        check (status in ('deneme', 'aktif', 'gecikmis', 'iptal', 'sona_erdi')),
  provider              text,                     -- 'iyzico' | 'stripe' | 'paddle' | null
  provider_customer_id  text,
  provider_subscription_id text,
  trial_ends_at         timestamptz,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean not null default false,
  canceled_at           timestamptz,
  limit_overrides       jsonb not null default '{}'::jsonb,
  metadata              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Aylık kullanım sayaçları
create table if not exists public.usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  period      text not null,                       -- 'YYYY-MM'
  metric      text not null,                       -- 'serp' | 'site_taramasi' | 'keyword' | 'ai' | ...
  used        integer not null default 0,
  updated_at  timestamptz not null default now(),
  unique (user_id, period, metric)
);
create index if not exists usage_user_period_idx on public.usage (user_id, period);

-- Yeni kullanıcı için profil + deneme aboneliği
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

  select coalesce(trial_days, 7) into v_trial_days from public.plans where id = 'baslangic';

  insert into public.subscriptions (user_id, plan_id, status, trial_ends_at, current_period_start, current_period_end)
  values (
    new.id,
    'baslangic',
    'deneme',
    now() + make_interval(days => coalesce(v_trial_days, 7)),
    now(),
    now() + make_interval(days => coalesce(v_trial_days, 7))
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Projeler
-- ---------------------------------------------------------------------

create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  domain           text not null,                  -- normalize edilmiş: ornek.com
  url              text not null,                  -- https://ornek.com
  site_type        text not null default 'eticaret'
                   check (site_type in ('eticaret','kurumsal','hizmet','blog','pazaryeri','diger')),
  primary_goal     text,
  industry         text,
  country_code     text not null default 'TR',
  location_code    integer,                        -- DataForSEO location_code
  location_name    text,
  language_code    text not null default 'tr',
  language_name    text not null default 'Turkish',
  favicon_url      text,
  last_audit_at    timestamptz,
  scores           jsonb not null default '{}'::jsonb,
  stats            jsonb not null default '{}'::jsonb,
  is_deleted       boolean not null default false,
  deleted_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists projects_user_idx on public.projects (user_id) where is_deleted = false;
create unique index if not exists projects_user_domain_uniq
  on public.projects (user_id, domain) where is_deleted = false;
drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_settings (
  project_id        uuid primary key references public.projects(id) on delete cascade,
  device            text not null default 'desktop' check (device in ('desktop','mobile')),
  auto_audit        boolean not null default true,
  audit_frequency   text not null default 'haftalik'
                    check (audit_frequency in ('gunluk','haftalik','aylik','manuel')),
  max_crawl_pages   integer not null default 200,
  product_url_pattern  text,
  category_url_pattern text,
  notification_prefs jsonb not null default '{"email":true,"uygulama":true}'::jsonb,
  updated_at        timestamptz not null default now()
);
drop trigger if exists project_settings_updated_at on public.project_settings;
create trigger project_settings_updated_at before update on public.project_settings
  for each row execute function public.set_updated_at();

-- Proje sahipliği kontrolü — RLS politikalarında kullanılır
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- Rakipler
-- ---------------------------------------------------------------------

create table if not exists public.competitors (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  domain         text not null,
  name           text,
  source         text not null default 'manuel' check (source in ('manuel','otomatik')),
  is_active      boolean not null default true,
  metrics        jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (project_id, domain)
);
create index if not exists competitors_project_idx on public.competitors (project_id);

-- ---------------------------------------------------------------------
-- Anahtar kelimeler
-- ---------------------------------------------------------------------

create table if not exists public.keywords (
  id                 uuid primary key default gen_random_uuid(),
  project_id         uuid not null references public.projects(id) on delete cascade,
  keyword            text not null,
  search_volume      integer,
  cpc                numeric(10,2),
  competition        numeric(4,3),
  competition_level  text,
  difficulty         integer,
  intent             text check (intent in ('bilgi','ticari','islem','gezinme') or intent is null),
  trend              jsonb not null default '[]'::jsonb,
  is_tracked         boolean not null default false,
  source             text not null default 'arastirma',
  location_code      integer,
  language_code      text default 'tr',
  last_refreshed_at  timestamptz,
  created_at         timestamptz not null default now(),
  unique (project_id, keyword)
);
create index if not exists keywords_project_idx on public.keywords (project_id);
create index if not exists keywords_volume_idx on public.keywords (project_id, search_volume desc nulls last);
create index if not exists keywords_text_idx on public.keywords using gin (keyword gin_trgm_ops);

create table if not exists public.keyword_rankings (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  keyword_id    uuid not null references public.keywords(id) on delete cascade,
  domain        text not null,
  is_competitor boolean not null default false,
  position      integer,
  previous_position integer,
  url           text,
  device        text not null default 'desktop' check (device in ('desktop','mobile')),
  etv           numeric(12,2),
  checked_at    timestamptz not null default now()
);
create index if not exists keyword_rankings_kw_idx on public.keyword_rankings (keyword_id, checked_at desc);
create index if not exists keyword_rankings_project_idx on public.keyword_rankings (project_id, checked_at desc);

create table if not exists public.keyword_opportunities (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  keyword_id        uuid not null references public.keywords(id) on delete cascade,
  score             integer not null check (score between 0 and 100),
  potential_traffic integer,
  current_position  integer,
  target_position   integer,
  reason            text,
  signals           jsonb not null default '{}'::jsonb,
  opportunity_type  text not null default 'genel'
                    check (opportunity_type in ('genel','urun','kategori','icerik','rakip_acigi','hizli_kazanim')),
  status            text not null default 'acik' check (status in ('acik','degerlendiriliyor','kapatildi')),
  created_at        timestamptz not null default now(),
  unique (project_id, keyword_id, opportunity_type)
);
create index if not exists keyword_opps_project_idx on public.keyword_opportunities (project_id, score desc);

-- ---------------------------------------------------------------------
-- SERP
-- ---------------------------------------------------------------------

create table if not exists public.serp_results (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  keyword_id     uuid references public.keywords(id) on delete cascade,
  keyword        text not null,
  device         text not null default 'desktop' check (device in ('desktop','mobile')),
  location_code  integer,
  language_code  text default 'tr',
  se_results_count bigint,
  items          jsonb not null default '[]'::jsonb,
  fetched_at     timestamptz not null default now()
);
create index if not exists serp_results_project_idx on public.serp_results (project_id, fetched_at desc);
create index if not exists serp_results_keyword_idx on public.serp_results (keyword_id, device, fetched_at desc);

create table if not exists public.serp_features (
  id           uuid primary key default gen_random_uuid(),
  serp_id      uuid not null references public.serp_results(id) on delete cascade,
  project_id   uuid not null references public.projects(id) on delete cascade,
  feature_type text not null,
  position     integer,
  owned        boolean not null default false,
  data         jsonb not null default '{}'::jsonb
);
create index if not exists serp_features_serp_idx on public.serp_features (serp_id);

-- ---------------------------------------------------------------------
-- Sayfalar ve teknik SEO
-- ---------------------------------------------------------------------

create table if not exists public.pages (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  url               text not null,
  path              text,
  page_type         text not null default 'diger'
                    check (page_type in ('anasayfa','urun','kategori','icerik','diger')),
  status_code       integer,
  title             text,
  title_length      integer,
  meta_description  text,
  meta_description_length integer,
  h1                text,
  h1_count          integer,
  h2_count          integer,
  word_count        integer,
  internal_links_count integer,
  external_links_count integer,
  images_count      integer,
  images_without_alt integer,
  canonical_url     text,
  is_indexable      boolean,
  click_depth       integer,
  is_orphan         boolean not null default false,
  has_schema        boolean not null default false,
  schema_types      jsonb not null default '[]'::jsonb,
  load_time_ms      integer,
  onpage_score      numeric(5,2),
  seo_score         integer,
  checks            jsonb not null default '{}'::jsonb,
  last_crawled_at   timestamptz,
  created_at        timestamptz not null default now(),
  unique (project_id, url)
);
create index if not exists pages_project_idx on public.pages (project_id);
create index if not exists pages_type_idx on public.pages (project_id, page_type);

create table if not exists public.page_audits (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  page_id       uuid not null references public.pages(id) on delete cascade,
  score         integer,
  issues_count  integer not null default 0,
  breakdown     jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists page_audits_page_idx on public.page_audits (page_id, created_at desc);

create table if not exists public.technical_issues (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  page_id      uuid references public.pages(id) on delete cascade,
  url          text,
  code         text not null,
  category     text not null,
  severity     text not null check (severity in ('kritik','uyari','bilgi')),
  title        text not null,
  description  text,
  recommendation text,
  impact       text not null default 'orta' check (impact in ('cok_yuksek','yuksek','orta','dusuk')),
  status       text not null default 'acik' check (status in ('acik','duzeltiliyor','cozuldu','yoksayildi')),
  detected_at  timestamptz not null default now(),
  resolved_at  timestamptz,
  data         jsonb not null default '{}'::jsonb
);
create index if not exists tech_issues_project_idx on public.technical_issues (project_id, status, severity);
create index if not exists tech_issues_page_idx on public.technical_issues (page_id);

-- ---------------------------------------------------------------------
-- E-ticaret: ürünler, kategoriler, merchant
-- ---------------------------------------------------------------------

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  page_id           uuid references public.pages(id) on delete set null,
  url               text not null,
  name              text,
  brand             text,
  price             numeric(12,2),
  currency          text default 'TRY',
  availability      text,
  gtin              text,
  mpn               text,
  sku               text,
  rating            numeric(3,2),
  reviews_count     integer,
  images_count      integer,
  has_product_schema boolean not null default false,
  has_breadcrumb    boolean not null default false,
  description_length integer,
  specs_count       integer,
  seo_score         integer,
  checks            jsonb not null default '{}'::jsonb,
  last_analyzed_at  timestamptz,
  created_at        timestamptz not null default now(),
  unique (project_id, url)
);
create index if not exists products_project_idx on public.products (project_id);
create index if not exists products_score_idx on public.products (project_id, seo_score asc nulls last);

create table if not exists public.categories (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  page_id           uuid references public.pages(id) on delete set null,
  url               text not null,
  name              text,
  product_count     integer,
  subcategory_count integer,
  description_length integer,
  internal_links_count integer,
  target_keyword    text,
  seo_score         integer,
  checks            jsonb not null default '{}'::jsonb,
  last_analyzed_at  timestamptz,
  created_at        timestamptz not null default now(),
  unique (project_id, url)
);
create index if not exists categories_project_idx on public.categories (project_id);

create table if not exists public.merchant_audits (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  product_id     uuid references public.products(id) on delete cascade,
  health_score   integer,
  missing_fields jsonb not null default '[]'::jsonb,
  shopping_visible boolean not null default false,
  shopping_position integer,
  seller_count   integer,
  price_position text,
  competitors    jsonb not null default '[]'::jsonb,
  data           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists merchant_audits_project_idx on public.merchant_audits (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Geri bağlantılar
-- ---------------------------------------------------------------------

create table if not exists public.referring_domains (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  domain          text not null,
  target_domain   text not null,
  is_competitor   boolean not null default false,
  rank            integer,
  backlinks_count integer,
  first_seen      timestamptz,
  lost_at         timestamptz,
  is_lost         boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (project_id, domain, target_domain)
);
create index if not exists ref_domains_project_idx on public.referring_domains (project_id);

create table if not exists public.backlinks (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  referring_domain_id uuid references public.referring_domains(id) on delete cascade,
  source_url          text not null,
  target_url          text,
  anchor              text,
  is_dofollow         boolean not null default true,
  rank                integer,
  first_seen          timestamptz,
  last_seen           timestamptz,
  is_lost             boolean not null default false,
  is_new              boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists backlinks_project_idx on public.backlinks (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- İçerik analizi
-- ---------------------------------------------------------------------

create table if not exists public.content_analysis (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  keyword        text not null,
  search_intent  text,
  avg_word_count integer,
  common_topics  jsonb not null default '[]'::jsonb,
  headings       jsonb not null default '[]'::jsonb,
  questions      jsonb not null default '[]'::jsonb,
  semantic_terms jsonb not null default '[]'::jsonb,
  competitor_pages jsonb not null default '[]'::jsonb,
  gaps           jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists content_analysis_project_idx on public.content_analysis (project_id, created_at desc);

create table if not exists public.content_opportunities (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  analysis_id    uuid references public.content_analysis(id) on delete cascade,
  keyword        text not null,
  title_suggestion text,
  outline        jsonb not null default '[]'::jsonb,
  questions      jsonb not null default '[]'::jsonb,
  internal_links jsonb not null default '[]'::jsonb,
  estimated_traffic integer,
  difficulty     integer,
  status         text not null default 'acik' check (status in ('acik','planlandi','yazildi','yayinlandi')),
  created_at     timestamptz not null default now()
);
create index if not exists content_opps_project_idx on public.content_opportunities (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- AI görünürlüğü
-- ---------------------------------------------------------------------

create table if not exists public.ai_visibility (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  score             integer check (score between 0 and 100),
  brand_visibility  integer,
  content_trust     integer,
  topic_authority   integer,
  product_visibility integer,
  question_coverage integer,
  breakdown         jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists ai_visibility_project_idx on public.ai_visibility (project_id, created_at desc);

create table if not exists public.ai_mentions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  query         text not null,
  mention_type  text not null default 'marka' check (mention_type in ('marka','urun','icerik')),
  is_mentioned  boolean not null default false,
  position      integer,
  source        text,
  context       text,
  competitors_mentioned jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists ai_mentions_project_idx on public.ai_mentions (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Aksiyon merkezi
-- ---------------------------------------------------------------------

create table if not exists public.seo_actions (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  title          text not null,
  description    text,
  recommendation text,
  category       text not null,
  priority       text not null default 'orta' check (priority in ('kritik','yuksek','orta','dusuk')),
  impact         text not null default 'orta' check (impact in ('cok_yuksek','yuksek','orta','dusuk')),
  effort         text not null default 'orta' check (effort in ('kolay','orta','zor')),
  status         text not null default 'bekliyor' check (status in ('bekliyor','devam_ediyor','tamamlandi','yoksayildi')),
  affected_count integer not null default 1,
  source_urls    jsonb not null default '[]'::jsonb,
  data           jsonb not null default '{}'::jsonb,
  ai_suggestion  jsonb,
  dedupe_key     text,
  due_at         timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists seo_actions_project_idx on public.seo_actions (project_id, status, priority);
create unique index if not exists seo_actions_dedupe_uniq
  on public.seo_actions (project_id, dedupe_key) where dedupe_key is not null;
drop trigger if exists seo_actions_updated_at on public.seo_actions;
create trigger seo_actions_updated_at before update on public.seo_actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Raporlar
-- ---------------------------------------------------------------------

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  period_start timestamptz,
  period_end   timestamptz,
  sections     jsonb not null default '[]'::jsonb,
  snapshot     jsonb not null default '{}'::jsonb,
  status       text not null default 'hazir' check (status in ('hazirlaniyor','hazir','hatali')),
  created_at   timestamptz not null default now()
);
create index if not exists reports_project_idx on public.reports (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- İşler (job queue) ve geçmiş
-- ---------------------------------------------------------------------

create table if not exists public.audit_jobs (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  job_type       text not null,
  provider       text not null default 'dataforseo',
  provider_task_id text,
  status         text not null default 'bekliyor'
                 check (status in ('bekliyor','isleniyor','tamamlandi','hatali','yeniden_deneniyor','iptal')),
  progress       integer not null default 0 check (progress between 0 and 100),
  steps          jsonb not null default '[]'::jsonb,
  attempts       integer not null default 0,
  max_attempts   integer not null default 3,
  next_attempt_at timestamptz,
  params         jsonb not null default '{}'::jsonb,
  error          text,
  error_code     text,
  raw_data       jsonb,
  normalized_data jsonb,
  created_at     timestamptz not null default now(),
  started_at     timestamptz,
  completed_at   timestamptz,
  updated_at     timestamptz not null default now()
);
create index if not exists audit_jobs_project_idx on public.audit_jobs (project_id, created_at desc);
create index if not exists audit_jobs_status_idx on public.audit_jobs (status, next_attempt_at);
drop trigger if exists audit_jobs_updated_at on public.audit_jobs;
create trigger audit_jobs_updated_at before update on public.audit_jobs
  for each row execute function public.set_updated_at();

create table if not exists public.audit_history (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  job_id      uuid references public.audit_jobs(id) on delete set null,
  scores      jsonb not null default '{}'::jsonb,
  stats       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_history_project_idx on public.audit_history (project_id, created_at desc);

-- ---------------------------------------------------------------------
-- Bildirimler
-- ---------------------------------------------------------------------

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  project_id  uuid references public.projects(id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  href        text,
  severity    text not null default 'bilgi' check (severity in ('bilgi','basari','uyari','kritik')),
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------------------
-- Olay kaydı (ürün analitiği)
-- ---------------------------------------------------------------------

create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,
  event       text not null,
  source      text,
  properties  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists analytics_events_idx on public.analytics_events (event, created_at desc);

-- ---------------------------------------------------------------------
-- API önbelleği — yalnızca sunucu tarafından erişilir
-- ---------------------------------------------------------------------

create table if not exists public.api_cache (
  cache_key   text primary key,
  provider    text not null default 'dataforseo',
  endpoint    text not null,
  payload     jsonb not null,
  cost        numeric(10,4),
  hit_count   integer not null default 0,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);
create index if not exists api_cache_expires_idx on public.api_cache (expires_at);

create or replace function public.purge_expired_cache()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  delete from public.api_cache where expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Kullanım sayacı — atomik artırım
-- ---------------------------------------------------------------------

create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  insert into public.usage (user_id, period, metric, used)
  values (p_user_id, to_char(now(), 'YYYY-MM'), p_metric, p_amount)
  on conflict (user_id, period, metric)
  do update set used = public.usage.used + p_amount, updated_at = now()
  returning used into v_used;
  return v_used;
end;
$$;
