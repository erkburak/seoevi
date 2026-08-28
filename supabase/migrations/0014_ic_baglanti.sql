-- ---------------------------------------------------------------------
-- İç bağlantı zekâsı
--
-- İç bağlantı, SEO'da en çok bilinen ama en az uygulanan iştir: ücretsiz,
-- tamamen kendi kontrolünüzde ve etkisi hızlıdır. Sorun bulmakta değil,
-- NEREDEN NEREYE bağlantı verileceğine karar vermektedir. Binlerce sayfalı
-- bir e-ticaret sitesinde bunu elle yapmak imkânsızdır.
--
-- Öneri üretebilmek için önce mevcut bağlantı grafiği gerekir; aksi hâlde
-- zaten var olan bağlantılar önerilir. Grafik, site taramasıyla birlikte
-- ücretsiz olarak (/on_page/links) çekilir.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Mevcut bağlantı grafiği
-- ---------------------------------------------------------------------

create table if not exists public.internal_links (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,

  kaynak_url   text not null,
  hedef_url    text not null,
  /** Örnek bağlantı metni; aynı çift için birden çok metin varsa ilki. */
  anchor       text,
  /** Aynı çift arasındaki bağlantı sayısı. */
  link_sayisi  integer not null default 1,
  dofollow     boolean not null default true,

  fetched_at   timestamptz not null default now(),

  unique (project_id, kaynak_url, hedef_url)
);

create index if not exists internal_links_hedef_idx
  on public.internal_links (project_id, hedef_url);
create index if not exists internal_links_kaynak_idx
  on public.internal_links (project_id, kaynak_url);

alter table public.internal_links enable row level security;

create policy "internal_links_select" on public.internal_links
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

create policy "internal_links_write" on public.internal_links
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Üretilen bağlantı önerileri
-- ---------------------------------------------------------------------

create table if not exists public.link_suggestions (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,

  /** Bağlantının ekleneceği sayfa. */
  kaynak_url     text not null,
  /** Bağlantının işaret edeceği sayfa. */
  hedef_url      text not null,

  /** Hedef sayfanın güçlendirilmek istenen kelimesi. */
  keyword        text,
  /** Önerilen bağlantı metni. */
  anchor_metni   text not null,

  skor           integer not null default 0,
  gerekce        text,

  hedef_pozisyon numeric(6,2),
  hedef_hacim    integer,

  durum          text not null default 'yeni'
                 check (durum in ('yeni','uygulandi','yoksayildi')),

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  unique (project_id, kaynak_url, hedef_url)
);

create index if not exists link_suggestions_sira_idx
  on public.link_suggestions (project_id, durum, skor desc);
create index if not exists link_suggestions_hedef_idx
  on public.link_suggestions (project_id, hedef_url);

drop trigger if exists link_suggestions_updated_at on public.link_suggestions;
create trigger link_suggestions_updated_at before update on public.link_suggestions
  for each row execute function public.set_updated_at();

alter table public.link_suggestions enable row level security;

create policy "link_suggestions_select" on public.link_suggestions
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

create policy "link_suggestions_write" on public.link_suggestions
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));
