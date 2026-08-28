-- ---------------------------------------------------------------------
-- Kötüye kullanım önlemleri
-- ---------------------------------------------------------------------

-- --- Hesap kısıtlama bayrağı ---
alter table public.profiles
  add column if not exists is_blocked boolean not null default false;

comment on column public.profiles.is_blocked is
  'Kötüye kullanım tespitinde hesabın maliyetli işlemleri durdurulur.';

-- ---------------------------------------------------------------------
-- Ücretsiz araç kotaları
--
-- Herkese açık araçlar (Google Sıra Bulucu gibi) oturum gerektirmediği
-- için kota, kullanıcı kimliğine değil cihaz ve ağ imzasına bağlanır.
--
-- Gün alanı Türkiye saatine göre yazılır; bu sayede kota her gece
-- 00.00'da (Europe/Istanbul) kendiliğinden sıfırlanır — ayrı bir
-- zamanlanmış işe gerek kalmaz.
--
-- Tek bir imza türüne güvenilmez:
--   parmak_izi → gizli sekme ve çerez temizliğine karşı
--   ip         → aynı cihazda farklı tarayıcılara karşı
-- Her ikisi de ayrı ayrı kontrol edilir; katı olan kazanır.
-- ---------------------------------------------------------------------

create table if not exists public.free_tool_quota (
  id         uuid primary key default gen_random_uuid(),
  tool       text not null,
  scope      text not null check (scope in ('parmak_izi', 'ip')),
  anahtar    text not null,
  gun        date not null,
  adet       integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tool, scope, anahtar, gun)
);

create index if not exists free_tool_quota_gun_idx on public.free_tool_quota (gun);

alter table public.free_tool_quota enable row level security;
revoke all on public.free_tool_quota from anon, authenticated;

-- --- Atomik sayaç artırma ---
-- Yarış koşulunda iki isteğin aynı hakkı tüketmesini önler.
create or replace function public.free_tool_quota_arttir(
  p_tool    text,
  p_scope   text,
  p_anahtar text,
  p_gun     date,
  p_limit   integer
)
returns table (izinli boolean, yeni_adet integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adet integer;
begin
  insert into public.free_tool_quota (tool, scope, anahtar, gun, adet)
  values (p_tool, p_scope, p_anahtar, p_gun, 0)
  on conflict (tool, scope, anahtar, gun) do nothing;

  -- Satırı kilitleyerek oku; eşzamanlı isteklerde sayaç kaybolmaz.
  select adet into v_adet
  from public.free_tool_quota
  where tool = p_tool and scope = p_scope and anahtar = p_anahtar and gun = p_gun
  for update;

  if v_adet >= p_limit then
    return query select false, v_adet;
    return;
  end if;

  update public.free_tool_quota
  set adet = adet + 1, updated_at = now()
  where tool = p_tool and scope = p_scope and anahtar = p_anahtar and gun = p_gun
  returning adet into v_adet;

  return query select true, v_adet;
end;
$$;

-- --- Kotayı yalnızca okuma (hak sayısını göstermek için) ---
create or replace function public.free_tool_quota_oku(
  p_tool    text,
  p_scope   text,
  p_anahtar text,
  p_gun     date
)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select adet from public.free_tool_quota
     where tool = p_tool and scope = p_scope and anahtar = p_anahtar and gun = p_gun),
    0
  );
$$;

-- --- Eski kota satırlarını temizle ---
create or replace function public.free_tool_quota_temizle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_silinen integer;
begin
  delete from public.free_tool_quota where gun < current_date - interval '7 days';
  get diagnostics v_silinen = row_count;
  return v_silinen;
end;
$$;
