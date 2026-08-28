-- ---------------------------------------------------------------------
-- Destek talepleri — "Beraber İnceleyelim"
--
-- Kullanıcı, panelde anlamadığı ya da emin olamadığı bir konuyu doğrudan
-- ekibe iletebilir. Ücretsizdir ve pakete bağlı değildir: amaç, veriyi
-- yorumlayamayan kullanıcının ürünü terk etmesini önlemektir.
-- ---------------------------------------------------------------------

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete set null,

  konu         text not null,
  mesaj        text not null,
  /** Kullanıcının talebi açtığı ekran — bağlamı korur. */
  kaynak_sayfa text,

  durum        text not null default 'yeni'
               check (durum in ('yeni','inceleniyor','cevaplandi','kapandi')),

  /** Ekibin yanıtı. */
  yanit        text,
  yanitlayan   uuid references auth.users(id) on delete set null,
  yanitlandi_at timestamptz,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists support_tickets_kullanici_idx
  on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_durum_idx
  on public.support_tickets (durum, created_at desc);

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

-- Kullanıcı yalnızca kendi taleplerini görür; yetkili hepsini görür.
create policy "support_tickets_select" on public.support_tickets
  for select using (user_id = auth.uid() or public.is_yetkili());

-- Kullanıcı yalnızca kendi adına talep açabilir.
create policy "support_tickets_insert" on public.support_tickets
  for insert with check (user_id = auth.uid());

-- Yanıtlama ve durum değiştirme yalnızca yetkilinin işidir.
create policy "support_tickets_update" on public.support_tickets
  for update using (public.is_yetkili()) with check (public.is_yetkili());
