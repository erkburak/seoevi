import "server-only";

import { aiGorunurlukAnaliziYap } from "@/lib/analiz/ai-gorunurluk";
import { aksiyonlariUret } from "@/lib/analiz/aksiyon";
import { serpToplamasiYap } from "@/lib/analiz/serp-toplama";
import { oneriUret } from "@/lib/analiz/ic-baglanti";
import { backlinkAnaliziYap } from "@/lib/analiz/backlink";
import { icerikAnaliziYap } from "@/lib/analiz/icerik";
import { merchantAnaliziYap } from "@/lib/analiz/merchant";
import { kelimeAnaliziYap } from "@/lib/analiz/kelime";
import { rakipAnaliziYap } from "@/lib/analiz/rakip";
import { taramaSonucunuIsle } from "@/lib/analiz/teknik";
import { DataForSeoHatasi } from "@/lib/dataforseo/client";
import { taramaBaslat, taramaOzeti } from "@/lib/dataforseo/onpage";
import { IS_ADIMLARI, type IsTuru } from "@/lib/jobs/types";
import { genelSeoSkoru } from "@/lib/scoring";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";
import { abonelikDurumu, kullanimArtir, kullanimAzalt, ozellikVarMi } from "@/lib/subscription";
import type { AnalizIsi, IsAdimi, Proje, ProjeSkorlari } from "@/types/database";

/** Bir çağrıda harcanabilecek azami süre (sunucusuz ortam sınırı için). */
const SURE_BUTCESI_MS = 40_000;

/** Tarama tamamlanmadıysa bir sonraki yoklamaya kadar beklenecek süre. */
const YOKLAMA_ARALIGI_MS = 8_000;

/** İşlemde takılan bir işin yeniden ele alınabileceği süre. */
const KILIT_SURESI_MS = 120_000;

export type IlerletmeSonucu = {
  durum: AnalizIsi["status"];
  ilerleme: number;
  devamEdiyor: boolean;
  hata?: string;
};

/* ------------------------------------------------------------------ */
/* Oluşturma                                                           */
/* ------------------------------------------------------------------ */

