-- ---------------------------------------------------------------------
-- AI görünürlüğü verisinin önbellek süresi
--
-- Bu uç nokta çağrı başına 0,10 dolar — SERP'in elli katı. Yapay zekâ
-- cevapları da günlük değişmediği için otuz gün saklanır; aynı ay içinde
-- sayfayı tekrar açmak yeniden ücret doğurmaz.
-- ---------------------------------------------------------------------

update public.app_config
set value = value || jsonb_build_object('ai_gorunurluk', 2592000)
where key = 'onbellek_sureleri';

update public.app_config
set value = value || jsonb_build_object('ai_gorunurluk', 604800)
where key = 'yenileme_asgari_yasi';
