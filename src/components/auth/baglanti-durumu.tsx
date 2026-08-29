"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Buton } from "@/components/ui/button";
import { Uyari } from "@/components/ui/feedback";
import { tarayiciIstemcisi } from "@/lib/supabase/client";

/**
 * Sağlayıcı dönüşündeki adres parçasını çözümler.
 *
 * İki durum ele alınır:
 *   - Hata: bağlantı geçersiz ya da süresi dolmuş. Sunucu bunu göremez
 *     çünkü adres parçası isteğe eklenmez.
 *   - Erişim anahtarı: bazı akışlarda oturum bilgisi doğrudan parçada
 *     gelir; oturum kurulup kullanıcı hedefine gönderilir.
 */

const HATA_METINLERI: Record<string, string> = {
  otp_expired:
    "Bağlantının süresi dolmuş. Güvenlik için bu bağlantılar kısa süre geçerlidir; yeni bir tane isteyebilirsiniz.",
  access_denied:
    "Bağlantı doğrulanamadı. Daha önce kullanılmış ya da süresi dolmuş olabilir.",
  invalid_request: "Bağlantı eksik veya bozuk görünüyor. Yeni bir bağlantı isteyin.",
};

export function BaglantiDurumu() {
  const [hata, setHata] = useState<string | null>(null);
  const [calisiyor, setCalisiyor] = useState(true);

  useEffect(() => {
    const parca = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const arama = new URLSearchParams(window.location.search);

    const hedefParam = arama.get("devam");
    const hedef = hedefParam && hedefParam.startsWith("/") ? hedefParam : "/genel-bakis";

    const hataKodu = parca.get("error_code") ?? parca.get("error") ?? arama.get("error_code");

    if (hataKodu) {
      setHata(
        HATA_METINLERI[hataKodu] ??
          "Bağlantı doğrulanamadı. Yeni bir bağlantı isteyip tekrar deneyin.",
      );
      setCalisiyor(false);
      return;
    }

    const erisim = parca.get("access_token");
    const yenileme = parca.get("refresh_token");

    if (!erisim || !yenileme) {
      setHata("Bağlantı doğrulanamadı. Yeni bir bağlantı isteyip tekrar deneyin.");
      setCalisiyor(false);
      return;
    }

    void (async () => {
      const supabase = tarayiciIstemcisi();
      const { error } = await supabase.auth.setSession({
        access_token: erisim,
        refresh_token: yenileme,
      });

      if (error) {
        setHata("Oturum kurulamadı. Yeni bir bağlantı isteyip tekrar deneyin.");
        setCalisiyor(false);
        return;
      }

      /*
       * Sert yönlendirme kullanılır.
       *
       * İstemci tarafı geçişte sunucu bileşenleri yeni oturum çerezini
       * henüz görmeyebilir ve şifre ekranı "oturum yok" sanıp kullanıcıyı
       * geri çevirir. Tam sayfa yüklemesi çerezin sunucuya ulaşmasını
       * garantiler; anahtarlar da adres çubuğunda kalmaz.
       */
      window.location.replace(hedef);
    })();
  }, []);

  if (calisiyor) {
    return (
      <p className="flex items-center justify-center gap-2 py-6 text-[13.5px] text-ink-500">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Bağlantı doğrulanıyor…
      </p>
    );
  }

  return (
    <div>
      <Uyari ton="uyari">{hata}</Uyari>

      <div className="mt-5 space-y-2">
        <Buton asChild tamGenislik>
          <Link href="/sifremi-unuttum">Yeni bağlantı iste</Link>
        </Buton>
        <Buton asChild gorunum="ikincil" tamGenislik>
          <Link href="/giris">Giriş sayfasına dön</Link>
        </Buton>
      </div>
    </div>
  );
}
