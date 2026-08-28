/**
 * Tarayıcı parmak izi.
 *
 * Amaç kullanıcıyı tanımlamak değil, ücretsiz aracın günlük hakkını
 * cihaz düzeyinde saymaktır. Çerezden bağımsız olduğu için gizli sekmede
 * ve çerez temizliğinde de aynı değeri üretir.
 *
 * Toplanan hiçbir alan kişisel veri değildir; değer sunucuya ulaşmadan
 * önce tek yönlü olarak özetlenir ve sunucuda ayrıca tuzlanarak saklanır.
 */

/** Donanım ve tarayıcı özelliklerinden dayanıklı bir imza üretir. */
function imzaParcalari(): string[] {
  if (typeof window === "undefined") return ["sunucu"];

  const n = window.navigator;
  const s = window.screen;

  const parcalar: string[] = [
    n.userAgent ?? "",
    n.language ?? "",
    (n.languages ?? []).join(","),
    String(n.hardwareConcurrency ?? ""),
    String((n as Navigator & { deviceMemory?: number }).deviceMemory ?? ""),
    String(n.maxTouchPoints ?? ""),
    `${s.width}x${s.height}x${s.colorDepth}`,
    String(window.devicePixelRatio ?? ""),
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
    String(new Date().getTimezoneOffset()),
  ];

  // Canvas çizimi, GPU ve font yığınına göre cihazdan cihaza değişir.
  try {
    const tuval = document.createElement("canvas");
    tuval.width = 220;
    tuval.height = 40;
    const ctx = tuval.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#0C111D";
      ctx.fillRect(0, 0, 220, 40);
      ctx.fillStyle = "#F7F7F8";
      ctx.fillText("SEO Evi sıra bulucu · ĞİŞÇÖÜ", 2, 12);
      parcalar.push(tuval.toDataURL().slice(-96));
    }
  } catch {
    // Canvas engelliyse diğer sinyaller yeterlidir.
  }

  return parcalar;
}

/** SHA-256 özeti; tarayıcıda Web Crypto ile hesaplanır. */
async function ozetle(metin: string): Promise<string> {
  try {
    const veri = new TextEncoder().encode(metin);
    const tampon = await crypto.subtle.digest("SHA-256", veri);
    return Array.from(new Uint8Array(tampon))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 48);
  } catch {
    // Güvenli olmayan bağlamda (http) Web Crypto bulunmayabilir.
    let h = 0;
    for (let i = 0; i < metin.length; i++) {
      h = (h << 5) - h + metin.charCodeAt(i);
      h |= 0;
    }
    return `y${Math.abs(h).toString(16).padStart(12, "0")}`;
  }
}

let onbellek: string | null = null;

/** Cihazın parmak izini üretir (aynı oturumda tekrar hesaplanmaz). */
export async function parmakIziAl(): Promise<string> {
  if (onbellek) return onbellek;
  const imza = await ozetle(imzaParcalari().join("|"));
  onbellek = imza;
  return imza;
}
