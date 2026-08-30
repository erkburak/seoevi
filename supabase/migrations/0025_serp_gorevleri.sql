-- ---------------------------------------------------------------------
-- Açılmış SERP sıra doğrulama görevleri
--
-- Sıra doğrulaması kuyruklu SERP görevleriyle yapılır: görev açılır,
-- sağlayıcı birkaç dakika içinde tamamlar, sonuç okunur. Ölçtüğümüz
-- gerçek sürelerde tamamlanma 3–6 dakikayı buluyor; analiz işinin tamamı
-- için tanınan süre ise 5 dakika.
--
-- Görev kimliği saklanmazsa, tamamlanmasını bekleyemediğimiz her görevin
-- parası boşa gider. Oysa sağlayıcı sonucu biz okuyana kadar saklıyor.
-- Bu tablo, açılmış ama henüz okunmamış görevleri tutar; analiz akışının
-- ilerleyen adımları ve bir sonraki analiz bunları toplayıp sonucu
-- kullanır. Böylece ödenen hiçbir görev ziyan olmaz.
-- ---------------------------------------------------------------------

create table if not exists public.serp_gorevleri (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  keyword      text not null,
  -- Sağlayıcının görev kimliği; sonucu bununla okuruz.
  task_id      text not null unique,
  posted_at    timestamptz not null default now(),
  -- Sonuç okunduğunda damgalanır; dolu satır bir daha okunmaz.
  collected_at timestamptz
);

-- Bekleyen görevleri proje bazında hızlı bulmak için.
create index if not exists serp_gorevleri_bekleyen_idx
  on public.serp_gorevleri (project_id, posted_at desc)
  where collected_at is null;

-- Aynı kelime için kısa süre içinde ikinci görev açılmasın diye.
create index if not exists serp_gorevleri_kelime_idx
  on public.serp_gorevleri (project_id, keyword, posted_at desc);

alter table public.serp_gorevleri enable row level security;

-- Bu tablo yalnızca sunucu tarafındaki analiz akışı tarafından yazılır;
-- servis anahtarı RLS'i atlar. Kullanıcıya yalnızca kendi projesinin
-- kayıtlarını okuma izni verilir, yazma izni verilmez.
create policy "serp_gorevleri_select" on public.serp_gorevleri
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = serp_gorevleri.project_id
        and (p.user_id = auth.uid() or public.is_yetkili())
    )
  );
