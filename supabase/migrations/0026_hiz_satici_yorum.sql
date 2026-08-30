-- ---------------------------------------------------------------------
-- Sayfa hızı, satıcı karşılaştırması ve işletme yorumları
--
-- Üç yeni veri kaynağı ücretli pakete ekleniyor. Hepsinin birim maliyeti
-- sağlayıcıya gerçek istek atılarak ölçüldü:
--
--   on_page/lighthouse          $0.005   sayfa başına
--   merchant/google/sellers     $0.001   ürün başına
--   business_data/google/reviews $0.00075 çağrı başına
--
-- 1) SAYFA HIZI
--    Ürünün en büyük ölçüm boşluğuydu: hiçbir yerde hız ölçülmüyordu.
--    Oysa Çekirdek Web Verileri hem sıralama sinyali hem de doğrudan
--    dönüşüm konusu. Ölçüm mobil koşullarda yapılır.
--
-- 2) SATICI TEKLİFLERİ
--    Fiyat konumu şu ana kadar Alışveriş sonuçlarını tarayarak tahmin
--    ediliyordu. `sellers` ucu belirli bir ürünü satan satıcıları ve
--    fiyatlarını doğrudan verir; karşılaştırma tahmin olmaktan çıkar.
--
-- 3) İŞLETME YORUMLARI
--    Google İşletme kaydındaki puan ve yorumlar. ÖNEMLİ: bu veri Google
--    İşletme/Haritalar kaydı gerektirir; yalnızca çevrim içi satan ve
--    kaydı olmayan mağazalarda sonuç dönmez. Bu yüzden işletme adı
--    projeye elle girilir ve kayıt bulunamazsa modül boş veri uydurmaz,
--    durumu açıkça söyler.
-- ---------------------------------------------------------------------

/* ------------------------------ Sayfa hızı ------------------------------ */

create table if not exists public.sayfa_hizi (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  page_id         uuid references public.pages(id) on delete set null,
  url             text not null,
  -- Mobil ve masaüstü skorları belirgin biçimde ayrışır; ayrı tutulur.
  mobil           boolean not null default true,

  -- 0-100 arası Lighthouse skorları.
  performans      integer,
  erisilebilirlik integer,
  en_iyi_uygulama integer,
  seo_skoru       integer,

  -- Çekirdek Web Verileri. Milisaniye; CLS birimsizdir.
  lcp_ms          integer,
  cls             numeric(6,3),
  tbt_ms          integer,
  fcp_ms          integer,
  hiz_endeksi_ms  integer,
  ttfb_ms         integer,

  /* Türkçeleştirilmiş bulgular; arayüz bunu olduğu gibi gösterir. */
  bulgular        jsonb not null default '[]'::jsonb,
  olculdu_at      timestamptz not null default now(),

  -- Sayfa başına güncel durum tutulur; ölçüm tekrarlandığında güncellenir.
  unique (project_id, url, mobil)
);

create index if not exists sayfa_hizi_proje_idx
  on public.sayfa_hizi (project_id, performans asc nulls last);

alter table public.sayfa_hizi enable row level security;

create policy "sayfa_hizi_select" on public.sayfa_hizi
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

/* --------------------------- Satıcı teklifleri -------------------------- */

create table if not exists public.satici_teklifleri (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  product_id    uuid references public.products(id) on delete cascade,
  /* Google'ın ürün kimliği — satıcı sorgusu bununla yapılır. */
  google_urun_id text not null,
  satici        text not null,
  alan_adi      text,
  -- Kargo ve vergi dahil toplam; sağlayıcı çoğu zaman yalnızca bunu verir.
  toplam_fiyat  numeric(12,2),
  fiyat         numeric(12,2),
  para_birimi   text not null default 'TRY',
  puan          numeric(3,2),
  bizim_mi      boolean not null default false,
  olculdu_at    timestamptz not null default now(),

  unique (project_id, google_urun_id, satici)
);

create index if not exists satici_teklifleri_urun_idx
  on public.satici_teklifleri (project_id, product_id);

alter table public.satici_teklifleri enable row level security;

create policy "satici_teklifleri_select" on public.satici_teklifleri
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

/* --------------------------- İşletme yorumları -------------------------- */

-- Google İşletme kaydının adı. Boşsa yorum modülü hiç çalışmaz;
-- tahminle arama yapmak yanlış işletmenin yorumlarını getirebilir.
alter table public.project_settings
  add column if not exists google_isletme_adi text;

create table if not exists public.isletme_yorumlari (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  /* Sağlayıcının yorum kimliği; aynı yorumun iki kez yazılmasını önler. */
  yorum_id       text not null,
  yazar          text,
  puan           numeric(3,2),
  metin          text,
  yorum_tarihi   timestamptz,
  olculdu_at     timestamptz not null default now(),

  unique (project_id, yorum_id)
);

create index if not exists isletme_yorumlari_proje_idx
  on public.isletme_yorumlari (project_id, yorum_tarihi desc nulls last);

alter table public.isletme_yorumlari enable row level security;

create policy "isletme_yorumlari_select" on public.isletme_yorumlari
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

-- İşletmenin genel puanı; yorumlardan ayrı tutulur çünkü toplam oy
-- sayısı çekilen yorum sayısından çok daha büyüktür.
create table if not exists public.isletme_ozeti (
  project_id   uuid primary key references public.projects(id) on delete cascade,
  baslik       text,
  puan         numeric(3,2),
  oy_sayisi    integer,
  olculdu_at   timestamptz not null default now()
);

alter table public.isletme_ozeti enable row level security;

create policy "isletme_ozeti_select" on public.isletme_ozeti
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

/* ------------------------------ Paket limitleri ------------------------- */

/*
 * Sayı seçimi maliyetle sınırlandı. Beklenen kullanım modeliyle
 * (analizlerin %60'ı yapılır) aylık ek maliyet:
 *
 *   Deneme       3 sayfa × 1 analiz             = $0.015
 *   Başlangıç   10 sayfa × 1,2 analiz           = $0.06
 *   Profesyonel 25 sayfa × 2,4 analiz + satıcı  = $0.32
 *   Kurumsal    40 sayfa × 3,6 analiz + satıcı  = $0.79
 *
 * Satıcı karşılaştırması Merchant'a bağlıdır; Merchant kapalı olan
 * paketlerde açık olması anlamsız olurdu.
 */

update public.plans
set limits = limits || jsonb_build_object(
      'sayfa_hizi', true,
      'hiz_olcum_sayfa', 3,
      'satici_karsilastirma', false,
      'isletme_yorumlari', false
    )
where id = 'deneme';

update public.plans
set limits = limits || jsonb_build_object(
      'sayfa_hizi', true,
      'hiz_olcum_sayfa', 10,
      'satici_karsilastirma', false,
      'isletme_yorumlari', true
    )
where id = 'baslangic';

update public.plans
set limits = limits || jsonb_build_object(
      'sayfa_hizi', true,
      'hiz_olcum_sayfa', 25,
      'satici_karsilastirma', true,
      'isletme_yorumlari', true
    )
where id = 'profesyonel';

update public.plans
set limits = limits || jsonb_build_object(
      'sayfa_hizi', true,
      'hiz_olcum_sayfa', 40,
      'satici_karsilastirma', true,
      'isletme_yorumlari', true
    )
where id = 'kurumsal';

update public.plans
set limits = limits || jsonb_build_object(
      'sayfa_hizi', true,
      'hiz_olcum_sayfa', 200,
      'satici_karsilastirma', true,
      'isletme_yorumlari', true
    )
where id = 'konusalim';
