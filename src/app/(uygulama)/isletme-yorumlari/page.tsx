import { MessageSquare, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ModulAnaliziButonu } from "@/components/app/modul-analizi";
import { PaketUyarisi } from "@/components/app/paket-uyarisi";
import { SayfaBasligi } from "@/components/app/sayfa-basligi";
import { Rozet } from "@/components/ui/badge";
import { Buton } from "@/components/ui/button";
import { BosDurum, Uyari } from "@/components/ui/feedback";
import { OzetDegeri } from "@/components/ui/metric";
import { BolumBasligi } from "@/components/ui/surface";
import { projeBaglami } from "@/lib/projects";
import { abonelikDurumu } from "@/lib/subscription";
import { sunucuIstemcisi } from "@/lib/supabase/server";
import { sayi, tarih } from "@/lib/utils";

export const metadata: Metadata = {
  title: "İşletme Yorumları",
  robots: { index: false, follow: false },
};

type YorumSatiri = {
  id: string;
  yazar: string | null;
  puan: number | null;
  metin: string | null;
  yorum_tarihi: string | null;
};

function Yildizlar({ puan }: { puan: number | null }) {
  if (puan === null) return <span className="text-ink-300">—</span>;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${puan} yıldız`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= Math.round(puan) ? "size-3.5 fill-caution text-caution" : "size-3.5 text-ink-200"
          }
          aria-hidden
        />
      ))}
    </span>
  );
}

export default async function IsletmeYorumlariSayfasi() {
  const { kullanici, proje } = await projeBaglami();
  const supabase = await sunucuIstemcisi();

  const [{ limitler }, { data: ayar }, { data: ozet }, { data: yorumVerisi }, { data: calisanIs }] =
    await Promise.all([
      abonelikDurumu(kullanici.id),
      supabase
        .from("project_settings")
        .select("google_isletme_adi")
        .eq("project_id", proje.id)
        .maybeSingle(),
      supabase
        .from("isletme_ozeti")
        .select("baslik, puan, oy_sayisi, olculdu_at")
        .eq("project_id", proje.id)
        .maybeSingle(),
      supabase
        .from("isletme_yorumlari")
        .select("id, yazar, puan, metin, yorum_tarihi")
        .eq("project_id", proje.id)
        .order("yorum_tarihi", { ascending: false, nullsFirst: false })
        .limit(50),
      supabase
        .from("audit_jobs")
        .select("id")
        .eq("project_id", proje.id)
        .eq("job_type", "isletme")
        .in("status", ["bekliyor", "isleniyor", "yeniden_deneniyor"])
        .limit(1)
        .maybeSingle(),
    ]);

  const isletmeAdi = (ayar?.google_isletme_adi ?? "").trim();
  const izinli = limitler?.isletme_yorumlari === true;

  const baslik = (
    <SayfaBasligi
      baslik="İşletme Yorumları"
      aciklama="Marka aramalarında Google işletme kartınızı yıldızıyla gösterir. Puanınız tıklamayı ve güveni doğrudan etkiler."
      aksiyon={
        izinli && isletmeAdi ? (
          <ModulAnaliziButonu
            projeId={proje.id}
            tur="isletme"
            etiket="Yorumları Getir"
            gorunum="ikincil"
            calisanIsId={calisanIs?.id ?? null}
          />
        ) : undefined
      }
    />
  );

  if (!izinli) {
    return (
      <>
        {baslik}
        <PaketUyarisi
          ozellik="İşletme yorumları"
          aciklama="Google İşletme kaydınızdaki puanı, oy sayısını ve son yorumları izler. Şikâyet başlıkları çoğu zaman ürün sayfalarında düzeltilebilecek somut sorunlara işaret eder."
        />
      </>
    );
  }

  /*
   * İşletme adı olmadan arama yapılmaz: tahminle arama yapmak başka bir
   * işletmenin yorumlarını getirebilir ve kullanıcı yanlış veriye bakar.
   */
  if (!isletmeAdi) {
    return (
      <>
        {baslik}
        <BosDurum
          ikon={MessageSquare}
          baslik="Önce Google İşletme adınızı girin."
          aciklama="Yorumları çekebilmemiz için işletmenizin Google Haritalar'daki kayıtlı adına ihtiyacımız var. Tahminle arama yapmıyoruz; yanlış işletmenin yorumlarını göstermek yanlış karar aldırır."
          aksiyon={
            <Buton asChild>
              <Link href="/ayarlar">Ayarlara Git</Link>
            </Buton>
          }
        />
      </>
    );
  }

  const yorumlar = (yorumVerisi ?? []) as YorumSatiri[];

  if (!ozet) {
    return (
      <>
        {baslik}
        <Uyari ton="uyari">
          &quot;{isletmeAdi}&quot; için henüz ölçüm yapılmadı ya da Google&apos;da eşleşen bir
          işletme kaydı bulunamadı. Kaydı olmayan, yalnızca çevrim içi satan mağazalarda bu veri
          bulunmaz. Adı Google Haritalar&apos;da göründüğü biçimde yazdığınızdan emin olup
          &quot;Yorumları Getir&quot; ile tekrar deneyebilirsiniz.
        </Uyari>
      </>
    );
  }

  const olumsuz = yorumlar.filter((y) => y.puan !== null && y.puan <= 2);

  return (
    <>
      {baslik}

      <div className="mb-6 grid grid-cols-2 gap-6 border-b border-line pb-6 sm:grid-cols-4">
        <OzetDegeri
          etiket="Puan"
          deger={
            ozet.puan === null ? (
              "—"
            ) : (
              <span className="inline-flex items-baseline gap-2">
                {ozet.puan.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
                <Yildizlar puan={ozet.puan} />
              </span>
            )
          }
          ipucu="Google İşletme kaydınızın ortalama puanı."
        />
        <OzetDegeri
          etiket="Toplam oy"
          deger={sayi(ozet.oy_sayisi)}
          ipucu="Puanı oluşturan toplam değerlendirme sayısı."
        />
        <OzetDegeri
          etiket="Okunan yorum"
          deger={sayi(yorumlar.length)}
          ipucu="Metnini çektiğimiz son yorum sayısı; toplam oy sayısından azdır."
        />
        <OzetDegeri
          etiket="Olumsuz (1-2 yıldız)"
          deger={sayi(olumsuz.length)}
          ipucu="Okunan yorumlar içinde düşük puanlı olanlar."
        />
      </div>

      {ozet.baslik ? (
        <p className="mb-6 text-[13px] text-ink-500">
          Kayıt: <span className="font-medium text-ink-800">{ozet.baslik}</span> ·{" "}
          {tarih(ozet.olculdu_at)} tarihinde ölçüldü
        </p>
      ) : null}

      {yorumlar.length ? (
        <>
          <BolumBasligi
            baslik="Son yorumlar"
            aciklama="Düşük puanlı yorumlarda tekrar eden başlıklar (kargo, iade, beden) çoğu zaman ürün sayfasında da düzeltilebilir."
          />
          <ul className="mt-4 space-y-2">
            {yorumlar.map((y) => (
              <li key={y.id} className="rounded-[14px] border border-line bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Yildizlar puan={y.puan} />
                  {y.puan !== null && y.puan <= 2 ? <Rozet ton="kritik">olumsuz</Rozet> : null}
                  {y.yazar ? (
                    <span className="text-[12.5px] text-ink-500">{y.yazar}</span>
                  ) : null}
                  {y.yorum_tarihi ? (
                    <span className="text-[12px] text-ink-300">{tarih(y.yorum_tarihi)}</span>
                  ) : null}
                </div>
                {y.metin ? (
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{y.metin}</p>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-400">
                    Bu değerlendirmede yazılı yorum yok, yalnızca puan verilmiş.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <BosDurum
          ikon={MessageSquare}
          baslik="Yorum metni bulunamadı."
          aciklama="İşletme kaydı bulundu ancak metinli yorum çekilemedi. Kayıtta yazılı yorum olmayabilir."
        />
      )}
    </>
  );
}
