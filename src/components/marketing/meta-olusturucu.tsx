"use client";

import { Check, Copy } from "lucide-react";
import { useMemo, useState } from "react";

import { Buton } from "@/components/ui/button";
import { Alan, SecimAlani } from "@/components/ui/form";
import { BolumBasligi } from "@/components/ui/surface";
import { cn } from "@/lib/utils";

/**
 * Başlık ve açıklama oluşturucular.
 * Tamamen tarayıcıda çalışır; hiçbir veri sunucuya gönderilmez.
 */

type Tur = "baslik" | "aciklama";

const SINIRLAR: Record<Tur, { ideal: [number, number]; azami: number; pikselSiniri: number }> = {
  baslik: { ideal: [30, 60], azami: 70, pikselSiniri: 580 },
  aciklama: { ideal: [120, 158], azami: 175, pikselSiniri: 990 },
};

/**
 * Arama sonuçlarında kırpılma karakter sayısına değil piksel genişliğine bağlıdır.
 * Geniş harfler daha çok yer kaplar; bu yaklaşık ölçüm bunu hesaba katar.
 */
function pikselGenisligi(metin: string, tur: Tur): number {
  const temel = tur === "baslik" ? 9.6 : 7.5;
  let toplam = 0;

  for (const karakter of metin) {
    if ("iıjlt.,;:'!|".includes(karakter)) toplam += temel * 0.42;
    else if ("fr()[]-".includes(karakter)) toplam += temel * 0.56;
    else if ("mwMW".includes(karakter)) toplam += temel * 1.42;
    else if (karakter === " ") toplam += temel * 0.44;
    else if (karakter === karakter.toLocaleUpperCase("tr-TR") && /\p{L}/u.test(karakter)) {
      toplam += temel * 1.14;
    } else toplam += temel;
  }
  return Math.round(toplam);
}

/** Türkçe küçük harfler için doğru büyütme (i -> İ). */
function buyuk(harf: string): string {
  return harf.toLocaleUpperCase("tr-TR");
}

/** "vestel buzdolabı" -> "Vestel Buzdolabı" */
function baslikBicimi(metin: string): string {
  // Bağlaçlar başlık ortasında küçük kalır.
  const KUCUK = new Set(["ve", "ile", "için", "de", "da", "mi", "mı"]);

  return metin
    .split(/\s+/)
    .filter(Boolean)
    .map((kelime, i) => {
      const kucuk = kelime.toLocaleLowerCase("tr-TR");
      if (i > 0 && KUCUK.has(kucuk)) return kucuk;
      return buyuk(kucuk.charAt(0)) + kucuk.slice(1);
    })
    .join(" ");
}

/** "vestel buzdolabı" -> "Vestel buzdolabı" */
function cumleBicimi(metin: string): string {
  const t = metin.trim();
  if (!t) return t;
  return buyuk(t.charAt(0)) + t.slice(1);
}

function durumRengi(uzunluk: number, tur: Tur): { renk: string; etiket: string } {
  const { ideal, azami } = SINIRLAR[tur];
  if (uzunluk === 0) return { renk: "text-ink-300", etiket: "Boş" };
  if (uzunluk < ideal[0]) return { renk: "text-caution", etiket: "Kısa" };
  if (uzunluk <= ideal[1]) return { renk: "text-positive", etiket: "İdeal" };
  if (uzunluk <= azami) return { renk: "text-caution", etiket: "Uzun" };
  return { renk: "text-critical", etiket: "Çok uzun" };
}

/* ------------------------------------------------------------------ */
/* Kopyalanabilir satır                                                */
/* ------------------------------------------------------------------ */

function OneriSatiri({ metin, tur }: { metin: string; tur: Tur }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const uzunluk = metin.length;
  const durum = durumRengi(uzunluk, tur);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Panoya erişilemezse kullanıcı metni elle seçebilir.
    }
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-relaxed text-ink-800">{metin}</p>
        <p className={cn("mt-1 text-[11.5px] font-medium", durum.renk)}>
          {uzunluk} karakter · {durum.etiket}
        </p>
      </div>
      <button
        type="button"
        onClick={kopyala}
        aria-label="Öneriyi kopyala"
        className="shrink-0 rounded-[8px] p-1.5 text-ink-300 transition-colors hover:bg-surface-muted hover:text-ink-700"
      >
        {kopyalandi ? (
          <Check className="size-3.5 text-positive" aria-hidden />
        ) : (
          <Copy className="size-3.5" aria-hidden />
        )}
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Ana bileşen                                                         */
/* ------------------------------------------------------------------ */

