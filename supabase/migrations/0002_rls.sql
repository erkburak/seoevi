-- =====================================================================
-- SEO Evi — Satır Seviyesi Güvenlik (RLS)
--
-- Kural: Her kullanıcı yalnızca kendi verisine erişir.
-- Proje kapsamlı tablolar public.is_project_owner() üzerinden izole edilir.
-- api_cache ve analytics_events yalnızca sunucu (service role) tarafından
-- kullanılır; hiçbir politika tanımlanmadığı için istemciye kapalıdır.
-- =====================================================================

alter table public.plans              enable row level security;
alter table public.app_config         enable row level security;
alter table public.profiles           enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.usage              enable row level security;
alter table public.projects           enable row level security;
alter table public.project_settings   enable row level security;
alter table public.competitors        enable row level security;
alter table public.keywords           enable row level security;
alter table public.keyword_rankings   enable row level security;
alter table public.keyword_opportunities enable row level security;
alter table public.serp_results       enable row level security;
alter table public.serp_features      enable row level security;
alter table public.pages              enable row level security;
alter table public.page_audits        enable row level security;
alter table public.technical_issues   enable row level security;
alter table public.products           enable row level security;
alter table public.categories         enable row level security;
alter table public.merchant_audits    enable row level security;
alter table public.referring_domains  enable row level security;
alter table public.backlinks          enable row level security;
alter table public.content_analysis   enable row level security;
alter table public.content_opportunities enable row level security;
alter table public.ai_visibility      enable row level security;
alter table public.ai_mentions        enable row level security;
alter table public.seo_actions        enable row level security;
alter table public.reports            enable row level security;
alter table public.audit_jobs         enable row level security;
alter table public.audit_history      enable row level security;
alter table public.notifications      enable row level security;
alter table public.analytics_events   enable row level security;
alter table public.api_cache          enable row level security;

-- ---------------------------------------------------------------------
-- Herkese açık okuma: planlar ve yapılandırma
-- ---------------------------------------------------------------------

drop policy if exists "planlar_herkes_okur" on public.plans;
create policy "planlar_herkes_okur" on public.plans
  for select using (is_public = true);

drop policy if exists "yapilandirma_okuma" on public.app_config;
create policy "yapilandirma_okuma" on public.app_config
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Profiller
-- ---------------------------------------------------------------------

drop policy if exists "profil_kendi_okur" on public.profiles;
create policy "profil_kendi_okur" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profil_kendi_gunceller" on public.profiles;
create policy "profil_kendi_gunceller" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profil_kendi_olusturur" on public.profiles;
create policy "profil_kendi_olusturur" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- ---------------------------------------------------------------------
-- Abonelik ve kullanım — yalnızca okuma (yazma sunucu tarafında)
-- ---------------------------------------------------------------------

drop policy if exists "abonelik_kendi_okur" on public.subscriptions;
create policy "abonelik_kendi_okur" on public.subscriptions
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "kullanim_kendi_okur" on public.usage;
create policy "kullanim_kendi_okur" on public.usage
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Projeler
-- ---------------------------------------------------------------------

drop policy if exists "proje_kendi_okur" on public.projects;
create policy "proje_kendi_okur" on public.projects
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "proje_kendi_olusturur" on public.projects;
create policy "proje_kendi_olusturur" on public.projects
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "proje_kendi_gunceller" on public.projects;
create policy "proje_kendi_gunceller" on public.projects
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "proje_kendi_siler" on public.projects;
create policy "proje_kendi_siler" on public.projects
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Proje kapsamlı tablolar
-- ---------------------------------------------------------------------

do $$
declare
  t text;
  proje_tablolari text[] := array[
    'competitors','keywords','keyword_rankings','keyword_opportunities',
    'serp_results','serp_features','pages','page_audits','technical_issues',
    'products','categories','merchant_audits','referring_domains','backlinks',
    'content_analysis','content_opportunities','ai_visibility','ai_mentions',
    'seo_actions','audit_history'
  ];
begin
  foreach t in array proje_tablolari loop
    execute format('drop policy if exists %I on public.%I', t || '_proje_erisimi', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (public.is_project_owner(project_id))
         with check (public.is_project_owner(project_id))',
      t || '_proje_erisimi', t
    );
  end loop;
end;
$$;

drop policy if exists "proje_ayarlari_erisimi" on public.project_settings;
create policy "proje_ayarlari_erisimi" on public.project_settings
  for all to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Raporlar
-- ---------------------------------------------------------------------

drop policy if exists "rapor_erisimi" on public.reports;
create policy "rapor_erisimi" on public.reports
  for all to authenticated
  using (user_id = auth.uid() and public.is_project_owner(project_id))
  with check (user_id = auth.uid() and public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- İşler — kullanıcı yalnızca okur, oluşturma sunucu tarafında
-- ---------------------------------------------------------------------

drop policy if exists "is_kendi_okur" on public.audit_jobs;
create policy "is_kendi_okur" on public.audit_jobs
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Bildirimler
-- ---------------------------------------------------------------------

drop policy if exists "bildirim_kendi_okur" on public.notifications;
create policy "bildirim_kendi_okur" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "bildirim_kendi_gunceller" on public.notifications;
create policy "bildirim_kendi_gunceller" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "bildirim_kendi_siler" on public.notifications;
create policy "bildirim_kendi_siler" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Yetkili rolü — aynı uygulama içindeki /yetkili alanı için
-- ---------------------------------------------------------------------

create or replace function public.is_yetkili()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'yetkili'
  );
$$;

drop policy if exists "planlar_yetkili_yonetir" on public.plans;
create policy "planlar_yetkili_yonetir" on public.plans
  for all to authenticated using (public.is_yetkili()) with check (public.is_yetkili());

drop policy if exists "yapilandirma_yetkili_yonetir" on public.app_config;
create policy "yapilandirma_yetkili_yonetir" on public.app_config
  for all to authenticated using (public.is_yetkili()) with check (public.is_yetkili());
