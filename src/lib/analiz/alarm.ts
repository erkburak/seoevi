import "server-only";

import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Günlük alarm sistemi.
 *
 * Kullanıcı sabah panele girdiğinde "dün ne oldu?" sorusunun cevabını
 * görmeli. Her gün bir anlık görüntü alınır; alarmlar iki gün arasındaki
 * farktan üretilir.
 *
 * Eşiklerin altındaki değişimler gürültüdür ve alarm üretmez — her gün
 * kırmızı uyarı gösteren bir sistem kısa sürede görmezden gelinir.
 *
 * Mevcut sıralama verisinden okunur; ek sağlayıcı çağrısı yoktur.
 */

export type AlarmEsikleri = {
  gorunurluk_dusus_yuzde: number;
  kelime_dusus_sira: number;
  kelime_dusus_adet: number;
  url_dusus_sira: number;
  yeni_kelime_adet: number;
};

const VARSAYILAN_ESIKLER: AlarmEsikleri = {
  gorunurluk_dusus_yuzde: 8,
  kelime_dusus_sira: 10,
  kelime_dusus_adet: 3,
  url_dusus_sira: 5,
  yeni_kelime_adet: 5,
};

async function esikler(): Promise<AlarmEsikleri> {
  try {
    const { data } = await yoneticiIstemcisi()
      .from("app_config")
      .select("value")
      .eq("key", "alarm_esikleri")
      .maybeSingle();
    return { ...VARSAYILAN_ESIKLER, ...((data?.value as Partial<AlarmEsikleri>) ?? {}) };
  } catch {
    return VARSAYILAN_ESIKLER;
  }
}

