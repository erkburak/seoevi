-- ---------------------------------------------------------------------
-- Aksiyon kayıtlarının tekilliği
--
-- Aksiyon üretimi kayıtları `(project_id, dedupe_key)` çifti üzerinden
-- ekle-veya-güncelle ile yazıyor; ancak tabloda bu çifte karşılık gelen
-- bir benzersizlik kısıtı yoktu. PostgreSQL bu durumda
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" hatası veriyor ve YAZMA TAMAMEN BAŞARISIZ OLUYOR.
--
-- Sonuç: analiz sorunları doğru bulup önceliklendirse bile Aksiyon
-- Merkezi hep boş kalıyordu. Hata yalnızca sunucu günlüğüne düştüğü için
-- arayüzde "henüz aksiyon yok" gibi görünüyordu.
--
-- İndeks kısmi OLMAMALI: PostgreSQL, ON CONFLICT hedefini çıkarırken
-- kısmi indeksi ancak sorgu aynı WHERE koşulunu taşıyorsa kullanır ve
-- istemcinin ürettiği upsert bu koşulu taşımaz. Tam indekste NULL
-- dedupe_key değerleri birbiriyle çakışmadığı için anahtarsız satırlar
-- yine serbestçe eklenebilir.
-- ---------------------------------------------------------------------

drop index if exists public.seo_actions_dedupe_uniq;

create unique index if not exists seo_actions_dedupe_uniq
  on public.seo_actions (project_id, dedupe_key);
