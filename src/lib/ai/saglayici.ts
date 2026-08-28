import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * Yapay zekâ sağlayıcısı soyutlaması.
 *
 * Bileşenler doğrudan sağlayıcıya bağlanmaz; yalnızca bu modül üzerinden
 * çağrı yapılır. Böylece sağlayıcı değiştiğinde arayüz kodu etkilenmez.
 */

export class AiHatasi extends Error {
  readonly kullaniciMesaji: string;

  constructor(teknikMesaj: string, kullaniciMesaji?: string) {
    super(teknikMesaj);
    this.name = "AiHatasi";
    this.kullaniciMesaji =
      kullaniciMesaji ?? "Öneri üretilirken geçici bir sorun oluştu. Birkaç dakika sonra tekrar deneyin.";
  }
}

export function aiHazirMi(): boolean {
  return Boolean(process.env.AI_PROVIDER_KEY);
}

function istemci(): Anthropic {
  const anahtar = process.env.AI_PROVIDER_KEY;
  if (!anahtar) throw new AiHatasi("AI_PROVIDER_KEY tanımlı değil.");
  return new Anthropic({ apiKey: anahtar });
}

function model(): string {
  return process.env.AI_MODEL ?? "claude-sonnet-5";
}

export type AiIstek = {
  sistem: string;
  kullanici: string;
  azamiJeton?: number;
  /** Yanıtın JSON olarak başlaması için ön ek. */
  jsonModu?: boolean;
};

/** Metin yanıtı üretir. */
export async function aiMetin({ sistem, kullanici, azamiJeton = 1200 }: AiIstek): Promise<string> {
  try {
    const yanit = await istemci().messages.create({
      model: model(),
      max_tokens: azamiJeton,
      system: sistem,
      messages: [{ role: "user", content: kullanici }],
    });

    const parcalar = yanit.content
      .filter((p): p is Anthropic.TextBlock => p.type === "text")
      .map((p) => p.text);

    return parcalar.join("\n").trim();
  } catch (hata) {
    console.error("[ai] çağrı hatası", {
      mesaj: hata instanceof Error ? hata.message : String(hata),
    });
    throw new AiHatasi(hata instanceof Error ? hata.message : "Bilinmeyen hata");
  }
}

/**
 * JSON yanıtı üretir.
 * Model çıktısı doğrudan ayrıştırılamazsa ilk JSON bloğu aranır.
 */
export async function aiJson<T>({ sistem, kullanici, azamiJeton = 1600 }: AiIstek): Promise<T> {
  const metin = await aiMetin({
    sistem: `${sistem}\n\nYanıtını yalnızca geçerli JSON olarak ver. Açıklama, kod bloğu işareti veya ek metin ekleme.`,
    kullanici,
    azamiJeton,
  });

  try {
    return JSON.parse(metin) as T;
  } catch {
    const eslesme = metin.match(/\{[\s\S]*\}/);
    if (eslesme) {
      try {
        return JSON.parse(eslesme[0]) as T;
      } catch {
        /* aşağıda hata fırlatılır */
      }
    }
    console.error("[ai] JSON ayrıştırılamadı", { uzunluk: metin.length });
    throw new AiHatasi("Model yanıtı JSON olarak ayrıştırılamadı.");
  }
}

/** Tüm istemler için ortak marka ve dil kuralları. */
export const SISTEM_TEMELI = `Sen SEO Evi adlı Türkçe e-ticaret SEO platformunun analiz motorusun.

Kurallar:
- Yanıtların her zaman Türkçe olacak.
- Kısa, net ve uygulanabilir yaz. Genel SEO tavsiyesi verme.
- Yalnızca sana verilen gerçek veriye dayan. Veride olmayan bir şeyi uydurma.
- Sayı verirken kullanıcının verisindeki sayıları kullan.
- Abartılı pazarlama dili, emoji ve İngilizce terim kullanma.
- "optimize etmek" yerine "iyileştirmek", "keyword" yerine "anahtar kelime" gibi Türkçe karşılıkları tercih et.`;
