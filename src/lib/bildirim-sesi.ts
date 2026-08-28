/**
 * Bildirim sesi.
 *
 * Ses dosyası indirmek yerine iki notalık kısa bir "ding" tarayıcıda
 * üretilir: ek ağ isteği yok, gecikme yok, önbellek derdi yok.
 *
 * Tarayıcılar sayfayla etkileşim olmadan ses çalmaya izin vermez; bu
 * yüzden hata sessizce yutulur — ses çalınamaması hiçbir akışı bozmaz.
 */

const SES_TERCIHI = "seoevi_bildirim_sesi";

/** Kullanıcı bildirim sesini kapattı mı? */
export function sesAcikMi(): boolean {
  try {
    return localStorage.getItem(SES_TERCIHI) !== "kapali";
  } catch {
    return true;
  }
}

export function sesTercihiniDegistir(acik: boolean): void {
  try {
    localStorage.setItem(SES_TERCIHI, acik ? "acik" : "kapali");
  } catch {
    // Depolama kapalıysa tercih o oturum için geçerli olmaz; sorun değil.
  }
}

/**
 * Kısa, alçak sesli bir bildirim tonu çalar.
 *
 * İki nota (G5 → C6) yükselen bir üçlü oluşturur; dikkat çeker ama
 * rahatsız etmez. Ses düzeyi bilerek düşük tutulmuştur.
 */
export function bildirimSesiCal(): void {
  if (typeof window === "undefined" || !sesAcikMi()) return;

  try {
    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const simdi = ctx.currentTime;

    const notalar = [
      { frekans: 784, baslangic: 0, sure: 0.12 },
      { frekans: 1047, baslangic: 0.09, sure: 0.22 },
    ];

    for (const nota of notalar) {
      const osilator = ctx.createOscillator();
      const kazanc = ctx.createGain();

      osilator.type = "sine";
      osilator.frequency.value = nota.frekans;

      // Ani başlangıç ve bitiş "tık" sesi üretir; yumuşak zarf kullanılır.
      const t = simdi + nota.baslangic;
      kazanc.gain.setValueAtTime(0, t);
      kazanc.gain.linearRampToValueAtTime(0.08, t + 0.015);
      kazanc.gain.exponentialRampToValueAtTime(0.0001, t + nota.sure);

      osilator.connect(kazanc);
      kazanc.connect(ctx.destination);
      osilator.start(t);
      osilator.stop(t + nota.sure + 0.02);
    }

    // Bağlam açık kalırsa tarayıcı kaynağı boşuna tutar.
    window.setTimeout(() => void ctx.close().catch(() => {}), 900);
  } catch {
    // Otomatik oynatma engellendi ya da ses aygıtı yok.
  }
}
