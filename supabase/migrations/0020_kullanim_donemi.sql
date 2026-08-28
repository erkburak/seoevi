-- ---------------------------------------------------------------------
-- Kullanım sayacında dönem
--
-- `gunluk_serp` günlük bir limittir; sayacı aylık dönemde tutmak,
-- kullanıcının ay boyunca yalnızca bir günlük hak kadar sorgu
-- yapabilmesi anlamına geliyordu. Deneme paketinde bu, ayda 3 SERP
-- sorgusu demekti.
--
-- Dönem artık çağıran tarafça verilir: günlük metrikler 'YYYY-MM-DD',
-- aylık metrikler 'YYYY-MM' kullanır. Varsayılan, eski davranışla uyumlu
-- kalması için aylık dönemdir.
-- ---------------------------------------------------------------------

create or replace function public.increment_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer default 1,
  p_period text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_period text := coalesce(p_period, to_char(now(), 'YYYY-MM'));
begin
  insert into public.usage (user_id, period, metric, used)
  values (p_user_id, v_period, p_metric, p_amount)
  on conflict (user_id, period, metric)
  do update set used = public.usage.used + p_amount, updated_at = now()
  returning used into v_used;
  return v_used;
end;
$$;

create or replace function public.decrement_usage(
  p_user_id uuid,
  p_metric text,
  p_amount integer default 1,
  p_period text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
  v_period text := coalesce(p_period, to_char(now(), 'YYYY-MM'));
begin
  update public.usage
  set used = greatest(0, used - p_amount),
      updated_at = now()
  where user_id = p_user_id
    and period = v_period
    and metric = p_metric
  returning used into v_used;

  return coalesce(v_used, 0);
end;
$$;

revoke all on function public.increment_usage(uuid, text, integer, text) from anon, authenticated;
revoke all on function public.decrement_usage(uuid, text, integer, text) from anon, authenticated;
