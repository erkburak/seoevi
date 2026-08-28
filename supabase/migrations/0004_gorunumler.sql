-- =====================================================================
-- SEO Evi — Görünümler
-- Sık kullanılan birleştirmeleri hızlandırır.
-- security_invoker sayesinde RLS politikaları geçerli kalır.
-- =====================================================================

-- Her anahtar kelimenin güncel sıralaması, fırsat skoru ve hedef adresi
create or replace view public.kelime_ozet
with (security_invoker = true)
as
select
  k.id,
  k.project_id,
  k.keyword,
  k.search_volume,
  k.cpc,
  k.competition,
  k.competition_level,
  k.difficulty,
  k.intent,
  k.is_tracked,
  k.source,
  k.trend,
  s.position,
  s.previous_position,
  s.url,
  s.etv,
  s.checked_at,
  f.score        as opportunity_score,
  f.potential_traffic,
  f.target_position,
  f.reason       as opportunity_reason,
  f.opportunity_type
from public.keywords k
left join lateral (
  select r.position, r.previous_position, r.url, r.etv, r.checked_at
  from public.keyword_rankings r
  where r.keyword_id = k.id
    and r.is_competitor = false
  order by r.checked_at desc
  limit 1
) s on true
left join lateral (
  select o.score, o.potential_traffic, o.target_position, o.reason, o.opportunity_type
  from public.keyword_opportunities o
  where o.keyword_id = k.id
    and o.status = 'acik'
  order by o.score desc
  limit 1
) f on true;

-- Sayfa başına açık sorun sayısı
create or replace view public.sayfa_ozet
with (security_invoker = true)
as
select
  p.id,
  p.project_id,
  p.url,
  p.path,
  p.page_type,
  p.status_code,
  p.title,
  p.title_length,
  p.meta_description,
  p.meta_description_length,
  p.h1,
  p.word_count,
  p.internal_links_count,
  p.images_count,
  p.images_without_alt,
  p.canonical_url,
  p.is_indexable,
  p.click_depth,
  p.has_schema,
  p.onpage_score,
  p.seo_score,
  p.last_crawled_at,
  coalesce(sorun.toplam, 0)  as issue_count,
  coalesce(sorun.kritik, 0)  as critical_count
from public.pages p
left join lateral (
  select
    count(*)                                        as toplam,
    count(*) filter (where t.severity = 'kritik')   as kritik
  from public.technical_issues t
  where t.page_id = p.id and t.status = 'acik'
) sorun on true;
