-- ---------------------------------------------------------------------
-- Sıra doğrulama limiti
--
-- Sorun: sıralamalar Labs'in `ranked_keywords` ucundan alınıyordu. Bu uç
-- canlı arama değil, geçmişe dayalı bir veritabanıdır. Ölçtüğümüz gerçek
-- örneklerde kayıtlar 44–104 gün eskiydi ve "13. sıradasınız" denen
-- kelimede site canlı SERP'in ilk 67 organik sonucunda hiç yoktu.
--
-- Çözüm: takip edilen kelimelerin sırası, kuyruklu SERP göreviyle canlı
-- olarak doğrulanır. Doğrulanmayan kelimeler sıra iddiası taşımaz;
-- yalnızca fırsat verisi olarak listelenir.
--
-- Maliyet ölçülen değerlerdir, fiyat listesinden okunan tahmin değil.
-- Kuyruklu görev derinlik 30 için kelime başına $0.0018:
--
--   Paket          kelime × analiz/ay = aylık maliyet   gelire oranı
--   Deneme          10 × 1  =  $0.018                   —  (ücretsiz)
--   Başlangıç       50 × 2  =  $0.18                    %1,7
--   Profesyonel    150 × 4  =  $1.08                    %5,2
--   Kurumsal       300 × 6  =  $3.24                    %10,4
--
-- Hedeflenen azami API maliyeti/gelir oranı %25 olduğundan, bu kalem
-- bütçenin içinde kalır ve diğer modüllere yer bırakır.
--
-- Not: `anahtar_kelime` limiti SAKLANAN kelime sayısıdır ve maliyeti
-- yoktur (Labs satır başına ücret almaz). `dogrulanan_kelime` ise her
-- analizde canlı ölçülen kelime sayısıdır ve maliyeti doğrudan belirler.
-- İkisi bilerek ayrı tutulmuştur.
-- ---------------------------------------------------------------------

update public.plans
set limits = limits || jsonb_build_object('dogrulanan_kelime', 10)
where id = 'deneme';

update public.plans
set limits = limits || jsonb_build_object('dogrulanan_kelime', 50)
where id = 'baslangic';

update public.plans
set limits = limits || jsonb_build_object('dogrulanan_kelime', 150)
where id = 'profesyonel';

update public.plans
set limits = limits || jsonb_build_object('dogrulanan_kelime', 300)
where id = 'kurumsal';

update public.plans
set limits = limits || jsonb_build_object('dogrulanan_kelime', 1000)
where id = 'konusalim';
