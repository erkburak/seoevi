-- ---------------------------------------------------------------------
-- Kullanım hakkının iadesi
--
-- Site taraması hakkı, tarama görevi sağlayıcıya gönderildiği anda
-- düşülür — maliyet o anda doğduğu için doğrusu budur. Ancak analiz
-- sonradan başarısız olursa kullanıcı hiçbir sonuç almadan hakkını
-- kaybeder. Bu durumda hak iade edilir.
--
-- Sayaç asla sıfırın altına inmez; iade, düşülenden fazlasını geri
-- veremez.
-- ---------------------------------------------------------------------

create or replace function public.decrement_usage(
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
  update public.usage
  set used = greatest(0, used - p_amount),
      updated_at = now()
  where user_id = p_user_id
    and period = to_char(now(), 'YYYY-MM')
    and metric = p_metric
  returning used into v_used;

  return coalesce(v_used, 0);
end;
$$;

revoke all on function public.decrement_usage(uuid, text, integer) from anon, authenticated;
