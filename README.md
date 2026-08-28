# SEO Evi

E-ticaret siteleri için SEO karar destek platformu. Teknik SEO, anahtar kelimeler, rakipler,
içerik, Google Alışveriş (Merchant) ve AI görünürlüğünü tek bir uygulamada birleştirir.

Amaç rapor üretmek değil, **"bu hafta neyi düzeltirsem en çok kazanırım?"** sorusuna cevap vermek.

---

## İçindekiler

- [Mimari](#mimari)
- [Kurulum](#kurulum)
- [Ortam değişkenleri](#ortam-değişkenleri)
- [Supabase kurulumu](#supabase-kurulumu)
- [Google ile giriş](#google-ile-giriş)
- [DataForSEO](#dataforseo)
- [Arka plan işleri ve cron](#arka-plan-işleri-ve-cron)
- [Geliştirme](#geliştirme)
- [Dizin yapısı](#dizin-yapısı)
- [Vercel dağıtımı](#vercel-dağıtımı)
- [Yayın öncesi kontrol listesi](#yayın-öncesi-kontrol-listesi)

---

## Mimari

Tek bir Next.js uygulaması. **Ayrı yönetim paneli veya ikinci bir arayüz yoktur**; tüm
kullanıcı deneyimi `seoevi.com.tr` üzerindedir.

| Katman | Teknoloji |
| --- | --- |
| Uygulama | Next.js 15 (App Router), React 19, TypeScript |
| Arayüz | Tailwind CSS 4, lucide-react |
| Veritabanı / kimlik | Supabase (PostgreSQL + Auth), satır bazlı güvenlik (RLS) |
| SEO verisi | DataForSEO (yalnızca sunucu tarafında) |
| Yapay zekâ | Anthropic (yalnızca sunucu tarafında, `/api/ai` üzerinden) |
| Dağıtım | Vercel |

Veri akışı tek yönlüdür ve istemci hiçbir zaman dış servise doğrudan çıkmaz:

```
Tarayıcı → Server Action / Route Handler → doğrulama → önbellek kontrolü
        → DataForSEO → normalizasyon → Supabase → Tarayıcı
```

**Güvenlik ilkeleri**

- `DATAFORSEO_*`, `SUPABASE_SERVICE_ROLE_KEY` ve `AI_PROVIDER_KEY` yalnızca sunucuda okunur.
  Bu değerleri kullanan modüller `server-only` ile işaretlenmiştir.
- Her tabloda RLS açıktır; bir kullanıcı başka bir kullanıcının verisini göremez.
- Plan limitleri her zaman sunucu tarafında doğrulanır; arayüze güvenilmez.
- Oturum çerezleri `httpOnly`, `sameSite=lax` ve canlıda `secure` olarak ayarlanır.

---

## Kurulum

Gereksinimler: Node.js 20+ ve bir Supabase projesi.

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run db:migrate
npm run dev
```

Uygulama <http://localhost:3000> adresinde çalışır.

---

## Ortam değişkenleri

Tüm değişkenler `.env.example` dosyasında açıklamalarıyla listelenmiştir.
Gerçek değerleri asla depoya eklemeyin.

| Değişken | Zorunlu | Açıklama |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | evet | Canlıda `https://seoevi.com.tr` |
| `NEXT_PUBLIC_SUPABASE_URL` | evet | Supabase proje adresi |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | evet | Tarayıcıya gönderilebilir anahtar |
| `SUPABASE_SERVICE_ROLE_KEY` | evet | **Yalnızca sunucu.** RLS'yi aşar |
| `SUPABASE_DB_URL` | migration için | `npm run db:migrate` bu bağlantıyı kullanır |
| `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD` | evet | **Yalnızca sunucu** |
| `DATAFORSEO_MODE` | hayır | `live` veya `sandbox` (geliştirmede maliyeti düşürür) |
| `AI_PROVIDER` / `AI_PROVIDER_KEY` / `AI_MODEL` | AI özellikleri için | **Yalnızca sunucu** |
| `CRON_SECRET` | evet | `/api/isler/calistir` uç noktasını korur; kota özet tuzu |
| `GUNLUK_HARCAMA_TAVANI_USD` | hayır | Günlük sağlayıcı harcama tavanı (varsayılan 25) |
| `SIRA_BULUCU_GUNLUK_TAVAN` | hayır | Sıra Bulucu günlük toplam sorgu tavanı (varsayılan 400) |

---

## Supabase kurulumu

1. [supabase.com](https://supabase.com) üzerinde yeni bir proje oluşturun.
2. **Project Settings → API** bölümünden `URL`, `anon key` ve `service_role key` değerlerini alın.
3. **Project Settings → Database** bölümünden bağlantı dizesini alıp `SUPABASE_DB_URL` olarak yazın.
4. Migration'ları çalıştırın:

```bash
npm run db:migrate
```

`supabase/migrations` altındaki dosyalar sırayla uygulanır:

| Dosya | İçerik |
| --- | --- |
| `0001_schema.sql` | Tüm tablolar, indeksler ve yardımcı fonksiyonlar |
| `0002_rls.sql` | Satır bazlı güvenlik politikaları |
| `0003_seed.sql` | Paketler, limitler ve sistem ayarları |
| `0004_gorunumler.sql` | `kelime_ozet` ve `sayfa_ozet` görünümleri |
| `0005_migration_rls.sql` | `schema_migrations` tablosunun kilitlenmesi |
| `0006_paketler_maliyet.sql` | Maliyet tabanlı paket limitleri ve deneme paketi |
| `0007_kotalar.sql` | Ücretsiz araç kotaları ve hesap kısıtlama bayrağı |
| `0008_onbellek_sureleri.sql` | Maliyete göre önbellek süreleri ve yenileme yaşları |
| `0009_paketler_yeni_fiyat.sql` | 499 / 999 / 1.499 TL fiyat noktaları ve limitleri |
| `0010_etki_takibi.sql` | Aksiyon etki ölçümü |
| `0011_yetkili_alani.sql` | Sayfa üst verileri, marka ayarları, yönetim kaydı |
| `0012_pazaryeri_radari.sql` | Pazaryeri baskısı ve ürün stok geçmişi |
| `0013_search_console.sql` | Search Console bağlantısı, günlük anlık görüntü, alarmlar |

> **Not:** Migration'lar tekrar çalıştırılabilir (idempotent) biçimde yazılmıştır.

### Paketler ve maliyet modeli

Paketler, fiyatlar ve limitler kodda sabit değildir; `plans` tablosunda tutulur.
Fiyat veya limit değiştirmek için kodu güncellemeniz gerekmez.

Limitler tahminle değil, **DataForSEO'nun kendi fiyat listesindeki birim maliyetlerle**
belirlenmiştir (`src/lib/maliyet.ts`). Her paketin aylık en kötü durum maliyeti gelirin
%25'ini aşmayacak biçimde hesaplanır:

| İşlem | Birim maliyet |
| --- | --- |
| SERP (canlı) | $0,002 / sorgu |
| OnPage tarama | $0,00015 / sayfa |
| DataForSEO Labs | $0,00012 + $0,012 / 1000 satır |
| Google Ads anahtar kelime | **$0,09 / çağrı** (en pahalı) |
| Geri bağlantı | $0,000036 + $0,024 / 1000 satır |
| Merchant görevi | $0,001 / görev |

| Paket | Fiyat | Aylık API maliyeti | Gelir oranı |
| --- | --- | --- | --- |
| Ücretsiz Deneme | — | $0,51 (kayıt başına) | — |
| Başlangıç | 499 TL | $2,50 | %24,1 |
| Profesyonel | 999 TL | $5,15 | %24,8 |
| Kurumsal | 1.499 TL | $7,74 | %24,8 |

```bash
npm run tani:maliyet   # her paketin maliyet dökümü ve gelir oranı
```

> **Kur riski.** Fiyatlar TL, maliyetler USD cinsindendir. `src/lib/maliyet.ts`
> içindeki `USD_TRY` değeri güncel tutulmalı; lira değer kaybettikçe maliyet oranı
> yükselir ve limitlerin gözden geçirilmesi gerekir.

Paketler: **Ücretsiz Deneme, Başlangıç (499 TL), Profesyonel (999 TL), Kurumsal (1.499 TL), Konuşalım**.

Özellik merdiveni: Başlangıç çekirdek analizleri kapsar; Profesyonel geri bağlantı ve
Merchant'ı ekler; Kurumsal AI görünürlüğünü de açar. Proje sayısı cömert tutulmuştur
çünkü SERP ve tarama limitleri hesap genelinde ortak havuzdur — proje eklemek ek
maliyet üretmez.

---

## Google Search Console

Platformdaki en değerli veri kaynağı. Şimdiye kadar trafik ve tıklama oranı
sıralamalardan **tahmin** ediliyordu; Search Console bağlandığında bunlar
Google'ın kendi kaydından gelen **gerçek ölçümlere** dönüşür.

> **Önemli:** Search Console verisi siteye özeldir ve **API anahtarıyla
> erişilemez**. `AIza…` biçimindeki anahtarlar yalnızca herkese açık API'ler
> içindir. Burada OAuth 2.0 istemcisi (Client ID + Secret) gerekir.

Kurulum:

1. Google Cloud Console → **APIs & Services → Library** → *Google Search Console API*'yi etkinleştirin.
2. **Credentials → Create Credentials → OAuth client ID → Web application**.
3. Yetkili yönlendirme adreslerine ekleyin:
   - `https://seoevi.com.tr/api/gsc/callback`
   - `http://localhost:3000/api/gsc/callback` (geliştirme)
4. Client ID ve Secret'ı `.env.local` içine yazın.
5. Panelde **Ayarlar → Google Search Console → Bağla**.

Bağlantı kurulduğunda cron günde bir kez son 28 günün sorgu ve sayfa
performansını çeker. Google API'si ücretsizdir; sağlayıcı maliyeti yoktur.

**Güvenlik:** Yenileme anahtarı `gsc_connections` tablosunda tutulur ve bu
tabloya `anon`/`authenticated` rollerinin erişimi tamamen kapalıdır — yalnızca
sunucu okuyabilir. Yalnızca `webmasters.readonly` kapsamı istenir. OAuth akışı
`state` çerezi ile CSRF'e karşı korunur.

---

## Günlük alarmlar

Kullanıcı sabah panele girdiğinde "dün ne oldu?" sorusunun cevabını görmeli.
Her gün bir anlık görüntü alınır (`daily_snapshot`) ve alarmlar iki gün
arasındaki farktan üretilir:

- organik görünürlük düşüşü / artışı
- belirli bir eşiğin üstünde gerileyen anahtar kelimeler
- yeni kazanılan kelimeler
- birden fazla kelimede düşen sayfalar

Eşiklerin altındaki değişimler gürültü sayılır ve alarm üretmez — her gün
kırmızı gösteren bir panel kısa sürede görmezden gelinir. Eşikler
`app_config.alarm_esikleri` üzerinden ayarlanır.

---

## Etki Takibi

Platformun asıl farklılaşma noktası. Çoğu SEO aracı veri gösterir; SEO Evi yapılan
işin sonuç verip vermediğini ölçer.

Kullanıcı bir aksiyonu **tamamlandı** olarak işaretlediğinde, o aksiyonun etkilediği
sayfalarda sıralanan kelimelerin o anki durumu dondurulur. Sonraki günlerde aynı
kelimeler yeniden ölçülür ve fark gösterilir:

- ortalama sıra değişimi
- aylık tahmini ziyaret değişimi
- **bu trafiği reklamla almanın maliyeti** (kelimelerin CPC'sinden hesaplanır)

Ölçüm, düzenli analizlerde zaten toplanan sıralama verisinden okunur; **ek DataForSEO
çağrısı yapılmaz**, bu özelliğin sağlayıcı maliyeti sıfırdır. Ölçüm penceresi ve
aralığı `app_config.etki_takibi` üzerinden ayarlanır (varsayılan: 3. günde başlar,
3 günde bir ölçer, 45 gün sonra kapanır).

> **Dürüstlük notu:** Sıralamalar başka nedenlerle de değişir — algoritma güncellemesi,
> rakip hamlesi, mevsimsellik. Arayüzde nedensellik iddia edilmez; "bu aksiyondan sonra
> şu oldu" denir. Bu bilinçli bir üründür kararıdır.

---

## E-ticarete özgü analizler

Genel amaçlı SEO araçlarında bulunmayan, Türkiye e-ticaret gerçeğine göre
tasarlanmış iki analiz.

### Pazaryeri Radarı

Türkiye'de bir e-ticaret sitesinin en büyük SEO rakibi genellikle başka bir mağaza
değil, **kendi ürününü de satan pazaryeridir**. Aynı ürün için Trendyol üstte
çıktığında satış olmuyor değil — oluyor, ama komisyonlu kanaldan. Bu doğrudan kâr
kaybıdır ve hiçbir uluslararası araç bunu ölçmez.

Radar, takip edilen kelimelerin mevcut SERP kayıtlarını tarayıp:

- hangi pazaryeri / fiyat karşılaştırma / perakende oyuncusunun nerede olduğunu,
- kaç kelimede sizden üstte olduklarını,
- bu yüzden aylık kaç ziyaret kaybettiğinizi

çıkarır. Oyuncu listesi `src/config/pazaryerleri.ts` içindedir ve tür bazında
tehdit ağırlığı taşır (pazaryeri > fiyat karşılaştırma > perakende > içerik).

**Ek sağlayıcı maliyeti yoktur** — mevcut SERP verisinden üretilir.

### Mevsimsellik

SEO'nun sonuç vermesi haftalar alır; talep zirvesinde işe başlamak o sezonu
kaybetmektir. `src/lib/analiz/mevsimsellik.ts` her kelimenin son 12 aylık
arama hacminden zirve ayını bulur ve "şimdi başlamazsan yetişemezsin" uyarısı
üretir. Türkiye ticaret takvimi (Ramazan, okula dönüş, Efsane Cuma, yılbaşı)
kelime zirveleriyle eşleştirilir.

### Sayfa çakışması (yamyamlık)

Aynı kelimede sitenizin birden fazla sayfası yarışıyorsa Google hangisini öne
çıkaracağını bilemez; sinyaller bölünür. E-ticarette çok yaygındır: ürün
varyantları, kategori/alt kategori çakışması, blog ile ürün sayfası.

### Fiyat konumu

Google Alışveriş'te ilk sırada olsanız bile en pahalı satıcıysanız tıklama
başkasına gider. Merchant analizinde toplanan satıcı ve fiyat verisinden
"bu üründe fiyatım nerede duruyor" sorusu cevaplanır.

### Stok–sıralama çakışması

E-ticarette sessizce en çok para kaybettiren durum: ürün Google'da iyi sıralanıyor,
trafik alıyor, ama stokta yok. Ziyaretçi boş dönüyor; artan hemen çıkma oranı
zamanla sıralamayı da düşürüyor.

`src/lib/analiz/stok.ts` "sıralanıyor ama satılamıyor" ürünleri bulur, kaybedilen
trafiği hesaplar ve `product_stock_history` üzerinden kaç gündür tükendiğini izler.
İkisi de Aksiyon Merkezi'ne aksiyon olarak düşer.

---

## Yetkili alanı

**Ayrı bir yönetim uygulaması veya alan adı yoktur.** Yönetim işlemleri aynı Next.js
uygulaması içindeki `/yetkili` yolunda, yalnızca `profiles.role = 'yetkili'` olan
kullanıcılara açık biçimde yapılır.

| Bölüm | Ne yapılır |
| --- | --- |
| `/yetkili` | Kullanıcı ve abone sayısı, sağlayıcı maliyeti, son yönetim işlemleri |
| `/yetkili/kullanicilar` | Paket ve abonelik durumu değiştirme, hesap kısıtlama |
| `/yetkili/marka` | Logo ve favicon yükleme |
| `/yetkili/sayfa-bilgileri` | Her herkese açık sayfanın başlık ve açıklaması |

Bir kullanıcıyı yetkili yapmak için:

```bash
npm run tani:yetkili -- eposta@ornek.com
npm run tani:yetkili -- eposta@ornek.com kaldir   # yetkiyi geri al
```

**Güvenlik.** Erişim üç katmanda denetlenir: middleware yolu korur, sayfa düzeni
rolü doğrular, ve **her sunucu eylemi kendi başına yetki kontrolü yapar** — arayüzde
gizlemek yeterli sayılmaz. Paket değiştirme gibi işlemler `admin_log` tablosuna
öncesi/sonrası bilgisiyle kaydedilir.

**Marka ve üst veriler.** Logo Supabase Storage'daki herkese açık `marka` klasörüne
yüklenir; adres `app_config.marka` içinde tutulur. Sayfa başlık/açıklamaları
`page_meta` tablosundadır. İkisi de boş bırakıldığında koddaki varsayılan kullanılır,
bu yüzden boş bir kurulumda site doğru çalışır.

---

## Kötüye kullanım önlemleri

Her DataForSEO ve yapay zekâ çağrısının parasal karşılığı olduğu için harcama
birden çok katmanda korunur.

**Hesap açanlara karşı.** Kayıt olan kullanıcı Başlangıç limitleriyle değil, ayrı bir
**Ücretsiz Deneme** paketiyle başlar (kayıt başına azami ~$0,51 maliyet). Maliyetli her
uç noktanın başında `harcamaIzni()` çalışır ve şunları doğrular:

- E-posta doğrulanmış mı (Supabase'de *Confirm email* açık olmalı)
- Geçici/tek kullanımlık e-posta sağlayıcısı mı
- Hesap kısıtlanmış mı (`profiles.is_blocked`)
- Abonelik aktif mi

Ayrıca bir kullanıcı aynı anda en fazla 2 analiz çalıştırabilir; kuyruğu tek hesap dolduramaz.

**Herkese açık araçlara karşı.** Oturum olmadığı için kota cihaz ve ağ imzasına bağlanır:

- **Parmak izi** (donanım + tarayıcı özellikleri, çerezden bağımsız) → gizli sekmeyi ve
  çerez temizliğini aşar. Günde 3 sorgu.
- **IP** → aynı cihazda farklı tarayıcıyı yakalar. Günde 12 sorgu; paylaşımlı ağlar
  (mobil operatör, ofis) tek IP arkasında çok kullanıcı barındırdığı için daha geniş tutulur.

Sayaçlar `free_tool_quota` tablosunda, satır kilidiyle atomik olarak artırılır; eşzamanlı
isteklerde fazladan hak verilmez. Kota günü **Europe/Istanbul** saatine göre yazıldığından
haklar her gece **00.00'da** kendiliğinden sıfırlanır — ayrı bir zamanlanmış işe gerek yoktur.

> **Dürüst sınır:** VPN ve farklı cihazlarla kişisel kotayı aşmak teknik olarak mümkündür.
> Kesin koruma bu katmanlarda değil, `SIRA_BULUCU_GUNLUK_TAVAN` ve
> `GUNLUK_HARCAMA_TAVANI_USD` tavanlarındadır; toplam harcama her koşulda sınırlıdır.

---

## Google ile giriş

1. Google Cloud Console'da bir OAuth 2.0 istemcisi oluşturun.
2. İzin verilen yönlendirme adresine şunu ekleyin:
   `https://<proje-referansi>.supabase.co/auth/v1/callback`
3. Supabase panelinde **Authentication → Providers → Google** bölümüne
   Client ID ve Client Secret değerlerini girin.
4. **Authentication → URL Configuration** altında Site URL ve Redirect URL değerlerini ayarlayın
   (geliştirmede `http://localhost:3000/auth/callback`).

---

## DataForSEO

> **Hesap doğrulaması zorunludur.** DataForSEO, doğrulanmamış hesaplarda tüm veri uç
> noktalarını `40104` koduyla reddeder — kimlik bilgileri doğru olsa bile. Doğrulamayı
> [app.dataforseo.com](https://app.dataforseo.com/) üzerinden tamamlayın. Doğrulanana
> kadar site taraması, anahtar kelime, SERP, rakip, backlink ve Merchant analizleri
> çalışmaz; uygulama bu durumda çökmez, kullanıcıya anlaşılır bir mesaj gösterir.
> Durumu `npm run seo:kontrol` ile doğrulayabilirsiniz.
>
> Bakiyenin de yeterli olması gerekir. Tek bir tam site analizi (tarama + anahtar
> kelime + rakip) tipik olarak birkaç dolar tutar; $1 bakiye yalnızca birkaç çağrıya yeter.

Kimlik bilgileri yalnızca sunucuda kullanılır ve hiçbir koşulda tarayıcıya gönderilmez.

### Maliyet kontrolü

Her çağrı `api_cache` üzerinden geçer. Akış:

```
İstek → önbellek anahtarı → taze kayıt var mı?
  ├─ var        → kayıttan dön        (maliyet: 0)
  ├─ uçuşta var → aynı çağrıyı bekle  (maliyet: 0)
  └─ yok        → sağlayıcı → maliyeti ölç → kaydet → dön
```

Dört ayrı tasarruf katmanı vardır:

**1. Kullanıcılar arası paylaşım.** Önbellek anahtarı `endpoint + parametreler`
özetinden üretilir; kullanıcı veya proje içermez. `"vestel buzdolabı"` SERP sonucu
kimin sorduğundan bağımsız olarak aynı olduğundan, ikinci kullanıcıdan itibaren
maliyet sıfırdır.

**2. Tazelik politikası.** Kullanıcı "Yenile" dediğinde önbellek körü körüne
atlanmaz. Üç mod vardır:

| Mod | Davranış |
| --- | --- |
| `onbellek` (varsayılan) | Süresi dolmadıysa kayıttan ver |
| `yenile` | Kayıt asgari yaştan gençse yine kayıttan ver |
| `zorla` | Önbelleği tamamen atla (yalnızca hata ayıklama) |

Arka arkaya yenileme tıklamaları ve aynı alan adını analiz eden farklı projeler
aynı veriyi iki kez satın almaz.

**3. Uçuştaki istekleri birleştirme.** Aynı anda gelen özdeş istekler tek
sağlayıcı çağrısına iner. Popüler bir kelimeyi aynı saniyede beş kullanıcı
sorgularsa bir kez ödenir.

**4. Veri hızına göre süreler.** Google Ads arama hacimleri aylık güncellendiği
için `keyword_data` 7 gün saklanır — üstelik çağrı başına $0,09 ile en pahalı uç
noktadır. Sıralama takibi tazelik gerektirdiğinden `serp` 6 saatte kalır; ücretsiz
araçlar ise ayrı `serp_arac` grubuyla 24 saat kullanır.

Süreler ve asgari yenileme yaşları `app_config` tablosundadır
(`onbellek_sureleri`, `yenileme_asgari_yasi`) — kod dağıtmadan değiştirilebilir.

Gerçekleşen sağlayıcı maliyeti her kayda yazılır (`api_cache.cost`); bu sayede
hem günlük harcama tavanı çalışır hem de tasarruf ölçülebilir:

```bash
npm run tani:onbellek    # isabet oranı, harcanan ve tasarruf edilen tutar
```

Konum ve dil kimlikleri sabit yazılmaz; DataForSEO'nun konum uç noktasından okunur
(`src/lib/dataforseo/locations.ts`). Varsayılan pazar Türkiye / Türkçe'dir.

Geliştirme sırasında maliyeti sıfırlamak için `DATAFORSEO_MODE=sandbox` kullanabilirsiniz.

---

## Arka plan işleri ve cron

Analizler kullanıcıyı bekletmez. `audit_jobs` tablosu bir iş kuyruğu olarak çalışır:
`bekliyor → isleniyor → tamamlandi | hatali | yeniden_deneniyor`.

Sunucusuz ortamda tek çağrının süresi sınırlı olduğundan işler adım adım ilerletilir.
Yarım kalan işleri tamamlamak için düzenli bir tetikleyici gerekir.

`vercel.json` dosyasına ekleyin:

```json
{
  "crons": [{ "path": "/api/isler/calistir", "schedule": "*/5 * * * *" }]
}
```

Uç nokta `CRON_SECRET` ile korunur. Elle tetiklemek için:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://seoevi.com.tr/api/isler/calistir
```

---

## Geliştirme

```bash
npm run dev         # geliştirme sunucusu
npm run build       # üretim derlemesi
npm run typecheck   # TypeScript denetimi
npm run lint        # ESLint
npm run test        # birim testleri (vitest)
npm run test:entegrasyon   # canlı Supabase'e karşı önbellek testleri
```

> `test:entegrasyon` gerçek veritabanına bağlanır. `tests/entegrasyon/gercek-cagri.test.ts`
> ayrıca sağlayıcıya gerçek istek atar ve bakiye harcar (~$0,004); varsayılan çalıştırmaya
> dahildir, atlamak için dosya adıyla filtreleyin.

### Tanı komutları

Kurulumun gerçekten çalıştığını doğrulamak için:

```bash
npm run seo:kontrol      # ortam + veritabanı + dış servisler (yayın öncesi kontrol)
npm run tani:db          # tablolar, RLS, politikalar, paketler
npm run tani:servis      # DataForSEO / Anthropic / Supabase bağlantısı
npm run tani:sayfalar    # tüm rotaları gerçek oturumla gezer (sunucu açıkken)
npm run tani:kullanici   # doğrulanmış test kullanıcısı oluşturur
npm run tani:onbellek    # önbellek isabet oranı ve maliyet tasarrufu
npm run tani:maliyet     # paket limitlerinin aylık maliyet dökümü
npm run tani:yetkili     # bir kullanıcıyı yetkili yapar / yetkisini alır
```

`npm run seo:kontrol` kritik bir eksik bulursa çıkış kodu 1 döndürür; CI adımı olarak
kullanılabilir. Hiçbir tanı komutu gizli değerleri ekrana yazmaz.

---

## Dizin yapısı

```
src/
├─ app/
│  ├─ (uygulama)/          Panel — giriş gerektiren tüm modüller
│  ├─ api/                 Route handler'lar (analiz, AI, işler, olaylar)
│  ├─ auth/                Oturum geri çağrısı ve çıkış
│  ├─ baslangic/           İlk kurulum akışı (onboarding)
│  ├─ projeler/yeni/       Proje oluşturma (panel düzeni dışında tutulur)
│  └─ <herkese-açık>/      Pazarlama, yasal metinler ve ücretsiz araçlar
├─ components/
│  ├─ app/                 Panele özel bileşenler
│  ├─ marketing/           Herkese açık sayfa bileşenleri
│  └─ ui/                  Yeniden kullanılabilir arayüz parçaları
├─ config/                 Site, menü ve pazarlama içerikleri
├─ lib/
│  ├─ analiz/              Alan mantığı (teknik, kelime, rakip, içerik, rapor…)
│  ├─ araclar/             Ücretsiz araçların mantığı
│  ├─ dataforseo/          Sağlayıcı istemcisi, önbellek ve normalizasyon
│  ├─ jobs/                İş kuyruğu ve adım yürütücüsü
│  ├─ scoring/             Skor hesaplamaları
│  └─ supabase/            İstemci, sunucu ve yönetici bağlantıları
└─ types/                  Veritabanı satır tipleri
```

> `/projeler/yeni` bilinçli olarak `(uygulama)` grubunun dışındadır: panel düzeni aktif proje
> bulunmadığında bu sayfaya yönlendirir; sayfa grubun içinde olsaydı sonsuz yönlendirme oluşurdu.

---

## Vercel dağıtımı

1. Depoyu Vercel'e bağlayın (framework otomatik algılanır).
2. **Settings → Environment Variables** altına `.env.local` içindeki tüm değerleri girin.
   `NEXT_PUBLIC_SITE_URL` değerini `https://seoevi.com.tr` yapın.
3. **Settings → Domains** altına `seoevi.com.tr` alan adını ekleyin.
4. Supabase **Authentication → URL Configuration** ayarlarını canlı alan adıyla güncelleyin.
5. Yukarıdaki cron tanımını ekleyin.

---

## Yayın öncesi kontrol listesi

- [ ] `npm run seo:kontrol` hatasız tamamlanıyor
- [ ] DataForSEO hesabı doğrulanmış ve bakiyesi yeterli
- [ ] `npm run typecheck`, `npm run lint` ve `npm run build` hatasız tamamlanıyor
- [ ] Migration'lar canlı veritabanında çalıştırıldı
- [ ] Tüm tablolarda RLS açık ve politikalar uygulanmış
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ve DataForSEO bilgileri yalnızca sunucu ortamında tanımlı
- [ ] `CRON_SECRET` üretilmiş ve cron tanımlanmış
- [ ] Google OAuth yönlendirme adresleri canlı alan adıyla güncellenmiş
- [ ] `plans` tablosundaki fiyat ve limitler gerçek değerlerle güncellenmiş
- [ ] `src/config/site.ts` içindeki `SIRKET` bilgileri gerçek değerlerle doldurulmuş
- [ ] KVKK, gizlilik ve kullanım koşulları metinleri hukuk danışmanına onaylatılmış
- [ ] `/sitemap.xml` ve `/robots.txt` doğru içerikle yanıt veriyor
- [ ] Mobil, tablet ve masaüstü görünümleri denendi
