-- ---------------------------------------------------------------------
-- Hız ölçüm limitinin maliyete göre daraltılması
--
-- 0026'daki sayılarla Kurumsal paketin beklenen maliyeti gelirin
-- %25,6'sına çıkıyordu; hedef %25. Fark küçük ama hedefi "yaklaşık"
-- tutmak, sonraki her eklemede biraz daha aşmak demektir.
--
-- Kısıntı hız ölçümünden yapılıyor çünkü ölçüm zaten ŞABLON TEMSİLCİSİ
-- sayfalar üzerinde çalışıyor: bir mağazadaki yüzlerce ürün sayfası aynı
-- şablonu kullandığı için 25 sayfa (beş sayfa türünden beşer temsilci)
-- kararı vermeye yeter; 40 sayfa aynı cevabı daha pahalıya almaktır.
--
-- Yeni beklenen maliyet oranları:
--   Başlangıç %16,6 · Profesyonel %21,8 · Kurumsal %24,7
-- ---------------------------------------------------------------------

update public.plans
set limits = limits || jsonb_build_object('hiz_olcum_sayfa', 20)
where id = 'profesyonel';

update public.plans
set limits = limits || jsonb_build_object('hiz_olcum_sayfa', 25)
where id = 'kurumsal';
