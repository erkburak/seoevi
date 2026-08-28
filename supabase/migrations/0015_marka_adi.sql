-- ---------------------------------------------------------------------
-- Marka adı değişikliği: SEOHANE -> SEO Evi
--
-- Tohum verisi (0003, 0006) yalnızca yeni kurulumlarda çalıştığı için
-- hâlihazırda kurulu veritabanlarındaki sistem metinleri burada
-- güncellenir. Eski metne göre eşleştiği için elle düzenlenmiş kayıtları
-- bozmaz ve tekrar çalıştırılması güvenlidir.
--
-- Kullanıcı verisi (projeler, bildirimler, raporlar) bilerek dışarıda
-- bırakılmıştır: müşteri kayıtları dağıtım sırasında toplu olarak
-- yeniden yazılmaz.
-- ---------------------------------------------------------------------

update public.plans
set headline = 'SEO Evi''ni 7 gün boyunca deneyin'
where headline = 'SEOHANE''yi 7 gün boyunca deneyin';
