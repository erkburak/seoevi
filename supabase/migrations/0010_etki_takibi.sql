-- ---------------------------------------------------------------------
-- Etki Takibi
--
-- Platformun cevaplaması gereken asıl soru: "yaptığım iş işe yaradı mı?"
--
-- Kullanıcı bir aksiyonu tamamladığında, o aksiyonun etkilediği
-- sayfalarda sıralanan anahtar kelimelerin o anki durumu dondurulur.
-- Sonraki günlerde aynı kelimeler yeniden ölçülür ve fark gösterilir.
--
-- Ölçüm mevcut sıralama verisinden okunur; ek DataForSEO çağrısı
-- yapılmaz, dolayısıyla bu özelliğin sağlayıcı maliyeti sıfırdır.
--
-- Dürüstlük notu: sıralamalar başka nedenlerle de değişir. Arayüzde
-- "bu aksiyon şunu sağladı" değil, "bu aksiyondan sonra şu oldu"
-- dili kullanılır.
-- ---------------------------------------------------------------------

create table if not exists public.action_impact (
  id            uuid primary key default gen_random_uuid(),
  action_id     uuid not null unique references public.seo_actions(id) on delete cascade,
  project_id    uuid not null references public.projects(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Aksiyonun tamamlandığı an
  completed_at  timestamptz not null default now(),

  -- Başlangıç anlık görüntüsü
  baz_kelime_sayisi     integer not null default 0,
  baz_ortalama_pozisyon numeric(6,2),
  baz_etv               numeric(12,2) not null default 0,
  baz_deger             numeric(12,2) not null default 0,
  /** [{ keyword_id, keyword, pozisyon, etv, cpc }] */
  baz_kelimeler         jsonb not null default '[]'::jsonb,

  -- Son ölçüm
  son_olcum_at          timestamptz,
  son_ortalama_pozisyon numeric(6,2),
  son_etv               numeric(12,2),
  son_deger             numeric(12,2),
  olcum_sayisi          integer not null default 0,

  /**
   * bekliyor    → henüz ölçüm penceresi açılmadı
   * olculuyor   → ölçülüyor, sonuç oluşuyor
   * sonuclandi  → ölçüm penceresi kapandı
   * veri_yok    → aksiyona bağlanabilecek sıralanan kelime bulunamadı
   */
  durum         text not null default 'bekliyor'
                check (durum in ('bekliyor', 'olculuyor', 'sonuclandi', 'veri_yok')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists action_impact_project_idx
  on public.action_impact (project_id, completed_at desc);

create index if not exists action_impact_olcum_idx
  on public.action_impact (durum, son_olcum_at nulls first)
  where durum in ('bekliyor', 'olculuyor');

drop trigger if exists action_impact_updated_at on public.action_impact;
create trigger action_impact_updated_at before update on public.action_impact
  for each row execute function public.set_updated_at();

-- --- RLS: kullanıcı yalnızca kendi projesinin etkisini görür ---
alter table public.action_impact enable row level security;

drop policy if exists "action_impact_select" on public.action_impact;
create policy "action_impact_select" on public.action_impact
  for select using (public.is_project_owner(project_id) or public.is_yetkili());

drop policy if exists "action_impact_write" on public.action_impact;
create policy "action_impact_write" on public.action_impact
  for all using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------
-- Trafik değeri parametreleri
--
-- Kazanılan ziyaretin parasal karşılığı, o kelimelerin tıklama başı
-- reklam maliyetinden hesaplanır: "bu trafiği reklamla almak ne tutardı?"
-- ---------------------------------------------------------------------

insert into public.app_config (key, value, description) values
  (
    'etki_takibi',
    '{
      "olcum_baslangic_gun": 3,
      "olcum_araligi_gun": 3,
      "olcum_penceresi_gun": 45,
      "asgari_kelime": 1,
      "cpc_para_birimi": "USD"
    }'::jsonb,
    'Etki takibinin ölçüm penceresi ve aralığı (gün). Aksiyon tamamlandıktan kaç gün sonra ölçülmeye başlanır, ne sıklıkta ölçülür ve kaç gün sonra kapanır.'
  )
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description,
  updated_at = now();
