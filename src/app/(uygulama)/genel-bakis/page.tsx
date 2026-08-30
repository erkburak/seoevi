import { AlertTriangle, ArrowRight, Sparkles, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AlarmPaneli } from "@/components/app/alarm-paneli";
import { AnalizDurumu } from "@/components/app/analiz-durumu";
import { AnaliziYenile } from "@/components/app/ust-cubuk";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { CizgiGrafik, DagilimSeridi } from "@/components/charts";
import { Rozet, OncelikRozeti } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { BosDurum } from "@/components/ui/feedback";
import { OlcumKarti } from "@/components/ui/metric";
import { FirsatSkoru, PozisyonDegisimi, SkorCubugu, SkorHalkasi } from "@/components/ui/score";
import { BolumBasligi } from "@/components/ui/surface";
import { guncelAlarmlar } from "@/lib/analiz/alarm";
import { IS_TURU_ADI, type IsTuru } from "@/lib/jobs/types";
import { projeBaglami } from "@/lib/projects";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { kisaSayi, sayi, tarih } from "@/lib/utils";
import type { AnalizGecmisi, AnalizIsi, ProjeSkorlari, Rakip, SeoAksiyonu } from "@/types/database";

export const metadata: Metadata = {
  title: "Genel Bakış",
  robots: { index: false, follow: false },
};