export async function isOlustur({
  projeId,
  kullaniciId,
  tur,
  params = {},
}: {
  projeId: string;
  kullaniciId: string;
  tur: IsTuru;
  params?: Record<string, unknown>;
}): Promise<AnalizIsi> {
  const supabase = yoneticiIstemcisi();

  // Aynı proje için devam eden bir iş varsa onu döndür.
  const { data: mevcut } = await supabase
    .from("audit_jobs")
    .select("*")
    .eq("project_id", projeId)
    .eq("job_type", tur)
    .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (mevcut) return mevcut as AnalizIsi;

  const { data, error } = await supabase
    .from("audit_jobs")
    .insert({
      project_id: projeId,
      user_id: kullaniciId,
      job_type: tur,
      status: "bekliyor",
      progress: 0,
      steps: IS_ADIMLARI[tur] as never,
      params: { ...params, adim: 0 } as never,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[is] oluşturulamadı", { tur, mesaj: error.message });
    throw new Error("Analiz başlatılamadı.");
  }

  return data as AnalizIsi;
}

/* ------------------------------------------------------------------ */
/* Yardımcılar                                                         */
/* ------------------------------------------------------------------ */

function adimlariGuncelle(adimlar: IsAdimi[], indeks: number, durum: IsAdimi["durum"]): IsAdimi[] {
  return adimlar.map((a, i) => (i === indeks ? { ...a, durum } : a));
}

async function isiKaydet(
  isId: string,
  guncelleme: Record<string, unknown>,
): Promise<void> {
  const supabase = yoneticiIstemcisi();
  await supabase.from("audit_jobs").update(guncelleme).eq("id", isId);
}

async function projeyiGetir(projeId: string): Promise<Proje | null> {
  const supabase = yoneticiIstemcisi();
  const { data } = await supabase.from("projects").select("*").eq("id", projeId).maybeSingle();
  return (data ?? null) as Proje | null;
}

async function bildirimEkle({
  kullaniciId,
  projeId,
  tur,
  baslik,
  govde,
  href,
  onem = "bilgi",
}: {
  kullaniciId: string;
  projeId: string;
  tur: string;
  baslik: string;
  govde?: string;
  href?: string;
  onem?: "bilgi" | "basari" | "uyari" | "kritik";
}): Promise<void> {
  const supabase = yoneticiIstemcisi();
  await supabase.from("notifications").insert({
    user_id: kullaniciId,
    project_id: projeId,
    type: tur,
    title: baslik,
    body: govde ?? null,
    href: href ?? null,
    severity: onem,
  });
}

/* ------------------------------------------------------------------ */
/* İlerletme                                                           */
/* ------------------------------------------------------------------ */

/**
 * İşi mümkün olduğunca ilerletir ve durumu kaydeder.
 * Sunucusuz ortamda tek çağrının süresi sınırlı olduğundan iş
 * adım adım, birden çok çağrıda tamamlanabilir.
 */
export async function isiIlerlet(isId: string): Promise<IlerletmeSonucu> {
  const supabase = yoneticiIstemcisi();
  const baslangic = Date.now();

  const { data: hamIs } = await supabase.from("audit_jobs").select("*").eq("id", isId).maybeSingle();
  if (!hamIs) return { durum: "hatali", ilerleme: 0, devamEdiyor: false, hata: "İş bulunamadı." };

  const is = hamIs as AnalizIsi;

  if (is.status === "tamamlandi" || is.status === "hatali" || is.status === "iptal") {
    return { durum: is.status, ilerleme: is.progress, devamEdiyor: false, hata: is.error ?? undefined };
  }

  // Başka bir çağrı bu işi işliyorsa çakışmayı önle.
  if (is.status === "isleniyor" && Date.now() - new Date(is.updated_at).getTime() < KILIT_SURESI_MS) {
    const paramlar = is.params as { beklemeye_alindi?: number };
    const bekleme = paramlar.beklemeye_alindi ?? 0;
    if (Date.now() - bekleme < YOKLAMA_ARALIGI_MS) {
      return { durum: is.status, ilerleme: is.progress, devamEdiyor: true };
    }
  }

  const proje = await projeyiGetir(is.project_id);
  if (!proje) {
    await isiKaydet(isId, { status: "hatali", error: "Proje bulunamadı.", completed_at: new Date().toISOString() });
    return { durum: "hatali", ilerleme: 0, devamEdiyor: false, hata: "Proje bulunamadı." };
  }

  let adimlar = (is.steps ?? []) as IsAdimi[];
  let params = { ...(is.params as Record<string, unknown>) };
  let adim = Number(params.adim ?? 0);
  let ilerleme = is.progress;

  await isiKaydet(isId, {
    status: "isleniyor",
    started_at: is.started_at ?? new Date().toISOString(),
  });

  try {
    while (Date.now() - baslangic < SURE_BUTCESI_MS) {
      const sonuc = await adimiCalistir({
        is,
        proje,
        adim,
        params,
        adimlar,
      });

      adimlar = sonuc.adimlar;
      params = sonuc.params;
      ilerleme = sonuc.ilerleme;

      if (sonuc.beklemede) {
        params.beklemeye_alindi = Date.now();
        await isiKaydet(isId, {
          steps: adimlar as never,
          params: params as never,
          progress: ilerleme,
          status: "isleniyor",
        });
        return { durum: "isleniyor", ilerleme, devamEdiyor: true };
      }

      adim = sonuc.sonrakiAdim;
      params.adim = adim;

      await isiKaydet(isId, {
        steps: adimlar as never,
        params: params as never,
        progress: ilerleme,
      });

      if (sonuc.bitti) {
        /*
         * Tamamlanma yalnızca bir kez duyurulur.
         *
         * Durum sayfası işi yoklarken aynı anda ilerletir; birden çok
         * yoklama aynı anda bitiş noktasına ulaşabilir. Koşulsuz yazımda
         * her biri ayrı bir "Analiz tamamlandı" bildirimi üretiyordu —
         * kullanıcı aynı bildirimden onlarca görüyordu. Koşullu güncelleme
         * yalnızca gerçekten durum değiştiren çağrıya satır döndürür.
         */
        const { data: gecis } = await supabase
          .from("audit_jobs")
          .update({
            status: "tamamlandi",
            progress: 100,
            completed_at: new Date().toISOString(),
            normalized_data: (params.sonuc ?? null) as never,
            updated_at: new Date().toISOString(),
          })
          .eq("id", isId)
          .neq("status", "tamamlandi")
          .select("id");

        if (!gecis?.length) {
          return { durum: "tamamlandi", ilerleme: 100, devamEdiyor: false };
        }

        await bildirimEkle({
          kullaniciId: is.user_id,
          projeId: is.project_id,
          tur: "analiz_tamamlandi",
          baslik: "Analiz tamamlandı",
          govde: `${proje.domain} için sonuçlar hazır.`,
          href: "/genel-bakis",
          onem: "basari",
        });

        return { durum: "tamamlandi", ilerleme: 100, devamEdiyor: false };
      }
    }

    return { durum: "isleniyor", ilerleme, devamEdiyor: true };
  } catch (hata) {
    const deneme = is.attempts + 1;
    const kalici = hata instanceof DataForSeoHatasi && hata.kalici;
    const kullaniciMesaji =
      hata instanceof DataForSeoHatasi
        ? hata.kullaniciMesaji
        : "Analiz sırasında beklenmeyen bir sorun oluştu. Kısa süre içinde tekrar deneyin.";

    console.error("[is] adım hatası", {
      isId,
      adim,
      deneme,
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });

    if (!kalici && deneme < is.max_attempts) {
      const bekleme = 1000 * 2 ** deneme;
      await isiKaydet(isId, {
        status: "yeniden_deneniyor",
        attempts: deneme,
        next_attempt_at: new Date(Date.now() + bekleme).toISOString(),
        error: kullaniciMesaji,
        error_code: hata instanceof DataForSeoHatasi ? String(hata.kod) : "bilinmiyor",
      });
      return { durum: "yeniden_deneniyor", ilerleme, devamEdiyor: true, hata: kullaniciMesaji };
    }

    const { data: hataGecisi } = await supabase
      .from("audit_jobs")
      .update({
        status: "hatali",
        attempts: deneme,
        error: kullaniciMesaji,
        error_code: hata instanceof DataForSeoHatasi ? String(hata.kod) : "bilinmiyor",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", isId)
      .neq("status", "hatali")
      .select("id");

    // Zaten hatalı işaretlenmişse bildirim ve iade tekrarlanmaz.
    if (!hataGecisi?.length) {
      return { durum: "hatali", ilerleme, devamEdiyor: false, hata: kullaniciMesaji };
    }

    /*
     * Analiz sonuçsuz bittiyse tarama hakkı iade edilir. Kullanıcı hiçbir
     * çıktı almadan aylık hakkını kaybetmemeli — deneme paketinde bu, tek
     * bir başarısızlığın tüm ayı yakması demekti.
     */
    if (params.tarama_sayildi) {
      await kullanimAzalt({ kullaniciId: is.user_id, metrik: "site_taramasi" });
    }

    await bildirimEkle({
      kullaniciId: is.user_id,
      projeId: is.project_id,
      tur: "analiz_hatasi",
      baslik: "Analiz tamamlanamadı",
      govde: kullaniciMesaji,
      href: "/genel-bakis",
      onem: "uyari",
    });

    return { durum: "hatali", ilerleme, devamEdiyor: false, hata: kullaniciMesaji };
  }
}

/* ------------------------------------------------------------------ */
/* Adımlar                                                             */
/* ------------------------------------------------------------------ */

type AdimSonucu = {
  adimlar: IsAdimi[];
  params: Record<string, unknown>;
  ilerleme: number;
  sonrakiAdim: number;
  bitti: boolean;
  beklemede: boolean;
};

async function adimiCalistir({
  is,
  proje,
  adim,
  params,
  adimlar,
}: {
  is: AnalizIsi;
  proje: Proje;
  adim: number;
  params: Record<string, unknown>;
  adimlar: IsAdimi[];
}): Promise<AdimSonucu> {
  const tur = is.job_type as IsTuru;

  // Yalnızca tek adımlı işler için kısayol
  if (tur !== "tam_analiz" && tur !== "onpage") {
    return tekAdimliIs({ is, proje, params, adimlar, tur });
  }

  const supabase = yoneticiIstemcisi();

  switch (adim) {
    /* --- 0: Tarama görevini başlat --- */
    case 0: {
      /*
       * Bu iş için tarama zaten başlatılmışsa yenisi açılmaz.
       *
       * Adım 0 yeniden çalışabilir (kayıt sırasında bir aksama, yeniden
       * deneme). Her seferinde yeni görev açmak hem sağlayıcıya ikinci kez
       * ödeme yapmak hem de kullanıcının hakkını ikinci kez düşürmek
       * demektir; üstelik ilk taramanın sonucu boşa gider.
       */
      const mevcutGorev = String(params.gorev_id ?? is.provider_task_id ?? "");
      if (mevcutGorev) {
        return {
          adimlar: adimlariGuncelle(adimlar, 0, "isleniyor"),
          params: { ...params, gorev_id: mevcutGorev, tarama_sayildi: true },
          ilerleme: 8,
          sonrakiAdim: 1,
          bitti: false,
          beklemede: false,
        };
      }

      const [{ data: ayarlar }, { limitler }] = await Promise.all([
        supabase
          .from("project_settings")
          .select("max_crawl_pages")
          .eq("project_id", proje.id)
          .maybeSingle(),
        abonelikDurumu(is.user_id),
      ]);

      /*
       * Proje ayarındaki sayfa sayısı pakette izin verilenle sınırlanır.
       * Ayarın varsayılanı paket limitinden yüksek olabilir; kenetlenmezse
       * kullanıcı paketinin üstünde tarama yaptırır ve maliyeti biz öderiz.
       */
      const planSiniri =
        typeof limitler?.tarama_sayfa === "number" ? limitler.tarama_sayfa : 200;
      const maksSayfa = Math.min(ayarlar?.max_crawl_pages ?? planSiniri, planSiniri);

      const gorevId = await taramaBaslat({ url: proje.url, maksSayfa });

      await supabase.from("audit_jobs").update({ provider_task_id: gorevId }).eq("id", is.id);

      /*
       * Hak yalnızca bir kez düşülür. Adım 0 yeniden çalışırsa (yeniden
       * deneme) sayaç ikinci kez artmamalı; aksi hâlde kullanıcı tek bir
       * analiz için birden çok hak öder.
       */
      if (!params.tarama_sayildi) {
        await kullanimArtir({ kullaniciId: is.user_id, metrik: "site_taramasi" });
      }

      return {
        adimlar: adimlariGuncelle(adimlar, 0, "isleniyor"),
        params: { ...params, gorev_id: gorevId, tarama_sayildi: true },
        ilerleme: 8,
        sonrakiAdim: 1,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 1: Taramanın bitmesini bekle --- */
    case 1: {
      const gorevId = String(params.gorev_id ?? is.provider_task_id ?? "");
      if (!gorevId) throw new Error("Tarama görevi kimliği bulunamadı.");

      const ozet = await taramaOzeti(gorevId);

      if (!ozet.tamamlandi) {
        return {
          adimlar,
          params,
          ilerleme: Math.max(8, Math.round(8 + ozet.ilerleme * 0.27)),
          sonrakiAdim: 1,
          bitti: false,
          beklemede: true,
        };
      }

      return {
        adimlar: adimlariGuncelle(adimlar, 0, "tamamlandi"),
        params,
        ilerleme: 36,
        sonrakiAdim: 2,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 2: Teknik SEO işleme --- */
    case 2: {
      const gorevId = String(params.gorev_id ?? is.provider_task_id ?? "");
      const teknik = await taramaSonucunuIsle({ proje, gorevId });

      const yeniParams = { ...params, teknik };
      const sonrakiAdim = tur === "onpage" ? 99 : 3;

      if (tur === "onpage") {
        await skorlariGuncelle(proje, yeniParams);
        await aksiyonlariUret(proje);
        return {
          adimlar: adimlariGuncelle(adimlar, 1, "tamamlandi"),
          params: yeniParams,
          ilerleme: 100,
          sonrakiAdim: 99,
          bitti: true,
          beklemede: false,
        };
      }

      return {
        adimlar: adimlariGuncelle(adimlar, 1, "tamamlandi"),
        params: yeniParams,
        ilerleme: 55,
        sonrakiAdim,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 3: Anahtar kelimeler --- */
    case 3: {
      const kelime = await kelimeAnaliziYap({ proje });
      await kullanimArtir({ kullaniciId: is.user_id, metrik: "keyword" });

      return {
        adimlar: adimlariGuncelle(adimlar, 2, "tamamlandi"),
        params: { ...params, kelime },
        ilerleme: 72,
        sonrakiAdim: 4,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 4: Rakipler --- */
    case 4: {
      const rakip = await rakipAnaliziYap({ proje });

      return {
        adimlar: adimlariGuncelle(adimlar, 3, "tamamlandi"),
        params: { ...params, rakip },
        ilerleme: 78,
        sonrakiAdim: 5,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 5: Arama sonuçları --- */
    case 5: {
      /*
       * Pazaryeri Radarı, Rakip Hareketleri ve Sayfa Çakışması bu veriyi
       * okur. Bu adım olmadan üç modül de hiçbir zaman veri görmüyordu.
       */
      const serp = await serpToplamasiYap({ proje });

      return {
        adimlar: adimlariGuncelle(adimlar, 4, "tamamlandi"),
        params: { ...params, serp },
        ilerleme: 90,
        sonrakiAdim: 6,
        bitti: false,
        beklemede: false,
      };
    }

    /* --- 6: Fırsatlar, skorlar ve aksiyonlar --- */
    case 6: {
      await skorlariGuncelle(proje, params);
      // Sıralama verisi tazelendi; bağlantı önerileri artık hangi sayfanın
      // vurulacak mesafede olduğunu bilerek üretilebilir.
      await oneriUret(proje.id);
      const aksiyon = await aksiyonlariUret(proje);

      return {
        adimlar: adimlariGuncelle(adimlar, 5, "tamamlandi"),
        params: { ...params, aksiyon, sonuc: { ...params } },
        ilerleme: 100,
        sonrakiAdim: 99,
        bitti: true,
        beklemede: false,
      };
    }

    default:
      return { adimlar, params, ilerleme: 100, sonrakiAdim: 99, bitti: true, beklemede: false };
  }
}

/** Tek adımlı işler (kelime, rakip, backlink…). */
/**
 * Modül analizleri "yenile" tazeliğiyle çalışır: kullanıcı analizi
 * yeniden başlattığında önbellek körü körüne atlanmaz, yalnızca veri
 * asgari yaşı geçmişse sağlayıcıya gidilir.
 *
 * Böylece arka arkaya yenileme tıklamaları ve aynı alan adını analiz
 * eden farklı projeler aynı veriyi iki kez satın almaz.
 */
async function tekAdimliIs({
  is,
  proje,
  params,
  adimlar,
  tur,
}: {
  is: AnalizIsi;
  proje: Proje;
  params: Record<string, unknown>;
  adimlar: IsAdimi[];
  tur: IsTuru;
}): Promise<AdimSonucu> {
  let yeniParams = { ...params };

  switch (tur) {
    case "keyword": {
      const kelime = await kelimeAnaliziYap({ proje, tazelik: "yenile" });
      await kullanimArtir({ kullaniciId: is.user_id, metrik: "keyword" });
      yeniParams = { ...yeniParams, kelime };
      break;
    }
    case "rakip": {
      const rakip = await rakipAnaliziYap({ proje, tazelik: "yenile" });
      yeniParams = { ...yeniParams, rakip };
      break;
    }
    case "backlink": {
      const izinli = await ozellikVarMi(is.user_id, "geri_baglanti");
      if (!izinli) throw new Error("Bu özellik mevcut paketinize dahil değil.");
      const backlink = await backlinkAnaliziYap({ proje, tazelik: "yenile" });
      yeniParams = { ...yeniParams, backlink };
      break;
    }
    case "merchant": {
      const izinli = await ozellikVarMi(is.user_id, "merchant");
      if (!izinli) throw new Error("Bu özellik mevcut paketinize dahil değil.");
      const merchant = await merchantAnaliziYap({ proje, tazelik: "yenile" });
      yeniParams = { ...yeniParams, merchant };
      break;
    }
    case "ai": {
      const izinli = await ozellikVarMi(is.user_id, "ai_gorunurlugu");
      if (!izinli) throw new Error("Bu özellik mevcut paketinize dahil değil.");
      const ai = await aiGorunurlukAnaliziYap({ proje, tazelik: "yenile" });
      yeniParams = { ...yeniParams, ai };
      break;
    }
    case "icerik": {
      const keyword = String(params.keyword ?? "").trim();
      if (!keyword) throw new Error("İçerik analizi için anahtar kelime gerekli.");

      const supabase = yoneticiIstemcisi();
      const { data: rakipVerisi } = await supabase
        .from("competitors")
        .select("domain")
        .eq("project_id", proje.id)
        .eq("is_active", true);

      const icerik = await icerikAnaliziYap({
        proje,
        keyword,
        rakipler: (rakipVerisi ?? []).map((r) => r.domain),
        tazelik: "yenile",
      });
      yeniParams = { ...yeniParams, icerik };
      break;
    }
    default:
      break;
  }

  await skorlariGuncelle(proje, yeniParams);
  await oneriUret(proje.id);
  await aksiyonlariUret(proje);

  return {
    adimlar: adimlar.map((a) => ({ ...a, durum: "tamamlandi" as const })),
    params: yeniParams,
    ilerleme: 100,
    sonrakiAdim: 99,
    bitti: true,
    beklemede: false,
  };
}

/* ------------------------------------------------------------------ */
/* Skor güncelleme                                                     */
/* ------------------------------------------------------------------ */

type TeknikSonuc = {
  skor: number;
  kirilim?: Record<string, number>;
  taranan: number;
  taramaSiniri?: number;
  siniraTakildi?: boolean;
  kritikSorun: number;
  toplamSorun: number;
  eticaretSkoru: number | null;
  sayfaTurleri: Record<string, number>;
};

type KelimeSonuc = {
  toplamKelime: number;
  ilkOn: number;
  tahminiTrafik: number;
  keywordSkoru: number;
};

async function skorlariGuncelle(proje: Proje, params: Record<string, unknown>): Promise<void> {
  const supabase = yoneticiIstemcisi();

  const teknik = params.teknik as TeknikSonuc | undefined;
  const kelime = params.kelime as KelimeSonuc | undefined;
  const backlink = params.backlink as { alan_adi_gucu: number | null; referans_alan_adi: number; toplam_backlink: number } | undefined;

  // İçerik skoru: yeterli metne sahip sayfa oranı
  const { count: toplamSayfa } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", proje.id);

  const { count: iyiIcerik } = await supabase
    .from("pages")
    .select("id", { count: "exact", head: true })
    .eq("project_id", proje.id)
    .gte("word_count", 300);

  const icerikSkoru = toplamSayfa && toplamSayfa > 0 ? Math.round(((iyiIcerik ?? 0) / toplamSayfa) * 100) : null;

  const { data: aiKayit } = await supabase
    .from("ai_visibility")
    .select("score")
    .eq("project_id", proje.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Adımlar sırasında skorlar güncellenmiş olabilir; en güncel hali okunur.
  const { data: guncelProje } = await supabase
    .from("projects")
    .select("scores, stats")
    .eq("id", proje.id)
    .maybeSingle();

  const mevcutSkorlar = ((guncelProje?.scores ?? proje.scores) ?? {}) as ProjeSkorlari;
  const mevcutIstatistik = ((guncelProje?.stats ?? proje.stats) ?? {}) as Record<string, number | undefined>;

  const bilesenler = {
    teknik: teknik?.skor ?? mevcutSkorlar.teknik ?? null,
    icerik: icerikSkoru ?? mevcutSkorlar.icerik ?? null,
    keyword: kelime?.keywordSkoru ?? mevcutSkorlar.keyword ?? null,
    otorite: backlink?.alan_adi_gucu ?? mevcutSkorlar.otorite ?? null,
    eticaret: teknik?.eticaretSkoru ?? mevcutSkorlar.eticaret ?? null,
    ai: aiKayit?.score ?? mevcutSkorlar.ai ?? null,
  };

  const skorlar: ProjeSkorlari & { teknik_kirilim?: Record<string, number> } = {
    ...bilesenler,
    merchant: mevcutSkorlar.merchant ?? null,
    seo: genelSeoSkoru(bilesenler),
    // Kırılım, Teknik SEO ekranında kategori bazlı gösterim için saklanır.
    teknik_kirilim: teknik?.kirilim ?? (mevcutSkorlar as { teknik_kirilim?: Record<string, number> }).teknik_kirilim,
  } as ProjeSkorlari & { teknik_kirilim?: Record<string, number> };

  const istatistikler = {
    siralanan_kelime: kelime?.toplamKelime ?? (mevcutIstatistik.siralanan_kelime ?? 0),
    tahmini_trafik: kelime?.tahminiTrafik ?? (mevcutIstatistik.tahmini_trafik ?? 0),
    taranan_sayfa: teknik?.taranan ?? (mevcutIstatistik.taranan_sayfa ?? 0),
    // Tarama paket sınırında mı durdu? Teknik SEO ekranındaki yükseltme
    // paneli yalnızca bu bilgi doğruysa gösterilir.
    tarama_siniri: teknik?.taramaSiniri ?? mevcutIstatistik.tarama_siniri,
    tarama_sinirina_takildi:
      teknik?.siniraTakildi ?? mevcutIstatistik.tarama_sinirina_takildi ?? false,
    kritik_sorun: teknik?.kritikSorun ?? (mevcutIstatistik.kritik_sorun ?? 0),
    urun_sayisi: teknik?.sayfaTurleri?.urun ?? (mevcutIstatistik.urun_sayisi ?? 0),
    kategori_sayisi: teknik?.sayfaTurleri?.kategori ?? (mevcutIstatistik.kategori_sayisi ?? 0),
    geri_baglanti: backlink?.toplam_backlink ?? (mevcutIstatistik.geri_baglanti ?? 0),
    referans_alan_adi: backlink?.referans_alan_adi ?? (mevcutIstatistik.referans_alan_adi ?? 0),
  };

  await supabase
    .from("projects")
    .update({
      scores: skorlar as never,
      stats: istatistikler as never,
      last_audit_at: new Date().toISOString(),
    })
    .eq("id", proje.id);

  await supabase.from("audit_history").insert({
    project_id: proje.id,
    scores: skorlar as never,
    stats: istatistikler as never,
  });
}

/* ------------------------------------------------------------------ */
/* Kuyruk                                                              */
/* ------------------------------------------------------------------ */

/** Bekleyen ve yeniden denenecek işleri ilerletir (cron için). */
export async function bekleyenIsleriIlerlet(limit = 5): Promise<number> {
  const supabase = yoneticiIstemcisi();

  const { data } = await supabase
    .from("audit_jobs")
    .select("id, status, next_attempt_at")
    .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
    .order("created_at", { ascending: true })
    .limit(limit);

  let islenen = 0;
  for (const is of data ?? []) {
    if (is.next_attempt_at && new Date(is.next_attempt_at).getTime() > Date.now()) continue;
    await isiIlerlet(is.id);
    islenen++;
  }

  return islenen;
}
