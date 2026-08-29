-- ---------------------------------------------------------------------
-- AI görünürlüğü — gerçek ölçüme geçiş
--
-- Önceki hâli marka adını web genelinde aratıp bahis sayıyordu. Bu ölçü
-- yanıltıcıydı: "gursoy" araması Türkçe web'deki soyadı geçişlerini marka
-- bahsi sanıyor, görünürlük olduğundan yüksek çıkıyordu.
--
-- Yerine sağlayıcının AI Optimization verisi kullanılır: yapay zekânın
-- gerçekte verdiği cevaplar, o cevaplardaki sorular ve gösterilen kaynak
-- siteler. Bu veri çağrı başına $0,10 — SERP'in elli katı. Bu yüzden
-- yalnızca üst paketlerde açıktır ve takip edilen soru sayısı sınırlıdır.
--
-- Aylık maliyet (2 genel çağrı + N takip sorusu):
--   profesyonel  3 soru → ~24 TL  (paket COGS %23,4)
--   kurumsal     7 soru → ~44 TL  (paket COGS %25,1)
-- ---------------------------------------------------------------------

update public.plans
set limits = limits || jsonb_build_object('ai_gorunurlugu', false, 'ai_takip_sorusu', 0)
where id in ('deneme', 'baslangic');

update public.plans
set limits = limits || jsonb_build_object('ai_gorunurlugu', true, 'ai_takip_sorusu', 3)
where id = 'profesyonel';

update public.plans
set limits = limits || jsonb_build_object('ai_gorunurlugu', true, 'ai_takip_sorusu', 7)
where id = 'kurumsal';

update public.plans
set limits = limits || jsonb_build_object('ai_gorunurlugu', true, 'ai_takip_sorusu', 25)
where id = 'konusalim';

-- ---------------------------------------------------------------------
-- Kullanıcının takip ettiği sorular
-- ---------------------------------------------------------------------

create table if not exists public.ai_tracked_queries (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,

  /** Kullanıcının izlemek istediği soru. */
  soru        text not null,

  /** Son ölçümün özeti — her görüntülemede sağlayıcıya gidilmez. */
  gorunuyor_mu   boolean,
  cevap_sayisi   integer not null default 0,
  ai_arama_hacmi integer not null default 0,
  /** Bu soruda yapay zekânın gösterdiği kaynak siteler. */
  kaynaklar      jsonb not null default '[]'::jsonb,
  ornek_soru     text,
  ornek_cevap    text,

  olculdu_at  timestamptz,
  created_at  timestamptz not null default now(),

  unique (project_id, soru)
);

create index if not exists ai_tracked_queries_proje_idx
  on public.ai_tracked_queries (project_id, created_at desc);

alter table public.ai_tracked_queries enable row level security;

create policy "ai_tracked_queries_select" on public.ai_tracked_queries
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

create policy "ai_tracked_queries_write" on public.ai_tracked_queries
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Yapay zekâ cevaplarında görünme kayıtları
-- ---------------------------------------------------------------------

create table if not exists public.ai_answers (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,

  platform     text,
  model_name   text,
  soru         text not null,
  cevap        text,
  /** Cevapta gösterilen kaynak siteler. */
  kaynaklar    jsonb not null default '[]'::jsonb,
  /** Kendi alan adımız bu cevapta kaynak olarak gösterilmiş mi? */
  bizde_var_mi boolean not null default false,
  ai_arama_hacmi integer not null default 0,
  /** Cevap web aramasına mı dayanıyor, modelin bilgisine mi? */
  web_aramali  boolean,

  fetched_at   timestamptz not null default now(),

  unique (project_id, soru, model_name)
);

create index if not exists ai_answers_proje_idx
  on public.ai_answers (project_id, ai_arama_hacmi desc);

alter table public.ai_answers enable row level security;

create policy "ai_answers_select" on public.ai_answers
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

create policy "ai_answers_write" on public.ai_answers
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));
