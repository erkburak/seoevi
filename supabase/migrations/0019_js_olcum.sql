-- ---------------------------------------------------------------------
-- JavaScript ile ölçüm hakkı
--
-- Bazı siteler başlıkları ve metni tarayıcıda üretir. Tarama JavaScript
-- çalıştırmadığı için bu sayfalarda başlık etiketi hiç görünmez ve
-- "H1 yok", "içerik yetersiz" gibi uyarılar sayfa hakkında değil
-- taramanın körlüğü hakkında olur.
--
-- JavaScript'li tarama sayfa başına on iki kat pahalıdır ($0,00015 →
-- $0,0018); tüm sayfalarda açmak paket maliyetini hedefin çok üstüne
-- çıkarır (kurumsalda gelirin %54'ü). Bu yüzden iki aşamalı çalışılır:
-- tüm site ucuz yöntemle taranır, ardından yalnızca EN ÖNEMLİ sayfalar
-- JavaScript ile yeniden ölçülür. Tetiklendiğinde ek maliyet paketin
-- %1'inin altında kalır.
--
-- Deneme paketinde kapalıdır; oradaki kullanıcıya durum dürüstçe bildirilir.
-- ---------------------------------------------------------------------

update public.plans
set limits = limits
  || jsonb_build_object('js_olcum', false, 'js_olcum_sayfa', 0)
where id = 'deneme';

update public.plans
set limits = limits
  || jsonb_build_object('js_olcum', true, 'js_olcum_sayfa', 50)
where id = 'baslangic';

update public.plans
set limits = limits
  || jsonb_build_object('js_olcum', true, 'js_olcum_sayfa', 100)
where id = 'profesyonel';

update public.plans
set limits = limits
  || jsonb_build_object('js_olcum', true, 'js_olcum_sayfa', 200)
where id = 'kurumsal';

update public.plans
set limits = limits
  || jsonb_build_object('js_olcum', true, 'js_olcum_sayfa', 500)
where id = 'konusalim';