export function MetaOlusturucu({ tur }: { tur: Tur }) {
  const [kelime, setKelime] = useState("");
  const [marka, setMarka] = useState("");
  const [ek, setEk] = useState("");
  const [sayfaTuru, setSayfaTuru] = useState("urun");
  const [metin, setMetin] = useState("");
  const [kopyalandi, setKopyalandi] = useState(false);

  const uzunluk = metin.length;
  const piksel = pikselGenisligi(metin, tur);
  const durum = durumRengi(uzunluk, tur);
  const { ideal, azami, pikselSiniri } = SINIRLAR[tur];
  const kirpilirMi = piksel > pikselSiniri;

  const oneriler = useMemo(() => {
    const k = kelime.trim();
    if (!k) return [];

    // Başlıkta her kelime büyük harfle başlar; açıklamada yalnızca ilk harf.
    const K = tur === "baslik" ? baslikBicimi(k) : cumleBicimi(k);
    const m = marka.trim();
    const e = ek.trim();
    const markaEki = m ? ` | ${m}` : "";

    if (tur === "baslik") {
      const kaliplar: Record<string, string[]> = {
        urun: [
          `${K} Fiyatları ve Modelleri${markaEki}`,
          `${K} — En Uygun Fiyatlarla${markaEki}`,
          `${K} Çeşitleri${e ? ` ${e}` : ""}${markaEki}`,
          `${K} Satın Al${markaEki}`,
        ],
        kategori: [
          `${K} Modelleri ve Fiyatları${markaEki}`,
          `${K} — Tüm Çeşitler ve Markalar${markaEki}`,
          `En İyi ${K} Seçenekleri${markaEki}`,
        ],
        icerik: [
          `${K} Nedir? Bilmeniz Gereken Her Şey${markaEki}`,
          `${K} Rehberi: Adım Adım Anlatım${markaEki}`,
          `${K} Nasıl Yapılır?${markaEki}`,
        ],
        anasayfa: [
          `${K}${e ? ` — ${e}` : ""}${markaEki}`,
          `${m || K} | ${K} ve Daha Fazlası`,
        ],
      };

      return (kaliplar[sayfaTuru] ?? kaliplar.urun).filter((o) => o.length <= azami);
    }

    const kaliplar: Record<string, string[]> = {
      urun: [
        `${K} arıyorsanız doğru yerdesiniz. Geniş ${k} çeşitleri, uygun fiyatlar ve hızlı teslimat${m ? ` ${m}` : ""}'de. Hemen inceleyin.`,
        `${K} modellerini karşılaştırın, size en uygun olanı seçin. ${e || "Güvenli ödeme ve kolay iade"} avantajıyla sipariş verin.`,
      ],
      kategori: [
        `${K} kategorisindeki tüm ürünleri inceleyin. Farklı marka ve fiyat seçenekleriyle aradığınız ${k} burada. ${e || "Hemen keşfedin."}`,
        `En çok tercih edilen ${k} modelleri bir arada. Fiyat, özellik ve kullanıcı yorumlarını karşılaştırarak karar verin.`,
      ],
      icerik: [
        `${K} hakkında bilmeniz gereken her şey bu rehberde. ${e || "Adım adım anlatım, örnekler ve sık yapılan hatalar"} bir arada.`,
        `${K} nedir, nasıl yapılır ve nelere dikkat etmelisiniz? Sorularınızın yanıtını bu yazıda bulacaksınız.`,
      ],
      anasayfa: [
        `${m || K} ile ${k} ihtiyacınızı karşılayın. ${e || "Geniş ürün yelpazesi, uygun fiyatlar ve hızlı teslimat"}. Hemen keşfedin.`,
      ],
    };

    return (kaliplar[sayfaTuru] ?? kaliplar.urun).filter((o) => o.length <= azami);
  }, [kelime, marka, ek, sayfaTuru, tur, azami]);

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      // Panoya erişilemezse kullanıcı metni elle seçebilir.
    }
  }

  const etiket = tur === "baslik" ? "Başlık etiketi" : "Meta açıklama";

  return (
    <div className="space-y-10">
      {/* --- Girdiler --- */}
      <section className="grid gap-5 sm:grid-cols-2">
        <Alan
          etiket="Hedef anahtar kelime"
          name="kelime"
          value={kelime}
          onChange={(e) => setKelime(e.target.value)}
          placeholder="vestel buzdolabı"
          yardim="Sayfanın sıralanmasını istediğiniz ana kelime."
        />
        <Alan
          etiket="Marka adı"
          name="marka"
          value={marka}
          onChange={(e) => setMarka(e.target.value)}
          placeholder="Mağazam"
          yardim="İsteğe bağlı. Başlığın sonuna eklenir."
        />
        <SecimAlani
          etiket="Sayfa türü"
          name="sayfaTuru"
          value={sayfaTuru}
          onChange={(e) => setSayfaTuru(e.target.value)}
        >
          <option value="urun">Ürün sayfası</option>
          <option value="kategori">Kategori sayfası</option>
          <option value="icerik">İçerik / blog</option>
          <option value="anasayfa">Ana sayfa</option>
        </SecimAlani>
        <Alan
          etiket="Öne çıkarmak istediğiniz özellik"
          name="ek"
          value={ek}
          onChange={(e) => setEk(e.target.value)}
          placeholder="Ücretsiz kargo"
          yardim="İsteğe bağlı. Metne doğal biçimde yerleştirilir."
        />
      </section>

      {/* --- Öneriler --- */}
      {oneriler.length ? (
        <section>
          <BolumBasligi
            baslik="Öneriler"
            aciklama="Kopyalayıp doğrudan kullanabilir veya düzenleyerek kendinize uyarlayabilirsiniz."
          />
          <ul className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white">
            {oneriler.map((o) => (
              <OneriSatiri key={o} metin={o} tur={tur} />
            ))}
          </ul>
        </section>
      ) : null}

      {/* --- Düzenleyici --- */}
      <section>
        <BolumBasligi
          baslik="Kendi metninizi yazın"
          aciklama="Yazarken karakter sayısı ve arama sonucunda kırpılıp kırpılmayacağı anlık olarak ölçülür."
        />

        <div className="mt-4 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="meta-metin" className="text-[13px] font-medium text-ink-700">
              {etiket}
            </label>
            <span className={cn("tabular text-[12.5px] font-medium", durum.renk)}>
              {uzunluk} / {ideal[1]} karakter · {durum.etiket}
            </span>
          </div>

          <textarea
            id="meta-metin"
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            rows={tur === "baslik" ? 2 : 4}
            placeholder={
              tur === "baslik"
                ? "Vestel No Frost Buzdolabı Modelleri ve Fiyatları"
                : "Vestel buzdolabı modellerini karşılaştırın, size en uygun olanı seçin…"
            }
            className="w-full rounded-[10px] border border-line bg-white px-3.5 py-2.5 text-[14px] leading-relaxed text-ink-900 placeholder:text-ink-300 focus:border-ink-400 focus:outline-none focus:ring-4 focus:ring-ink-900/5"
          />

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                kirpilirMi ? "bg-critical" : uzunluk >= ideal[0] ? "bg-positive" : "bg-caution",
              )}
              style={{ width: `${Math.min(100, (piksel / pikselSiniri) * 100)}%` }}
            />
          </div>

          <p className="text-[12px] text-ink-400">
            Yaklaşık genişlik: {piksel} / {pikselSiniri} piksel.{" "}
            {kirpilirMi
              ? "Bu metin arama sonuçlarında kırpılacak."
              : "Arama sonuçlarında tam görünür."}
          </p>

          {metin ? (
            <div className="pt-1">
              <Buton gorunum="ikincil" boyut="sm" onClick={kopyala}>
                {kopyalandi ? <Check aria-hidden /> : <Copy aria-hidden />}
                {kopyalandi ? "Kopyalandı" : "Metni Kopyala"}
              </Buton>
            </div>
          ) : null}
        </div>
      </section>

      {/* --- Önizleme --- */}
      {metin ? (
        <section>
          <BolumBasligi
            baslik="Arama sonucu önizlemesi"
            aciklama="Metniniz arama sonuçlarında yaklaşık olarak böyle görünür."
          />
          <div className="mt-4 rounded-[14px] border border-line bg-white p-5">
            <p className="text-[12.5px] text-ink-500">
              {marka.trim() ? marka.trim().toLocaleLowerCase("tr-TR") : "magazam"}.com › {sayfaTuru}
            </p>
            <p className="mt-1 text-[18px] leading-snug text-[#1a0dab]">
              {tur === "baslik"
                ? kirpilirMi
                  ? `${metin.slice(0, 60)}…`
                  : metin
                : "Sayfa Başlığınız Burada Görünür"}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
              {tur === "aciklama"
                ? kirpilirMi
                  ? `${metin.slice(0, 158)}…`
                  : metin
                : "Meta açıklamanız burada görünür. Kullanıcının tıklama kararını bu metin etkiler."}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