function bugun(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* Günlük anlık görüntü                                                */
/* ------------------------------------------------------------------ */

export type Anlik = {
  siralananKelime: number;
  ilkUc: number;
  ilkOn: number;
  ortalamaPozisyon: number | null;
  tahminiTrafik: number;
  gorunurluk: number;
};

/**
 * Görünürlük skoru (0-100).
 * Sıralamaların ağırlıklı ortalaması: üst sıralar çok daha değerli.
 */
function gorunurlukHesapla(pozisyonlar: number[]): number {
  if (!pozisyonlar.length) return 0;
  const puan = pozisyonlar.reduce((t, p) => {
    if (p <= 3) return t + 100;
    if (p <= 10) return t + 60;
    if (p <= 20) return t + 25;
    if (p <= 50) return t + 8;
    return t + 2;
  }, 0);
  return Math.round((puan / pozisyonlar.length) * 100) / 100;
}

/** Projenin bugünkü durumunu ölçer ve kaydeder. */
export async function gunlukAnlikAl(projeId: string): Promise<Anlik> {
  const supabase = yoneticiIstemcisi();

  const { data: kelimeler } = await supabase
    .from("kelime_ozet")
    .select("position, etv")
    .eq("project_id", projeId)
    .not("position", "is", null)
    .limit(5000);

  const pozisyonlar = (kelimeler ?? [])
    .map((k) => k.position)
    .filter((p): p is number => p !== null);

  const anlik: Anlik = {
    siralananKelime: pozisyonlar.length,
    ilkUc: pozisyonlar.filter((p) => p <= 3).length,
    ilkOn: pozisyonlar.filter((p) => p <= 10).length,
    ortalamaPozisyon: pozisyonlar.length
      ? Math.round((pozisyonlar.reduce((t, p) => t + p, 0) / pozisyonlar.length) * 100) / 100
      : null,
    tahminiTrafik:
      Math.round((kelimeler ?? []).reduce((t, k) => t + Number(k.etv ?? 0), 0) * 100) / 100,
    gorunurluk: gorunurlukHesapla(pozisyonlar),
  };

  // Search Console bağlıysa gerçek sayılar da eklenir.
  const { data: gsc } = await supabase
    .from("gsc_performance")
    .select("tiklama, gosterim")
    .eq("project_id", projeId)
    .eq("boyut", "sorgu");

  const gscTiklama = gsc?.length ? gsc.reduce((t, r) => t + r.tiklama, 0) : null;
  const gscGosterim = gsc?.length ? gsc.reduce((t, r) => t + r.gosterim, 0) : null;

  await supabase.from("daily_snapshot").upsert(
    {
      project_id: projeId,
      gun: bugun(),
      siralanan_kelime: anlik.siralananKelime,
      ilk_uc: anlik.ilkUc,
      ilk_on: anlik.ilkOn,
      ortalama_pozisyon: anlik.ortalamaPozisyon,
      tahmini_trafik: anlik.tahminiTrafik,
      gorunurluk: anlik.gorunurluk,
      gsc_tiklama: gscTiklama,
      gsc_gosterim: gscGosterim,
    },
    { onConflict: "project_id,gun" },
  );

  return anlik;
}

/* ------------------------------------------------------------------ */
/* Alarm üretimi                                                       */
/* ------------------------------------------------------------------ */

type YeniAlarm = {
  project_id: string;
  tur: string;
  onem: "kritik" | "uyari" | "bilgi" | "olumlu";
  baslik: string;
  detay: string | null;
  deger: number | null;
  birim: string | null;
  ogeler: unknown;
  href: string | null;
  gun: string;
};

/**
 * Bugünü önceki anlık görüntüyle karşılaştırıp alarm üretir.
 * Aynı gün aynı türde ikinci alarm oluşmaz (tekil kısıt).
 */
export async function alarmlariUret(projeId: string): Promise<number> {
  const supabase = yoneticiIstemcisi();
  const esik = await esikler();

  const bugunku = await gunlukAnlikAl(projeId);

  // Karşılaştırma için bugünden önceki en yakın kayıt.
  const { data: oncekiler } = await supabase
    .from("daily_snapshot")
    .select("*")
    .eq("project_id", projeId)
    .lt("gun", bugun())
    .order("gun", { ascending: false })
    .limit(1);

  const onceki = oncekiler?.[0];
  const alarmlar: YeniAlarm[] = [];
  const g = bugun();

  /* --- 1. Görünürlük düşüşü --- */
  if (onceki && Number(onceki.gorunurluk) > 0) {
    const fark = ((bugunku.gorunurluk - Number(onceki.gorunurluk)) / Number(onceki.gorunurluk)) * 100;

    if (fark <= -esik.gorunurluk_dusus_yuzde) {
      alarmlar.push({
        project_id: projeId,
        tur: "gorunurluk_dususu",
        onem: fark <= -20 ? "kritik" : "uyari",
        baslik: `Organik görünürlük %${Math.abs(Math.round(fark))} düştü`,
        detay:
          "Sıralamalarınızın ağırlıklı ortalaması geriledi. Aşağıdaki kelime düşüşlerini inceleyin.",
        deger: Math.round(fark * 10) / 10,
        birim: "%",
        ogeler: [],
        href: "/anahtar-kelimeler",
        gun: g,
      });
    } else if (fark >= esik.gorunurluk_dusus_yuzde) {
      alarmlar.push({
        project_id: projeId,
        tur: "gorunurluk_artisi",
        onem: "olumlu",
        baslik: `Organik görünürlük %${Math.round(fark)} arttı`,
        detay: "Sıralamalarınız genel olarak yükseldi.",
        deger: Math.round(fark * 10) / 10,
        birim: "%",
        ogeler: [],
        href: "/anahtar-kelimeler",
        gun: g,
      });
    }
  }

  /* --- 2. Kelime bazlı düşüş ve kazanım --- */
  const { data: kelimeler } = await supabase
    .from("kelime_ozet")
    .select("keyword, position, previous_position, search_volume, url")
    .eq("project_id", projeId)
    .limit(5000);

  const dusenler = (kelimeler ?? [])
    .filter(
      (k) =>
        k.position !== null &&
        k.previous_position !== null &&
        k.position - k.previous_position >= esik.kelime_dusus_sira,
    )
    .map((k) => ({
      keyword: k.keyword,
      onceki: k.previous_position,
      simdiki: k.position,
      dusus: k.position! - k.previous_position!,
      hacim: k.search_volume,
    }))
    .sort((a, b) => (b.hacim ?? 0) - (a.hacim ?? 0));

  if (dusenler.length >= esik.kelime_dusus_adet) {
    alarmlar.push({
      project_id: projeId,
      tur: "kelime_dususu",
      onem: dusenler.length >= 10 ? "kritik" : "uyari",
      baslik: `${dusenler.length} anahtar kelime ${esik.kelime_dusus_sira}+ sıra geriledi`,
      detay: dusenler
        .slice(0, 3)
        .map((d) => `${d.keyword} (${d.onceki} → ${d.simdiki})`)
        .join(" · "),
      deger: dusenler.length,
      birim: "kelime",
      ogeler: dusenler.slice(0, 20),
      href: "/anahtar-kelimeler",
      gun: g,
    });
  }

  const yeniler = (kelimeler ?? [])
    .filter((k) => k.position !== null && k.previous_position === null)
    .map((k) => ({ keyword: k.keyword, pozisyon: k.position, hacim: k.search_volume }))
    .sort((a, b) => (b.hacim ?? 0) - (a.hacim ?? 0));

  if (yeniler.length >= esik.yeni_kelime_adet) {
    alarmlar.push({
      project_id: projeId,
      tur: "kelime_kazanimi",
      onem: "olumlu",
      baslik: `${yeniler.length} yeni anahtar kelime kazanıldı`,
      detay: yeniler
        .slice(0, 3)
        .map((y) => `${y.keyword} (${y.pozisyon}. sıra)`)
        .join(" · "),
      deger: yeniler.length,
      birim: "kelime",
      ogeler: yeniler.slice(0, 20),
      href: "/anahtar-kelimeler",
      gun: g,
    });
  }

  /* --- 3. Yüksek trafikli URL düşüşü --- */
  const urlDususleri = new Map<string, { dusus: number; kelime: number }>();
  for (const k of kelimeler ?? []) {
    if (!k.url || k.position === null || k.previous_position === null) continue;
    const fark = k.position - k.previous_position;
    if (fark < esik.url_dusus_sira) continue;

    const mevcut = urlDususleri.get(k.url) ?? { dusus: 0, kelime: 0 };
    mevcut.dusus += fark;
    mevcut.kelime += 1;
    urlDususleri.set(k.url, mevcut);
  }

  // En az iki kelimede birden düşen adresler sayfa düzeyinde sorun işaretidir.
  const sorunluUrller = [...urlDususleri.entries()]
    .filter(([, v]) => v.kelime >= 2)
    .map(([url, v]) => ({ url, ...v }))
    .sort((a, b) => b.dusus - a.dusus);

  if (sorunluUrller.length) {
    alarmlar.push({
      project_id: projeId,
      tur: "url_dususu",
      onem: "uyari",
      baslik: `${sorunluUrller.length} sayfa birden fazla kelimede düşüş yaşadı`,
      detay:
        "Aynı sayfanın birçok kelimede gerilemesi genellikle sayfa düzeyinde bir sorunu gösterir.",
      deger: sorunluUrller.length,
      birim: "sayfa",
      ogeler: sorunluUrller.slice(0, 20),
      href: "/sayfa-analizi",
      gun: g,
    });
  }

  /* --- Kaydet --- */
  if (!alarmlar.length) return 0;

  const { error } = await supabase
    .from("alerts")
    .upsert(alarmlar as never, { onConflict: "project_id,tur,gun" });

  if (error) {
    console.error("[alarm] kayıt yazılamadı", { mesaj: error.message });
    return 0;
  }

  return alarmlar.length;
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export type Alarm = {
  id: string;
  tur: string;
  onem: "kritik" | "uyari" | "bilgi" | "olumlu";
  baslik: string;
  detay: string | null;
  deger: number | null;
  birim: string | null;
  href: string | null;
  gun: string;
  okundu: boolean;
};

/** Son günlerin alarmları; en yeni ve en kritik önce. */
export async function guncelAlarmlar(projeId: string, gunSayisi = 7): Promise<Alarm[]> {
  const supabase = yoneticiIstemcisi();
  const baslangic = new Date(Date.now() - gunSayisi * 86_400_000).toISOString().slice(0, 10);

  const { data } = await supabase
    .from("alerts")
    .select("id, tur, onem, baslik, detay, deger, birim, href, gun, okundu")
    .eq("project_id", projeId)
    .gte("gun", baslangic)
    .order("gun", { ascending: false });

  const siralama = { kritik: 0, uyari: 1, olumlu: 2, bilgi: 3 };

  return (data ?? []).sort(
    (a, b) =>
      b.gun.localeCompare(a.gun) ||
      (siralama[a.onem as keyof typeof siralama] ?? 9) -
        (siralama[b.onem as keyof typeof siralama] ?? 9),
  ) as Alarm[];
}
