import type { PazarlamaSayfasiIcerigi } from "@/components/marketing/pazarlama-sayfasi";

/**
 * Arama motorlarına yönelik açılış sayfalarının içerikleri.
 * Her sayfa kendi başlığı, açıklaması ve yapısal verisiyle benzersizdir.
 */

export const SEO_ARACI: PazarlamaSayfasiIcerigi = {
  slug: "seo-araci",
  ustBaslik: "SEO Aracı",
  baslik: "E-ticaret için SEO aracı",
  aciklama:
    "Sıralamalarınızı, teknik sorunlarınızı, rakiplerinizi ve ürün sayfalarınızı tek ekranda görün. SEO Evi size veri yığını değil, sıraya dizilmiş bir yapılacaklar listesi verir.",
  metaBaslik: "SEO Aracı — E-ticaret siteleri için Türkçe SEO analiz platformu",
  metaAciklama:
    "Türkçe SEO aracı: teknik SEO taraması, anahtar kelime takibi, rakip analizi ve ürün SEO skorları tek platformda. 7 gün ücretsiz deneyin.",
  giris: [
    "Çoğu SEO aracı size yüzlerce satır veri gösterir ve ne yapacağınıza kendiniz karar vermenizi bekler. Elinizde bir tablo olur ama hangi işin önce yapılması gerektiği belirsiz kalır.",
    "SEO Evi farklı bir yol izler: sitenizi tarar, arama sonuçlarındaki yerinizi ölçer, rakiplerinizle karşılaştırır ve sonucu tek bir soruya indirger — bu hafta neyi düzeltirsem en çok kazanırım?",
    "Platform e-ticaret için tasarlandı. Ürün ve kategori sayfaları, Google Alışveriş verileri ve yapısal işaretleme kontrolleri standart bir SEO aracında bulamayacağınız derinlikte ele alınır.",
    "Bu sayfa aracın kendisini anlatıyor; e-ticaret SEO'nun bütününe, hangi parçanın hangi işe yaradığına bakmak isterseniz oradan başlayabilirsiniz.",
  ],
  ozellikler: [
    {
      baslik: "Teknik SEO taraması",
      metin:
        "Sitenizin tüm sayfaları taranır; başlık, açıklama, yönlendirme, kırık bağlantı, indekslenebilirlik ve site mimarisi tek tek kontrol edilir.",
    },
    {
      baslik: "Anahtar kelime takibi",
      metin:
        "Hangi kelimelerde kaçıncı sıradasınız, geçen haftaya göre ne değişti, hangi kelime ilk sayfaya çok yakın — hepsi tek tabloda.",
    },
    {
      baslik: "Fırsat skoru",
      metin:
        "Her anahtar kelimeye 0-100 arası bir fırsat puanı verilir. Arama hacmi, rekabet, mevcut sıranız ve ticari niyet birlikte değerlendirilir.",
    },
    {
      baslik: "Rakip karşılaştırması",
      metin:
        "Rakibinizin önde olduğu kelimeler, sizin önde olduklarınız ve hiç girmediğiniz alanlar ayrı ayrı listelenir.",
    },
    {
      baslik: "Ürün ve kategori SEO",
      metin:
        "Her ürün sayfası için ayrı bir skor: başlık, açıklama, görsel alt metni, yapısal veri, GTIN, stok ve fiyat bilgisi kontrol edilir.",
    },
    {
      baslik: "Aksiyon merkezi",
      metin:
        "Bulunan tüm sorunlar etkisine ve zorluğuna göre sıraya dizilir. Ne yapacağınızı düşünmeniz gerekmez.",
    },
  ],
  adimlar: [
    {
      baslik: "Alan adınızı ekleyin",
      metin: "Kod eklemenize, site doğrulaması yapmanıza veya geliştirici desteğine ihtiyacınız yok.",
    },
    {
      baslik: "Analiz arka planda çalışsın",
      metin:
        "Site taraması, anahtar kelime ve rakip analizi eş zamanlı başlar. Beklerken paneli kullanmaya devam edebilirsiniz.",
    },
    {
      baslik: "Yapılacaklar listenizi alın",
      metin:
        "Sonuçlar hazır olduğunda karşınıza bir rapor değil, önem sırasına dizilmiş bir iş listesi çıkar.",
    },
  ],
  sss: [
    {
      soru: "SEO Evi hangi verileri kullanıyor?",
      cevap:
        "Sıralama, anahtar kelime, geri bağlantı ve Google Alışveriş verileri DataForSEO altyapısından alınır. Site taraması ise sayfalarınızı doğrudan okuyarak yapılır. Tüm veriler gerçek arama sonuçlarına dayanır.",
    },
    {
      soru: "Kurulum ne kadar sürüyor?",
      cevap:
        "Alan adınızı girmeniz yeterli. İlk analiz hemen başlar ve sitenizin büyüklüğüne göre birkaç dakika içinde sonuçlanır.",
    },
    {
      soru: "Türkçe anahtar kelimelerde doğru sonuç veriyor mu?",
      cevap:
        "Evet. Platform Türkiye pazarı için kuruldu; konum ve dil ayarları varsayılan olarak Türkiye ve Türkçe'dir. İleride farklı pazarlar da eklenebilir.",
    },
    {
      soru: "Ücretsiz deneyebilir miyim?",
      cevap:
        "7 gün boyunca kredi kartı vermeden gerçek verilerle kullanabilirsiniz. Devam etmezseniz herhangi bir ücret alınmaz.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
    { etiket: "Teknik SEO Analizi", href: "/teknik-seo-analizi" },
    { etiket: "Rakip SEO Analizi", href: "/rakip-seo-analizi" },
    { etiket: "Ücretsiz SEO Analizi", href: "/ucretsiz-seo-analizi" },
  ],
};

export const ETICARET_SEO: PazarlamaSayfasiIcerigi = {
  slug: "e-ticaret-seo",
  ustBaslik: "Ürün sayfası SEO",
  /*
   * Ana sayfa "e-ticaret SEO" kelimesini hedefliyor. Bu sayfa aynı
   * kelimeye kurulursa ikisi birbiriyle yarışır ve Google hangisini öne
   * çıkaracağını bilemez — ürünün kendi tespit ettiği "sayfa çakışması"
   * sorunu. Bu yüzden burası daha özgül bir ifadeye odaklanır:
   * ürün ve kategori sayfası SEO'su.
   */
  baslik: "Ürün sayfası SEO: ürünleriniz neden bulunmuyor?",
  aciklama:
    "Binlerce ürününüz var ama hangisinin Google'da sorun yaşadığını bilmiyorsanız, SEO çalışması tahmine dönüşür. SEO Evi her ürün ve kategori sayfasını ayrı ayrı puanlar.",
  metaBaslik: "Ürün Sayfası SEO — Ürün ve Kategori Optimizasyonu | SEO Evi",
  metaAciklama:
    "Ürün sayfası SEO rehberi ve analizi: ürün skorları, eksik alanlar, kategori optimizasyonu, yapısal veri ve Google Alışveriş kontrolleri. Her ürün ayrı puanlanır.",
  giris: [
    "E-ticaret SEO'su içerik sitelerinin SEO'sundan farklı çalışır. Bir blog yazısında başlık ve içerik yeterken, bir ürün sayfasında fiyat, stok durumu, GTIN, marka bilgisi ve yapısal işaretleme de arama sonuçlarındaki yerinizi doğrudan etkiler.",
    "Genel amaçlı SEO araçları ürün sayfasını sıradan bir sayfa gibi değerlendirir. Sonuç olarak \"meta açıklama eksik\" gibi genel uyarılar alırsınız ama asıl kaybınızın nerede olduğunu göremezsiniz.",
    "SEO Evi ürün ve kategori sayfalarını kendi kurallarıyla inceler. Hangi üründe hangi alanın eksik olduğunu, bu eksiğin ne kadar trafik kaybettirdiğini ve önce hangisini düzeltmeniz gerektiğini söyler.",
  ],
  ozellikler: [
    {
      baslik: "Ürün SEO skoru",
      metin:
        "Her ürün için 100 üzerinden bir skor: başlık, açıklama uzunluğu, görsel alt metni, teknik özellikler, yorumlar ve yapısal veri birlikte değerlendirilir.",
    },
    {
      baslik: "Eksik ürün alanları",
      metin:
        "GTIN, MPN, SKU, marka, fiyat ve stok bilgisi eksik olan ürünler listelenir. Bu alanlar Google Alışveriş görünürlüğünü doğrudan etkiler.",
    },
    {
      baslik: "Kategori sayfası analizi",
      metin:
        "Kategori başlığı, açıklama derinliği, alt kategori yapısı, ürün sayısı ve iç bağlantı dağılımı incelenir.",
    },
    {
      baslik: "Yapısal veri kontrolü",
      metin:
        "Product ve BreadcrumbList işaretlemesi bulunmayan sayfalar tespit edilir; arama sonuçlarında zengin gösterim şansınız ölçülür.",
    },
    {
      baslik: "Rakip ürün karşılaştırması",
      metin:
        "Aynı ürünü satan rakiplerle fiyat, içerik derinliği, yorum sayısı ve görünürlük açısından karşılaştırma yapılır.",
    },
    {
      baslik: "Toplu düzeltme listesi",
      metin:
        "\"14 üründe başlık sorunu var, bunların 6'sı yüksek trafik potansiyeline sahip\" gibi gruplanmış, uygulanabilir bir liste alırsınız.",
    },
  ],
  adimlar: [
    {
      baslik: "Mağazanızı ekleyin",
      metin: "Ürün ve kategori sayfa kalıplarınızı belirtirseniz sınıflandırma daha isabetli olur.",
    },
    {
      baslik: "Sayfalarınız taranır",
      metin:
        "Ürün sayfaları, kategori sayfaları ve içerik sayfaları ayrı ayrı sınıflandırılıp kendi kurallarıyla puanlanır.",
    },
    {
      baslik: "Öncelikli ürünlerden başlayın",
      metin:
        "Düşük skorlu ama yüksek potansiyelli ürünler en üstte listelenir. Zamanınızı en çok kazandıracak işe ayırırsınız.",
    },
  ],
  sss: [
    {
      soru: "Kaç ürün analiz edilebiliyor?",
      cevap:
        "Tarama başına sayfa sayısı paketinize göre değişir. Çok büyük kataloglar için Konuşalım paketi kapsamında size özel limit tanımlıyoruz.",
    },
    {
      soru: "Mağaza altyapım fark eder mi?",
      cevap:
        "Hayır. Ticimax, İdeasoft, Shopify, WooCommerce veya özel yazılım fark etmeksizin sayfalarınız herkese açık olduğu sürece analiz edilebilir.",
    },
    {
      soru: "Ürün açıklamalarımı otomatik değiştiriyor musunuz?",
      cevap:
        "Hayır. SEO Evi sitenizde hiçbir değişiklik yapmaz. Öneriler size gösterilir, uygulama kararı tamamen sizde kalır.",
    },
    {
      soru: "Pazaryerindeki ürünlerim de analiz ediliyor mu?",
      cevap:
        "Kendi alan adınızdaki ürünler tam kapsamlı analiz edilir. Pazaryeri listelemeleriniz Merchant analizinde görünürlük açısından değerlendirilir.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "Google Alışveriş SEO", href: "/google-shopping-seo" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "Teknik SEO Analizi", href: "/teknik-seo-analizi" },
    { etiket: "Fiyatlandırma", href: "/fiyatlandirma" },
  ],
};

export const RAKIP_SEO_ANALIZI: PazarlamaSayfasiIcerigi = {
  slug: "rakip-seo-analizi",
  ustBaslik: "Rakip Analizi",
  baslik: "Rakibiniz hangi kelimelerde sizden önde?",
  aciklama:
    "Rakip alan adını ekleyin; hangi kelimelerde önde olduklarını, hangi sayfalarının trafik getirdiğini ve sizin hiç girmediğiniz alanları görün.",
  metaBaslik: "Rakip SEO Analizi — Rakiplerinizin anahtar kelimelerini görün",
  metaAciklama:
    "Rakip SEO analizi aracı: keyword gap, rakip anahtar kelimeleri, kazanılan ve kaybedilen sıralamalar. Türkçe e-ticaret SEO platformu.",
  giris: [
    "SEO'da en hızlı ilerleme genellikle sıfırdan bir şey icat ederek değil, rakibinizin zaten kanıtladığı fırsatları görerek elde edilir. Rakibiniz bir kelimede ilk sıradaysa o kelimenin gerçekten satış getirdiğini biliyorsunuz demektir.",
    "SEO Evi rakip alan adlarını sizin alan adınızla yan yana koyar. Ortak kelimeler, yalnızca onların sıralandığı kelimeler ve yalnızca sizin sıralandığınız kelimeler ayrı ayrı listelenir.",
    "En değerli kısım ise \"rakibin açığı\": rakibinizin sıralandığı ancak rekabetin düşük olduğu, sizin de kısa sürede girebileceğiniz kelimeler.",
    "Rakip analizi tek başına yeterli değil: bulduğunuz açığı kapatmak teknik SEO, ürün sayfası SEO ve içerik tarafında iş gerektirir. E-ticaret SEO bu parçaların birlikte yürümesidir.",
  ],
  ozellikler: [
    {
      baslik: "Keyword gap",
      metin:
        "Rakibinizin sıralandığı ama sizin hiç görünmediğiniz anahtar kelimeler. Doğrudan içerik planınıza dönüşür.",
    },
    {
      baslik: "Ortak kelimeler",
      metin:
        "İkinizin de sıralandığı kelimelerde kim önde? Aradaki farkı sıra sıra görebilirsiniz.",
    },
    {
      baslik: "Kazanılan ve kaybedilen",
      metin:
        "Rakibinizin son dönemde yükseldiği ve düştüğü kelimeler. Strateji değişikliklerini erken fark edersiniz.",
    },
    {
      baslik: "Trafik getiren sayfalar",
      metin:
        "Rakibinizin en çok organik trafik alan sayfaları. Hangi içerik türünün çalıştığını gösterir.",
    },
    {
      baslik: "Rakibin açığı",
      metin:
        "Düşük rekabetli, ticari niyetli ve ürün odaklı fırsatlar ayrı ayrı gruplanır. Her biri için ayrıntı sayfası açılır.",
    },
    {
      baslik: "Geri bağlantı farkı",
      metin:
        "Rakibinize bağlantı veren ama size vermeyen alan adları listelenir; bağlantı çalışmanız için hazır bir liste olur.",
    },
  ],
  adimlar: [
    {
      baslik: "Rakip alan adını girin",
      metin:
        "Rakiplerinizi kendiniz ekleyebilir ya da sistemin önerdiği benzer alan adları arasından seçebilirsiniz.",
    },
    {
      baslik: "Karşılaştırma hazırlansın",
      metin:
        "Her iki alan adının sıralama verisi çekilir ve kelime bazında eşleştirilir.",
    },
    {
      baslik: "Fırsatları sıraya koyun",
      metin:
        "Bulunan fırsatlar zorluk ve potansiyel trafiğe göre puanlanır; en kolay kazanımlar en üstte çıkar.",
    },
  ],
  sss: [
    {
      soru: "Kaç rakip ekleyebilirim?",
      cevap:
        "Rakip sayısı paketinize göre değişir. Fiyatlandırma sayfasındaki karşılaştırma tablosunda tüm limitleri görebilirsiniz.",
    },
    {
      soru: "Rakibimin gerçek trafik verisini mi görüyorum?",
      cevap:
        "Hayır, kimsenin analitik hesabına erişimimiz yok. Gösterilen trafik, sıralama pozisyonları ve arama hacimlerinden hesaplanan tahmini bir değerdir; bunu her zaman açıkça belirtiriz.",
    },
    {
      soru: "Rakiplerim benim analiz yaptığımı görebilir mi?",
      cevap:
        "Hayır. Analizler herkese açık arama sonuçları üzerinden yapılır; rakip sitesine bir bildirim gitmez.",
    },
    {
      soru: "Pazaryerlerini rakip olarak ekleyebilir miyim?",
      cevap:
        "Ekleyebilirsiniz, ancak pazaryerleri çok geniş kelime kümesinde sıralandığı için karşılaştırmayı kendi ölçeğinizdeki mağazalarla yapmanız daha yararlı olur.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "Anahtar Kelime Araştırma Aracı", href: "/anahtar-kelime-arastirma-araci" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
  ],
};

export const GOOGLE_SHOPPING_SEO: PazarlamaSayfasiIcerigi = {
  slug: "google-shopping-seo",
  ustBaslik: "Google Alışveriş",
  baslik: "Google Alışveriş'te neden görünmüyorsunuz?",
  aciklama:
    "Ürünlerinizin alışveriş sonuçlarında çıkabilmesi için gereken alanları kontrol edin. Eksik GTIN, marka veya stok bilgisi görünürlüğünüzü doğrudan kesintiye uğratır.",
  metaBaslik: "Google Alışveriş SEO — Merchant ürün verisi analizi",
  metaAciklama:
    "Google Alışveriş görünürlüğü analizi: GTIN, MPN, marka, fiyat ve stok alanları kontrolü. Merchant sağlık skoru ile eksiklerinizi görün.",
  giris: [
    "Google Alışveriş sonuçları artık birçok ürün aramasında organik sonuçların üzerinde yer alıyor. Bu alanda görünmemek, arama hacminin önemli bir bölümünü baştan kaybetmek anlamına geliyor.",
    "Görünürlük büyük ölçüde ürün verinizin eksiksizliğine bağlı. GTIN, MPN, marka, fiyat, stok durumu ve yapısal işaretleme doğru şekilde verilmediğinde ürününüz eşleştirilemiyor.",
    "SEO Evi ürünlerinizi bu alanlar üzerinden tarar ve 100 üzerinden bir Merchant Sağlık Skoru üretir. Hangi üründe hangi alanın eksik olduğunu tek tek görürsünüz.",
    "Alışveriş görünürlüğü, e-ticaret SEO'nun yalnızca bir parçası. Organik sonuçlardaki sıranız ve ürün sayfalarınızın kalitesi de aynı anda çalışmalı.",
  ],
  ozellikler: [
    {
      baslik: "Merchant sağlık skoru",
      metin:
        "Ürün verinizin alışveriş sonuçlarına ne kadar hazır olduğunu 100 üzerinden gösterir.",
    },
    {
      baslik: "Eksik alan tespiti",
      metin:
        "GTIN, MPN, SKU, marka, fiyat ve stok durumu eksik olan ürünler tek listede toplanır.",
    },
    {
      baslik: "Yapısal veri kontrolü",
      metin:
        "Product schema işaretlemesi bulunmayan veya hatalı olan ürün sayfaları tespit edilir.",
    },
    {
      baslik: "Alışveriş görünürlüğü",
      metin:
        "Ürünlerinizin alışveriş sonuçlarında görünüp görünmediği ve kaçıncı sırada olduğu ölçülür.",
    },
    {
      baslik: "Fiyat konumu",
      metin:
        "Aynı ürünü satan diğer mağazalara göre fiyat konumunuz karşılaştırılır.",
    },
    {
      baslik: "Satıcı rekabeti",
      metin:
        "Aynı ürün için kaç satıcının yarıştığını görür, hangi ürünlerde öne çıkma şansınızın yüksek olduğunu anlarsınız.",
    },
  ],
  adimlar: [
    {
      baslik: "Ürün sayfalarınız taransın",
      metin: "Ürün verileriniz sayfalarınızdaki yapısal işaretlemeden okunur.",
    },
    {
      baslik: "Eksikler listelensin",
      metin: "Hangi alanın kaç üründe eksik olduğu gruplanarak gösterilir.",
    },
    {
      baslik: "Yüksek etkili ürünlerden başlayın",
      metin:
        "Arama hacmi yüksek ürünlerdeki eksikler en üstte listelenir; en çok kazandıracak düzeltmeyi önce yaparsınız.",
    },
  ],
  sss: [
    {
      soru: "Merchant Center hesabımı bağlamam gerekiyor mu?",
      cevap:
        "Hayır. Analiz, herkese açık ürün sayfalarınız ve alışveriş sonuçları üzerinden yapılır. Hiçbir hesabınıza erişim istemiyoruz.",
    },
    {
      soru: "GTIN'im yoksa ne yapmalıyım?",
      cevap:
        "Kendi ürettiğiniz ürünlerde GTIN bulunmayabilir. Bu durumda marka ve MPN bilgisinin eksiksiz verilmesi önem kazanır; platform bu ayrımı gözeterek değerlendirme yapar.",
    },
    {
      soru: "Reklam veriyor olmam gerekiyor mu?",
      cevap:
        "Hayır. Analiz ücretli reklamlarınızdan bağımsızdır; ürün verinizin yapısal kalitesini ölçer.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "AI SEO", href: "/ai-seo" },
  ],
};

export const AI_SEO: PazarlamaSayfasiIcerigi = {
  slug: "ai-seo",
  ustBaslik: "AI Görünürlüğü",
  baslik: "Yapay zekâ aramalarında görünüyor musunuz?",
  aciklama:
    "Arama artık yalnızca on mavi bağlantıdan ibaret değil. Markanızın ve ürünlerinizin yapay zekâ destekli cevaplarda ne kadar yer aldığını ölçün.",
  metaBaslik: "AI SEO — Yapay zekâ aramalarında marka görünürlüğü",
  metaAciklama:
    "AI görünürlüğü analizi: marka bahsedilmeleri, içerik güvenilirliği, konu otoritesi ve soru kapsama oranı. Yeni nesil arama için SEO.",
  giris: [
    "Kullanıcılar giderek daha sık, bir liste yerine doğrudan cevap veren arama deneyimlerini kullanıyor. Bu cevaplar web genelindeki içeriklerden besleniyor ve markanız orada geçmiyorsa, arama sonucunda hiç var olmamış gibi oluyorsunuz.",
    "Bu yeni alan klasik sıralama takibiyle ölçülemiyor. Önemli olan kaçıncı sırada olduğunuz değil, markanızın ne kadar çok güvenilir kaynakta anıldığı ve içeriğinizin makine tarafından ne kadar net okunabildiği.",
    "SEO Evi bu sinyalleri ölçerek 100 üzerinden bir AI Görünürlüğü skoru üretir ve skoru yükseltmek için ne yapmanız gerektiğini söyler.",
    "Yapay zekâ cevapları arama sonuçlarının üstüne yerleşti ama altındaki mantık değişmedi: kaynak gösterilen siteler, e-ticaret SEO temelleri sağlam olan siteler oluyor.",
  ],
  ozellikler: [
    {
      baslik: "Marka görünürlüğü",
      metin:
        "Markanızın web genelinde kaç farklı kaynakta ve hangi bağlamda anıldığı ölçülür.",
    },
    {
      baslik: "İçerik güvenilirliği",
      metin:
        "Yapısal veri kullanımınız ve kazandığınız öne çıkan snippet'ler, içeriğinizin makine tarafından güvenle okunabilirliğini gösterir.",
    },
    {
      baslik: "Konu otoritesi",
      metin:
        "Kendi alanınızdaki sıralama gücünüz ve dış bağlantı otoriteniz birlikte değerlendirilir.",
    },
    {
      baslik: "Ürün görünürlüğü",
      metin: "Ürünlerinizin alışveriş ve karşılaştırma sonuçlarında görünme oranı ölçülür.",
    },
    {
      baslik: "Soru kapsama oranı",
      metin:
        "Kullanıcıların sorduğu soruların kaçına sizin sayfalarınızın cevap verdiği hesaplanır.",
    },
    {
      baslik: "Marka bahsedilmeleri",
      metin:
        "Markanızın geçtiği içerikler tek tek listelenir; yapay zekâ cevaplarının hangi kaynaklardan beslendiğini görürsünüz.",
    },
  ],
  adimlar: [
    {
      baslik: "Markanız taransın",
      metin: "Marka adınızın web genelindeki bahsedilmeleri ve bağlamları toplanır.",
    },
    {
      baslik: "Sinyaller ölçülsün",
      metin:
        "Yapısal veri kapsamanız, snippet kazanımlarınız ve soru kapsamanız birlikte hesaplanır.",
    },
    {
      baslik: "Açıkları kapatın",
      metin:
        "Skorunuzu düşüren sinyaller ve bunları iyileştirmek için yapılacaklar listelenir.",
    },
  ],
  sss: [
    {
      soru: "Bu skor tam olarak neyi ölçüyor?",
      cevap:
        "Yapay zekâ sistemlerinin içeriğinizi bulup güvenerek kullanabilme olasılığını etkileyen sinyalleri ölçer: marka bahsedilmeleri, yapısal veri kapsaması, konu otoritesi, ürün görünürlüğü ve soru kapsama oranı. Bir sohbet asistanının cevabını doğrudan sorgulamaz.",
    },
    {
      soru: "Skoru nasıl yükseltirim?",
      cevap:
        "Genellikle en hızlı kazanç, yapısal veri kapsamanızı artırmak ve kullanıcıların sorduğu soruları doğrudan cevaplayan içerikler eklemekten gelir. Platform size sıraya dizilmiş bir liste verir.",
    },
    {
      soru: "Bu alan yeni, veriler ne kadar güvenilir?",
      cevap:
        "Ölçtüğümüz sinyaller gerçek ve doğrulanabilir verilerdir. Tahmin ürettiğimiz yerlerde bunu açıkça belirtiriz; hiçbir sayıyı olduğundan kesin göstermeyiz.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
    { etiket: "Google Alışveriş SEO", href: "/google-shopping-seo" },
  ],
};

export const TEKNIK_SEO_ANALIZI: PazarlamaSayfasiIcerigi = {
  slug: "teknik-seo-analizi",
  ustBaslik: "Teknik SEO",
  baslik: "Teknik SEO analizi",
  aciklama:
    "Sitenizin taranabilirliğini, indekslenebilirliğini ve site mimarisini kontrol edin. 100 üzerinden teknik SEO skorunuzu ve açık sorunlarınızı görün.",
  metaBaslik: "Teknik SEO Analizi — Site taraması ve teknik SEO skoru",
  metaAciklama:
    "Teknik SEO analizi aracı: tarama, indeksleme, meta veriler, başlık yapısı, iç bağlantılar ve yapısal veri kontrolü. Türkçe SEO platformu.",
  giris: [
    "İçerik ne kadar iyi olursa olsun, arama motoru sayfanıza ulaşamıyor veya sayfayı indeksleyemiyorsa görünürlük oluşmaz. Teknik SEO, diğer tüm çalışmaların üzerine kurulduğu zemindir.",
    "Teknik sorunların çoğu gözle fark edilmez: yanlış canonical etiketi, kazara eklenmiş bir noindex, derinlerde kalmış ürün sayfaları veya yinelenen başlıklar.",
    "SEO Evi sitenizin sayfalarını tarar, bulduğu sorunları önem derecesine göre sınıflandırır ve her biri için ne yapmanız gerektiğini açıklar.",
    "Teknik sorunlar düzeldiğinde geriye asıl iş kalır: doğru kelimeleri hedeflemek ve ürün sayfalarını güçlendirmek. E-ticaret SEO teknikle başlar ama orada bitmez.",
  ],
  ozellikler: [
    {
      baslik: "Teknik SEO skoru",
      metin:
        "Tarama, indeksleme, meta veriler, başlık yapısı, bağlantılar, görseller, yapısal veri ve site mimarisi ayrı ayrı puanlanır.",
    },
    {
      baslik: "Başlık ve açıklama kontrolü",
      metin:
        "Eksik, çok kısa, çok uzun veya yinelenen başlık ve meta açıklamalar tespit edilir.",
    },
    {
      baslik: "İndekslenebilirlik",
      metin:
        "Noindex etiketi, robots kuralları ve canonical hataları nedeniyle indekslenemeyen sayfalar listelenir.",
    },
    {
      baslik: "Kırık bağlantılar ve yönlendirmeler",
      metin:
        "Çalışmayan bağlantılar, yönlendirme zincirleri ve hatalı durum kodları bulunur.",
    },
    {
      baslik: "Site mimarisi",
      metin:
        "Tıklama derinliği fazla olan ve hiçbir sayfadan bağlantı almayan yetim sayfalar ortaya çıkarılır.",
    },
    {
      baslik: "Görseller ve yapısal veri",
      metin:
        "Alt metni olmayan görseller ve yapısal işaretlemesi bulunmayan sayfalar raporlanır.",
    },
  ],
  adimlar: [
    {
      baslik: "Tarama başlatın",
      metin: "Sitenizin sayfaları sırayla taranır; tarama sayfa sayısını siz belirlersiniz.",
    },
    {
      baslik: "Sorunlar sınıflandırılsın",
      metin: "Bulgular kritik, uyarı ve bilgi olarak ayrılır ve kategorilere göre gruplanır.",
    },
    {
      baslik: "Kritik olanları düzeltin",
      metin:
        "Her sorun için etkilenen sayfa sayısı ve tahmini etkisi gösterilir; nereden başlayacağınızı düşünmeniz gerekmez.",
    },
  ],
  sss: [
    {
      soru: "Sitem taranırken yavaşlar mı?",
      cevap:
        "Tarama, sitenizi zorlamayacak hızda yapılır. Yine de tarama sayfa sayısını ayarlardan istediğiniz zaman düşürebilirsiniz.",
    },
    {
      soru: "Ne sıklıkta tarama yapılmalı?",
      cevap:
        "Çoğu mağaza için haftalık tarama yeterlidir. Sık ürün ekleyen mağazalarda günlük tarama tercih edilebilir; bunu ayarlardan belirlersiniz.",
    },
    {
      soru: "robots.txt dosyamı değiştirmem gerekir mi?",
      cevap:
        "Hayır. Tarayıcımız sitenizin herkese açık sayfalarını standart bir tarayıcı gibi okur; özel bir izin veya yapılandırma gerekmez.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
    { etiket: "Ücretsiz SEO Analizi", href: "/ucretsiz-seo-analizi" },
  ],
};

export const ANAHTAR_KELIME_ARACI: PazarlamaSayfasiIcerigi = {
  slug: "anahtar-kelime-arastirma-araci",
  ustBaslik: "Anahtar Kelime",
  baslik: "Anahtar kelime araştırma aracı",
  aciklama:
    "Arama hacmi, rekabet, zorluk ve arama amacını birlikte görün. Hangi kelimenin size gerçekten satış getireceğini fırsat skoruyla ölçün.",
  metaBaslik: "Anahtar Kelime Araştırma Aracı — Türkçe arama hacmi ve zorluk",
  metaAciklama:
    "Türkçe anahtar kelime araştırma aracı: arama hacmi, CPC, rekabet, zorluk ve arama amacı. Fırsat skoruyla önceliklendirilmiş kelime listesi.",
  giris: [
    "Anahtar kelime araştırmasında en sık yapılan hata, yalnızca arama hacmine bakmaktır. Yüksek hacimli bir kelime çoğu zaman en zorlu rekabete sahiptir ve aylarca uğraşmanıza rağmen ilk sayfaya giremezsiniz.",
    "Doğru soru şu: hangi kelimede, bugünkü gücümle, makul bir sürede sıralanabilirim ve bu bana satış getirir mi?",
    "SEO Evi her kelimeye 0-100 arası bir fırsat skoru verir. Arama hacmi, rekabet, mevcut sıralamanız, SERP yapısı ve ticari niyet birlikte değerlendirilir; liste doğrudan önceliğe göre sıralanır.",
    "Doğru kelimeyi seçmek işin yarısı; o kelimede sıralanacak sayfanın hazır olması diğer yarısı. E-ticaret SEO ikisini birlikte yürütmeyi gerektirir.",
  ],
  ozellikler: [
    {
      baslik: "Arama hacmi ve trend",
      metin:
        "Aylık arama hacmi ve son dönemdeki değişim; mevsimsel ürünlerde ne zaman hazırlanmanız gerektiğini gösterir.",
    },
    {
      baslik: "Zorluk ve rekabet",
      metin:
        "Kelimede sıralanmanın ne kadar zor olduğu ve reklam rekabetinin yoğunluğu birlikte sunulur.",
    },
    {
      baslik: "Arama amacı",
      metin:
        "Kelime bilgi mi, ticari mi, işlem mi amaçlıyor? İçeriğin türünü bu belirler.",
    },
    {
      baslik: "Fırsat skoru",
      metin:
        "Tüm sinyaller tek bir 0-100 puanında toplanır. Listeyi bu puana göre sıralayıp en üstten başlarsınız.",
    },
    {
      baslik: "Uzun kuyruk kelimeler",
      metin:
        "Daha az rekabetli, niyeti net ve dönüşümü yüksek uzun kuyruk varyasyonları çıkarılır.",
    },
    {
      baslik: "SERP önizleme",
      metin:
        "Kelimenin arama sonucunda ne göründüğünü — alışveriş kutusu, öne çıkan snippet, soru kümesi — önceden görürsünüz.",
    },
  ],
  adimlar: [
    {
      baslik: "Kelimeyi veya alan adını girin",
      metin:
        "Tek bir kelimeden başlayabilir ya da alan adınızın hâlihazırda sıralandığı tüm kelimeleri çekebilirsiniz.",
    },
    {
      baslik: "Veriler zenginleştirilsin",
      metin:
        "Hacim, zorluk, amaç ve mevcut sıralamanız tek tabloda birleştirilir.",
    },
    {
      baslik: "Fırsatları takibe alın",
      metin:
        "Seçtiğiniz kelimeler takip listenize eklenir; sıralama değişimleri düzenli olarak ölçülür.",
    },
  ],
  sss: [
    {
      soru: "Arama hacimleri Türkiye'ye mi ait?",
      cevap:
        "Evet. Varsayılan konum Türkiye, dil Türkçe'dir. Veriler Türkiye'deki gerçek arama hacimlerini yansıtır.",
    },
    {
      soru: "Zorluk skoru nasıl hesaplanıyor?",
      cevap:
        "Kelimede ilk sayfada yer alan sitelerin otoritesi ve rekabet yoğunluğu birlikte değerlendirilir. Skor yükseldikçe sıralanmak zorlaşır.",
    },
    {
      soru: "Kaç kelime takip edebilirim?",
      cevap:
        "Takip edilen kelime sayısı paketinize göre değişir. Fiyatlandırma sayfasındaki tabloda tüm limitleri görebilirsiniz.",
    },
  ],
  ilgiliSayfalar: [
    { etiket: "E-ticaret SEO", href: "/" },
    { etiket: "Rakip SEO Analizi", href: "/rakip-seo-analizi" },
    { etiket: "SEO Aracı", href: "/seo-araci" },
    { etiket: "Ürün sayfası SEO", href: "/e-ticaret-seo" },
  ],
};

/** Site haritası için tüm pazarlama sayfaları. */
export const PAZARLAMA_SAYFALARI: PazarlamaSayfasiIcerigi[] = [
  SEO_ARACI,
  ETICARET_SEO,
  RAKIP_SEO_ANALIZI,
  GOOGLE_SHOPPING_SEO,
  AI_SEO,
  TEKNIK_SEO_ANALIZI,
  ANAHTAR_KELIME_ARACI,
];
