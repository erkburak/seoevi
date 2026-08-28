-- ---------------------------------------------------------------------
-- Pazaryeri Radarı ve stok–sıralama çakışması
--
-- Türkiye'de bir e-ticaret sitesinin en büyük SEO rakibi genellikle
-- başka bir mağaza değil, kendi ürününü de satan pazaryeridir. Aynı
-- ürün için Trendyol üstte çıktığında satış komisyonlu kanala kayar.
--
-- Bu tablo, takip edilen her kelimede hangi pazaryerinin nerede
-- olduğunu ve kullanıcıya göre konumunu saklar. Veri mevcut SERP
-- kayıtlarından üretilir; ek sağlayıcı çağrısı yapılmaz.
-- ---------------------------------------------------------------------

create table if not exists public.marketplace_presence (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  keyword_id     uuid references public.keywords(id) on delete set null,
  keyword        text not null,

  /** Bizim organik sıramız; ilk 100'de yoksa null. */
  bizim_pozisyon integer,

  /**
   * İlk 20 içindeki bilinen oyuncular:
   * [{ alan_adi, ad, tur, pozisyon, ustumuzde }]
   */
  oyuncular      jsonb not null default '[]'::jsonb,

  /** Bizden üstte olan pazaryeri sayısı. */
  ustumuzdeki_pazaryeri integer not null default 0,
  /** Bizden üstte olan tüm bilinen oyuncular. */
  ustumuzdeki_oyuncu    integer not null default 0,

  /**
   * 0-100. Bu kelimede pazaryeri baskısı ne kadar yüksek?
   * Oyuncu türü, sayısı ve bize göre konumundan hesaplanır.
   */
  baski_skoru    integer not null default 0,

  /** Kelimenin aylık arama hacmi — önceliklendirme için. */
  arama_hacmi    integer,
  /** Bu kelimede kaybedilen tahmini aylık ziyaret. */
  kayip_tahmini  numeric(12,2) not null default 0,

  device         text not null default 'desktop' check (device in ('desktop','mobile')),
  olculdu_at     timestamptz not null default now(),

  unique (project_id, keyword, device)
);

create index if not exists marketplace_presence_project_idx
  on public.marketplace_presence (project_id, baski_skoru desc);

create index if not exists marketplace_presence_kayip_idx
  on public.marketplace_presence (project_id, kayip_tahmini desc);

alter table public.marketplace_presence enable row level security;

drop policy if exists "marketplace_presence_select" on public.marketplace_presence;
create policy "marketplace_presence_select" on public.marketplace_presence
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "marketplace_presence_write" on public.marketplace_presence;
create policy "marketplace_presence_write" on public.marketplace_presence
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Ürün stok geçmişi
--
-- Sıralanan bir ürünün stoğu tükendiğinde, o sayfaya gelen trafik
-- satışa dönüşmez ve zamanla sıralama da düşer. Bu tablo stok
-- değişimlerini izleyerek "sıralanıyor ama satılamıyor" durumunu
-- yakalar.
-- ---------------------------------------------------------------------

create table if not exists public.product_stock_history (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  availability text,
  price        numeric(12,2),
  created_at   timestamptz not null default now()
);

create index if not exists product_stock_history_idx
  on public.product_stock_history (product_id, created_at desc);

alter table public.product_stock_history enable row level security;

drop policy if exists "product_stock_history_select" on public.product_stock_history;
create policy "product_stock_history_select" on public.product_stock_history
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "product_stock_history_write" on public.product_stock_history;
create policy "product_stock_history_write" on public.product_stock_history
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Proje istatistiklerine yeni alanlar
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'pazaryeri_radari',
    '{"analiz_kelime_siniri": 300, "baski_esigi": 40}'::jsonb,
    'Pazaryeri radarında incelenecek azami kelime sayısı ve aksiyon üretilecek baskı skoru eşiği.'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
