-- ---------------------------------------------------------------------
-- Görev tablosunun genelleştirilmesi
--
-- `serp_gorevleri` yalnızca sıralama doğrulaması için açılmıştı. Sayfa
-- hızı ölçümü de aynı deseni kullanıyor: kuyruklu görev açılır, sağlayıcı
-- birkaç dakikada tamamlar, sonuç sonradan okunur. Ölçtüğümüz süreler —
-- Lighthouse sayfa başına ~25 saniye — 25 sayfanın tek bir analiz işine
-- sığmayacağını gösteriyor.
--
-- İki ayrı tablo tutmak yerine tablo genelleştiriliyor: `tur` hangi
-- uç noktaya ait olduğunu, `hedef` de kelime ya da adres olduğunu söyler.
-- Böylece "ödenmiş ama okunmamış görev kaybolmasın" güvencesi tek yerde
-- kalır.
--
-- Tablo üretimde boş olduğu için yeniden adlandırma veri kaybı yaratmaz.
-- ---------------------------------------------------------------------

alter table if exists public.serp_gorevleri rename to saglayici_gorevleri;

-- Kelime alanı artık kelime ya da adres taşıyor.
alter table public.saglayici_gorevleri rename column keyword to hedef;

alter table public.saglayici_gorevleri
  add column if not exists tur text not null default 'serp';

alter table public.saglayici_gorevleri
  drop constraint if exists saglayici_gorevleri_tur_check;

alter table public.saglayici_gorevleri
  add constraint saglayici_gorevleri_tur_check check (tur in ('serp', 'hiz'));

-- Bekleyen görevler artık türe göre de aranıyor.
drop index if exists serp_gorevleri_bekleyen_idx;
create index if not exists saglayici_gorevleri_bekleyen_idx
  on public.saglayici_gorevleri (project_id, tur, posted_at desc)
  where collected_at is null;

drop index if exists serp_gorevleri_kelime_idx;
create index if not exists saglayici_gorevleri_hedef_idx
  on public.saglayici_gorevleri (project_id, tur, hedef, posted_at desc);

-- Politika adı da tabloyla birlikte anlamlı kalsın.
drop policy if exists "serp_gorevleri_select" on public.saglayici_gorevleri;

create policy "saglayici_gorevleri_select" on public.saglayici_gorevleri
  for select using (
    exists (
      select 1 from public.projects p
      where p.id = saglayici_gorevleri.project_id
        and (p.user_id = auth.uid() or public.is_yetkili())
    )
  );