const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export default async function GenelBakisSayfasi({
  searchParams,
}: {
  searchParams: Promise<{ analiz?: string }>;
}) {
  const { proje } = await projeBaglami();

  // Günlük alarmlar: "dün ne oldu?" sorusunun tek bakışta cevabı.
  const alarmlar = await guncelAlarmlar(proje.id, 7);
  const { analiz } = await searchParams;
  const supabase = await sunucuIstemcisi();

  const [
    { data: gecmisVerisi },
    { data: firsatVerisi },
    { data: aksiyonVerisi },
    { data: hareketVerisi },
    { data: rakipVerisi },
    { data: isVerisi },
    { count: acikSorun },
  ] = await Promise.all([
    supabase
      .from("audit_history")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: true })
      .limit(24),
    supabase
      .from("keyword_opportunities")
      .select("id, score, potential_traffic, current_position, reason, keywords(id, keyword, search_volume)")
      .eq("project_id", proje.id)
      .eq("status", "acik")
      .order("score", { ascending: false })
      .limit(6),
    supabase
      .from("seo_actions")
      .select("*")
      .eq("project_id", proje.id)
      .eq("status", "bekliyor")
      .in("priority", ["kritik", "yuksek"])
      .order("priority", { ascending: true })
      .limit(5),
    supabase
      .from("keyword_rankings")
      .select("position, previous_position, keyword_id, checked_at, keywords(keyword)")
      .eq("project_id", proje.id)
      .eq("is_competitor", false)
      .not("previous_position", "is", null)
      .order("checked_at", { ascending: false })
      .limit(400),
    supabase
      .from("competitors")
      .select("*")
      .eq("project_id", proje.id)
      .eq("is_active", true)
      .limit(5),
    supabase
      .from("audit_jobs")
      .select("*")
      .eq("project_id", proje.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("technical_issues")
      .select("id", { count: "exact", head: true })
      .eq("project_id", proje.id)
      .eq("status", "acik"),
  ]);

  const gecmis = (gecmisVerisi ?? []) as AnalizGecmisi[];
  const aksiyonlar = (aksiyonVerisi ?? []) as SeoAksiyonu[];
  const rakipler = (rakipVerisi ?? []) as Rakip[];
  const isler = (isVerisi ?? []) as AnalizIsi[];
  const skorlar = (proje.scores ?? {}) as ProjeSkorlari;
  const istatistik = proje.stats ?? {};

  const devamEdenIs = isler.find((i) => ["bekliyor", "isleniyor", "yeniden_deneniyor"].includes(i.status));
  const gosterilecekIs = analiz ?? devamEdenIs?.id;

  const analizYapilmadi = !proje.last_audit_at && !gosterilecekIs;

  /* ----- Grafik verisi ----- */
  const grafikVerisi = gecmis.map((g) => {
    const d = new Date(g.created_at);
    return {
      etiket: `${d.getDate()} ${AY_KISA[d.getMonth()]}`,
      deger: (g.scores as ProjeSkorlari)?.seo ?? 0,
    };
  });

  /* ----- Kelime hareketleri ----- */
  type HareketSatiri = {
    position: number | null;
    previous_position: number | null;
    keyword_id: string;
    checked_at: string;
    keywords: { keyword: string } | { keyword: string }[] | null;
  };

  /*
   * Her ölçüm yeni bir satır yazdığı için aynı kelime tabloda birden çok
   * kez bulunur. Kelime başına yalnızca EN SON ölçüm alınır; aksi hâlde
   * liste aynı kelimenin tekrarıyla dolar ve gerçekte kaç kelimenin
   * hareket ettiği görünmez.
   */
  const enSonOlcum = new Map<string, HareketSatiri>();
  for (const h of (hareketVerisi ?? []) as unknown as HareketSatiri[]) {
    // Sorgu tarihe göre azalan sıralı; ilk görülen en yenisidir.
    if (!enSonOlcum.has(h.keyword_id)) enSonOlcum.set(h.keyword_id, h);
  }

  const hareketler = [...enSonOlcum.values()]
    .map((h) => {
      const k = Array.isArray(h.keywords) ? h.keywords[0] : h.keywords;
      return {
        keyword: k?.keyword ?? "",
        keywordId: h.keyword_id,
        pozisyon: h.position,
        onceki: h.previous_position,
        fark: (h.previous_position ?? 0) - (h.position ?? 0),
      };
    })
    .filter((h) => h.keyword && h.fark !== 0)
    .sort((a, b) => Math.abs(b.fark) - Math.abs(a.fark))
    .slice(0, 6);

  /* ----- Fırsatlar ----- */
  type FirsatSatiri = {
    id: string;
    score: number;
    potential_traffic: number | null;
    current_position: number | null;
    reason: string | null;
    keywords: { id: string; keyword: string; search_volume: number | null } | { id: string; keyword: string; search_volume: number | null }[] | null;
  };

  const firsatlar = ((firsatVerisi ?? []) as unknown as FirsatSatiri[]).map((f) => {
    const k = Array.isArray(f.keywords) ? f.keywords[0] : f.keywords;
    return {
      id: f.id,
      keywordId: k?.id ?? "",
      keyword: k?.keyword ?? "",
      hacim: k?.search_volume ?? null,
      skor: f.score,
      trafik: f.potential_traffic,
      pozisyon: f.current_position,
      gerekce: f.reason,
    };
  });

  return (
    <>
      <SayfaBasligi
        baslik="Genel Bakış"
        aciklama={`${proje.domain} için güncel SEO durumu${proje.last_audit_at ? ` · Son analiz ${tarih(proje.last_audit_at)}` : ""}`}
        aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
      />

      {gosterilecekIs ? <AnalizDurumu isId={gosterilecekIs} /> : null}

      <AlarmPaneli alarmlar={alarmlar} />

      {analizYapilmadi ? (
        <BosDurum
          ikon={Sparkles}
          baslik="Henüz analiz yapılmadı"
          aciklama="İlk analizi başlatarak sitenizin SEO durumunu, rakiplerinizi ve kazanabileceğiniz kelimeleri görün."
          aksiyon={<AnaliziYenile projeId={proje.id} boyut="md" />}
        />
      ) : (
        <div className="space-y-10">
          {/* ---------------- Skor paneli ---------------- */}
          <section>
            <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
              <div className="glass rounded-[16px] p-5">
                <div className="flex items-center gap-5">
                  <SkorHalkasi skor={skorlar.seo ?? null} boyut={104} etiket="SEO skoru" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink-900">Genel SEO skoru</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
                      Teknik, içerik, kelime, otorite, e-ticaret ve AI bileşenlerinin ağırlıklı ortalaması.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-line/60 pt-4">
                  <SkorCubugu etiket="Teknik SEO" skor={skorlar.teknik ?? null} />
                  <SkorCubugu etiket="İçerik" skor={skorlar.icerik ?? null} />
                  <SkorCubugu etiket="Anahtar kelime" skor={skorlar.keyword ?? null} />
                  <SkorCubugu etiket="E-ticaret" skor={skorlar.eticaret ?? null} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <OlcumKarti
                  etiket="Sıralanan kelime"
                  deger={sayi(istatistik.siralanan_kelime ?? 0)}
                  ipucu="Google'da ilk 100 içinde sıralanan anahtar kelime sayınız."
                  altMetin="ilk 100 içinde"
                />
                <OlcumKarti
                  etiket="Tahmini organik trafik"
                  deger={kisaSayi(istatistik.tahmini_trafik ?? 0)}
                  ipucu="Sıralamalarınıza ve tıklama oranlarına göre hesaplanan aylık ziyaretçi tahmini."
                  altMetin="aylık ziyaret"
                />
                <OlcumKarti
                  etiket="Kritik sorun"
                  deger={sayi(istatistik.kritik_sorun ?? 0)}
                  ipucu="Sıralamayı doğrudan engelleyen, öncelikli çözülmesi gereken teknik sorunlar."
                  altMetin={`${sayi(acikSorun ?? 0)} açık sorun`}
                />
                <OlcumKarti
                  etiket="Taranan sayfa"
                  deger={sayi(istatistik.taranan_sayfa ?? 0)}
                  altMetin={`${sayi(istatistik.urun_sayisi ?? 0)} ürün · ${sayi(istatistik.kategori_sayisi ?? 0)} kategori`}
                />
                <OlcumKarti
                  etiket="AI görünürlüğü"
                  deger={skorlar.ai !== null && skorlar.ai !== undefined ? `${skorlar.ai}/100` : "—"}
                  ipucu="Marka ve ürünlerinizin yapay zekâ destekli arama cevaplarındaki görünürlüğü."
                  aksiyon={
                    <Link href="/ai-gorunurlugu" className="text-[12px] text-ink-400 hover:text-ink-900">
                      Detay
                    </Link>
                  }
                />
                <OlcumKarti
                  etiket="Merchant skoru"
                  deger={skorlar.merchant !== null && skorlar.merchant !== undefined ? `${skorlar.merchant}/100` : "—"}
                  ipucu="Ürünlerinizin Google Alışveriş için gereken alanları karşılama oranı."
                  aksiyon={
                    <Link href="/merchant-analizi" className="text-[12px] text-ink-400 hover:text-ink-900">
                      Detay
                    </Link>
                  }
                />
              </div>
            </div>
          </section>

          {/* ---------------- Aksiyonlar ---------------- */}
          <section>
            <BolumBasligi
              baslik="Bu hafta yapılacaklar"
              aciklama="Etkisi en yüksek işler önce gelir."
              sag={
                <Buton asChild gorunum="ikincil" boyut="sm">
                  <Link href="/aksiyon-merkezi">
                    Aksiyon Merkezi
                    <ArrowRight aria-hidden />
                  </Link>
                </Buton>
              }
            />

            <div className="mt-4">
              {aksiyonlar.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong bg-white/60 px-4 py-8 text-center text-[13px] text-ink-400">
                  Bekleyen kritik aksiyon yok. Analizi yenileyerek yeni fırsatları görebilirsiniz.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
                  {aksiyonlar.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <OncelikRozeti oncelik={a.priority} />
                          <Rozet>{a.affected_count > 1 ? `${sayi(a.affected_count)} sayfa` : "Tek sayfa"}</Rozet>
                        </div>
                        <p className="mt-2 text-[14px] font-medium text-ink-900">{a.title}</p>
                        {a.description ? (
                          <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{a.description}</p>
                        ) : null}
                      </div>
                      <Buton asChild gorunum="ikincil" boyut="sm">
                        <Link href={`/aksiyon-merkezi?aksiyon=${a.id}`}>Detayları İncele</Link>
                      </Buton>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ---------------- Fırsatlar + hareketler ---------------- */}
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <BolumBasligi
                baslik="En yüksek fırsatlar"
                aciklama="Kazanılması en olası anahtar kelimeler."
                sag={
                  <Link href="/kelime-firsatlari" className="text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
                    Tümü
                  </Link>
                }
              />
              <div className="mt-4">
                {firsatlar.length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-400">
                    Henüz fırsat hesaplanmadı.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {firsatlar.map((f) => (
                      <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/anahtar-kelimeler/${f.keywordId}`}
                            className="block truncate text-[13.5px] font-medium text-ink-900 hover:underline"
                          >
                            {f.keyword}
                          </Link>
                          <p className="tabular mt-0.5 text-[12px] text-ink-400">
                            {sayi(f.hacim ?? 0)} arama ·{" "}
                            {f.pozisyon ? `${f.pozisyon}. sıra` : "sıralanmıyor"}
                            {f.trafik ? ` · +${sayi(f.trafik)} tahmini ziyaret` : ""}
                          </p>
                        </div>
                        <FirsatSkoru skor={f.skor} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <BolumBasligi
                baslik="Kelime hareketleri"
                aciklama="Son analizde en çok değişen sıralamalar."
                sag={
                  <Link href="/anahtar-kelimeler" className="text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
                    Tümü
                  </Link>
                }
              />
              <div className="mt-4">
                {hareketler.length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-400">
                    Karşılaştırma için henüz yeterli geçmiş yok. İkinci analizden sonra hareketler burada görünür.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {hareketler.map((h) => (
                      <li key={h.keywordId} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <Link
                            href={`/anahtar-kelimeler/${h.keywordId}`}
                            className="block truncate text-[13.5px] text-ink-900 hover:underline"
                          >
                            {h.keyword}
                          </Link>
                          <p className="tabular mt-0.5 text-[12px] text-ink-400">
                            {h.onceki}. sıradan {h.pozisyon}. sıraya
                          </p>
                        </div>
                        <PozisyonDegisimi simdiki={h.pozisyon} onceki={h.onceki} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* ---------------- Performans grafiği ---------------- */}
          <section>
            <BolumBasligi
              baslik="SEO performansı"
              aciklama="Analizler arasındaki genel skor değişimi."
            />
            <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
              {grafikVerisi.length >= 2 ? (
                <CizgiGrafik veri={grafikVerisi} yukseklik={220} birim="puan" />
              ) : (
                <p className="py-10 text-center text-[13px] text-ink-400">
                  Grafik için en az iki analiz gerekiyor. Bir sonraki analizden sonra değişim burada görünecek.
                </p>
              )}
            </div>
          </section>

          {/* ---------------- Rakipler + son analizler ---------------- */}
          <section className="grid gap-8 lg:grid-cols-2">
            <div>
              <BolumBasligi
                baslik="Rakip hareketleri"
                sag={
                  <Link href="/rakipler" className="text-[12.5px] font-medium text-ink-500 hover:text-ink-900">
                    Tümü
                  </Link>
                }
              />
              <div className="mt-4">
                {rakipler.length === 0 ? (
                  <div className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center">
                    <p className="text-[13px] text-ink-400">Henüz rakip eklenmemiş.</p>
                    <Buton asChild gorunum="ikincil" boyut="sm" className="mt-3">
                      <Link href="/rakipler">
                        <Users aria-hidden />
                        Rakip Ekle
                      </Link>
                    </Buton>
                  </div>
                ) : (
                  <ul className="divide-y divide-line">
                    {rakipler.map((r) => {
                      const m = r.metrics as Record<string, number | undefined>;
                      return (
                        <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <Link
                              href={`/rakip-analizi/${r.id}`}
                              className="block truncate text-[13.5px] font-medium text-ink-900 hover:underline"
                            >
                              {r.domain}
                            </Link>
                            <p className="tabular mt-0.5 text-[12px] text-ink-400">
                              {sayi(m.organik_kelime ?? 0)} kelime · {kisaSayi(m.tahmini_trafik ?? 0)} tahmini trafik
                            </p>
                          </div>
                          {m.acik_firsat ? (
                            <Rozet ton="uyari">{sayi(m.acik_firsat)} fırsat</Rozet>
                          ) : (
                            <span className="text-[12px] text-ink-300">—</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div>
              <BolumBasligi baslik="Son analizler" />
              <div className="mt-4">
                {isler.length === 0 ? (
                  <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-400">
                    Henüz analiz kaydı yok.
                  </p>
                ) : (
                  <ul className="divide-y divide-line">
                    {isler.map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] text-ink-900">
                            {IS_TURU_ADI[i.job_type as IsTuru] ?? "Analiz"}
                          </p>
                          <p className="mt-0.5 text-[12px] text-ink-400">{tarih(i.created_at)}</p>
                        </div>
                        <Rozet
                          ton={
                            i.status === "tamamlandi"
                              ? "olumlu"
                              : i.status === "hatali"
                                ? "kritik"
                                : "bilgi"
                          }
                        >
                          {i.status === "tamamlandi"
                            ? "Tamamlandı"
                            : i.status === "hatali"
                              ? "Hatalı"
                              : "Devam ediyor"}
                        </Rozet>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          {/* ---------------- Sorun dağılımı ---------------- */}
          {(acikSorun ?? 0) > 0 ? (
            <section>
              <BolumBasligi
                baslik="Açık sorunlar"
                aciklama="Teknik SEO taramasında bulunan ve henüz çözülmemiş sorunlar."
                sag={
                  <Buton asChild gorunum="ikincil" boyut="sm">
                    <Link href="/teknik-seo">
                      <AlertTriangle aria-hidden />
                      Sorunları Gör
                    </Link>
                  </Buton>
                }
              />
              <div className="mt-4 rounded-[14px] border border-line bg-white p-4">
                <SorunDagilimi projeId={proje.id} />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

async function SorunDagilimi({ projeId }: { projeId: string }) {
  const supabase = await sunucuIstemcisi();
  const { data } = await supabase
    .from("technical_issues")
    .select("severity")
    .eq("project_id", projeId)
    .eq("status", "acik")
    .limit(5000);

  const sayaclar = { kritik: 0, uyari: 0, bilgi: 0 };
  for (const s of data ?? []) {
    sayaclar[s.severity as keyof typeof sayaclar]++;
  }

  return (
    <DagilimSeridi
      dilimler={[
        { etiket: "Kritik", deger: sayaclar.kritik, renk: "var(--color-critical)" },
        { etiket: "Uyarı", deger: sayaclar.uyari, renk: "var(--color-caution)" },
        { etiket: "Bilgi", deger: sayaclar.bilgi, renk: "var(--color-ink-300)" },
      ]}
    />
  );
}
