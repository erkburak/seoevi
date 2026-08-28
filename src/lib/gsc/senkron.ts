import "server-only";

import { gecerliJeton, performansSorgusu } from "@/lib/gsc/client";
import { yoneticiIstemcisi } from "@/lib/supabase/admin";

/**
 * Search Console verisinin çekilip saklanması.
 *
 * Bu veri platformdaki en değerli veridir: tahmin değil ölçüm. Google'ın
 * kendi kaydından gelir ve DataForSEO'nun tahmini trafik hesabının
 * yerini alır.
 *
 * Google API'si ücretsizdir; bu senkronun sağlayıcı maliyeti yoktur.
 */

function tarihMetni(tarih: Date): string {
  return tarih.toISOString().slice(0, 10);
}

export type SenkronSonucu = {
  sorgu: number;
  sayfa: number;
  toplamTiklama: number;
  toplamGosterim: number;
};

/**
 * Son 28 günün sorgu ve sayfa performansını çeker.
 *
 * Google verisi 2-3 gün gecikmeli yayımlandığı için bitiş tarihi
 * bugünden 3 gün geriye alınır; aksi hâlde eksik veri okunur.
 */
export async function gscSenkronize(projeId: string): Promise<SenkronSonucu> {
  const supabase = yoneticiIstemcisi();
  const { jeton, property } = await gecerliJeton(projeId);

  const bitis = new Date(Date.now() - 3 * 86_400_000);
  const baslangic = new Date(bitis.getTime() - 28 * 86_400_000);
  const b = tarihMetni(baslangic);
  const s = tarihMetni(bitis);

  try {
    const [sorgular, sayfalar] = await Promise.all([
      performansSorgusu({ jeton, property, baslangic: b, bitis: s, boyut: "query", limit: 1000 }),
      performansSorgusu({ jeton, property, baslangic: b, bitis: s, boyut: "page", limit: 500 }),
    ]);

    const kayitlar = [
      ...sorgular.map((r) => ({
        project_id: projeId,
        boyut: "sorgu" as const,
        deger: r.keys[0] ?? "",
        tiklama: Math.round(r.clicks),
        gosterim: Math.round(r.impressions),
        ctr: Math.round(r.ctr * 10000) / 100,
        pozisyon: Math.round(r.position * 100) / 100,
        baslangic: b,
        bitis: s,
      })),
      ...sayfalar.map((r) => ({
        project_id: projeId,
        boyut: "sayfa" as const,
        deger: r.keys[0] ?? "",
        tiklama: Math.round(r.clicks),
        gosterim: Math.round(r.impressions),
        ctr: Math.round(r.ctr * 10000) / 100,
        pozisyon: Math.round(r.position * 100) / 100,
        baslangic: b,
        bitis: s,
      })),
    ].filter((k) => k.deger);

    for (let i = 0; i < kayitlar.length; i += 500) {
      const { error } = await supabase
        .from("gsc_performance")
        .upsert(kayitlar.slice(i, i + 500), {
          onConflict: "project_id,boyut,deger,baslangic,bitis",
        });
      if (error) console.error("[gsc] kayıt yazılamadı", { mesaj: error.message });
    }

    await supabase
      .from("gsc_connections")
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq("project_id", projeId);

    return {
      sorgu: sorgular.length,
      sayfa: sayfalar.length,
      toplamTiklama: Math.round(sorgular.reduce((t, r) => t + r.clicks, 0)),
      toplamGosterim: Math.round(sorgular.reduce((t, r) => t + r.impressions, 0)),
    };
  } catch (hata) {
    const mesaj = hata instanceof Error ? hata.message : String(hata);
    await supabase
      .from("gsc_connections")
      .update({ last_error: mesaj, last_sync_at: new Date().toISOString() })
      .eq("project_id", projeId);
    throw hata;
  }
}

/* ------------------------------------------------------------------ */
/* Okuma                                                               */
/* ------------------------------------------------------------------ */

export type GscOzeti = {
  bagli: boolean;
  property: string | null;
  sonSenkron: string | null;
  sonHata: string | null;
  toplamTiklama: number;
  toplamGosterim: number;
  ortalamaCtr: number | null;
  ortalamaPozisyon: number | null;
  sorguSayisi: number;
};

