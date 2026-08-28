import { NextResponse, type NextRequest } from "next/server";

import { oturumuTazele } from "@/lib/supabase/middleware";

/** Giriş gerektiren alanlar. */
const KORUMALI_ONEKLER = [
  "/genel-bakis",
  "/aksiyon-merkezi",
  "/anahtar-kelimeler",
  "/anahtar-kelime-arastirmasi",
  "/kelime-firsatlari",
  "/serp-analizi",
  "/rakipler",
  "/rakip-analizi",
  "/teknik-seo",
  "/sayfa-analizi",
  "/icerik-analizi",
  "/ic-baglanti",
  "/geri-baglantilar",
  "/e-ticaret",
  "/urun-seo",
  "/kategori-seo",
  "/merchant-analizi",
  "/pazaryeri-radari",
  "/fiyat-konumu",
  "/mevsimsellik",
  "/yamyamlik",
  "/ai-gorunurlugu",
  "/projeler",
  "/raporlar",
  "/beraber-inceleyelim",
  "/hesabim",
  "/ayarlar",
  "/baslangic",
  "/yetkili",
];

/** Giriş yapmış kullanıcının görmemesi gereken sayfalar. */
const MISAFIR_SAYFALARI = ["/giris", "/kayit", "/sifremi-unuttum"];

export async function middleware(request: NextRequest) {
  const { response, user } = await oturumuTazele(request);
  const { pathname, search } = request.nextUrl;

  const korumali = KORUMALI_ONEKLER.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (korumali && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.search = `?devam=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  if (user && MISAFIR_SAYFALARI.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/genel-bakis";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Statik dosyalar ve görseller dışındaki tüm istekler.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