export async function gscOzeti(projeId: string): Promise<GscOzeti> {
  const supabase = yoneticiIstemcisi();

  const { data: baglanti } = await supabase
    .from("gsc_connections")
    .select("property, last_sync_at, last_error")
    .eq("project_id", projeId)
    .maybeSingle();

  if (!baglanti) {
    return {
      bagli: false, property: null, sonSenkron: null, sonHata: null,
      toplamTiklama: 0, toplamGosterim: 0, ortalamaCtr: null,
      ortalamaPozisyon: null, sorguSayisi: 0,
    };
  }

  const { data: satirlar } = await supabase
    .from("gsc_performance")
    .select("tiklama, gosterim, pozisyon")
    .eq("project_id", projeId)
    .eq("boyut", "sorgu");

  const veri = satirlar ?? [];
  const tiklama = veri.reduce((t, r) => t + r.tiklama, 0);
  const gosterim = veri.reduce((t, r) => t + r.gosterim, 0);

  // Ortalama pozisyon gösterimle ağırlıklandırılır; aksi hâlde tek
  // gösterimlik uzun kuyruk sonuçlar ortalamayı bozar.
  const agirlikliPozisyon =
    gosterim > 0
      ? veri.reduce((t, r) => t + Number(r.pozisyon ?? 0) * r.gosterim, 0) / gosterim
      : null;

  return {
    bagli: true,
    property: baglanti.property,
    sonSenkron: baglanti.last_sync_at,
    sonHata: baglanti.last_error,
    toplamTiklama: tiklama,
    toplamGosterim: gosterim,
    ortalamaCtr: gosterim > 0 ? Math.round((tiklama / gosterim) * 10000) / 100 : null,
    ortalamaPozisyon: agirlikliPozisyon ? Math.round(agirlikliPozisyon * 100) / 100 : null,
    sorguSayisi: veri.length,
  };
}

export type CtrFirsati = {
  deger: string;
  tiklama: number;
  gosterim: number;
  ctr: number;
  pozisyon: number;
  /** Bu sırada beklenen CTR. */
  beklenenCtr: number;
  /** Beklenene ulaşılsa kazanılacak aylık tıklama. */
  kazanc: number;
};

/** Pozisyona göre beklenen tıklama oranı (%). */
function beklenenCtr(pozisyon: number): number {
  const tablo = [27.8, 15.2, 11.0, 7.7, 5.6, 4.2, 3.2, 2.6, 2.2, 1.9];
  const p = Math.round(pozisyon);
  if (p <= 10) return tablo[Math.max(0, p - 1)];
  if (p <= 20) return 1.2;
  return 0.6;
}

/**
 * "Yüksek gösterim, düşük tıklama" fırsatları.
 *
 * Sıralaman iyi ama tıklanmıyorsan sorun içerikte değil başlıkta ve
 * açıklamadadır. Bu, sıralama değiştirmeden trafik kazandıran en hızlı
 * iştir — ve yalnızca gerçek CTR verisiyle bulunabilir.
 */
export async function ctrFirsatlari(projeId: string, limit = 30): Promise<CtrFirsati[]> {
  const supabase = yoneticiIstemcisi();

  const { data } = await supabase
    .from("gsc_performance")
    .select("deger, tiklama, gosterim, ctr, pozisyon")
    .eq("project_id", projeId)
    .eq("boyut", "sorgu")
    .gte("gosterim", 100)
    .lte("pozisyon", 20)
    .order("gosterim", { ascending: false })
    .limit(300);

  return (data ?? [])
    .map((r) => {
      const pozisyon = Number(r.pozisyon ?? 20);
      const ctr = Number(r.ctr ?? 0);
      const beklenen = beklenenCtr(pozisyon);
      // Beklenenin altındaki her puan, kaçırılan tıklama demek.
      const kazanc = Math.round(((beklenen - ctr) / 100) * r.gosterim);

      return {
        deger: r.deger,
        tiklama: r.tiklama,
        gosterim: r.gosterim,
        ctr,
        pozisyon,
        beklenenCtr: beklenen,
        kazanc,
      };
    })
    .filter((r) => r.kazanc > 0 && r.ctr < r.beklenenCtr * 0.7)
    .sort((a, b) => b.kazanc - a.kazanc)
    .slice(0, limit);
}
