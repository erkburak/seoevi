import { ImageResponse } from "next/og";

import { SITE } from "@/config/site";

/**
 * Sosyal medya paylaşım görseli.
 * Statik bir dosya yerine derleme sırasında üretilir; marka bilgisi
 * tek kaynaktan (config/site) gelir.
 */
export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0C111D",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Marka */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="56" height="56" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7.5" fill="#FFFFFF" />
            <rect x="7" y="15" width="3" height="6" rx="1.5" fill="#0C111D" fillOpacity="0.45" />
            <rect x="12.5" y="11" width="3" height="10" rx="1.5" fill="#0C111D" fillOpacity="0.7" />
            <rect x="18" y="7" width="3" height="14" rx="1.5" fill="#0C111D" />
            <circle cx="19.5" cy="7.5" r="3.25" fill="#FFFFFF" />
            <circle cx="19.5" cy="7.5" r="1.9" fill="#0C111D" />
          </svg>
          <span
            style={{
              fontSize: 38,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.02em",
            }}
          >
            SEO Evi
          </span>
        </div>

        {/* Başlık */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: "-0.035em",
              lineHeight: 1.1,
              maxWidth: "900px",
            }}
          >
            E-ticaret sitenizin Google&apos;daki büyüme merkezi
          </span>
          <span
            style={{
              marginTop: "28px",
              fontSize: 27,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.45,
              maxWidth: "860px",
            }}
          >
            Teknik SEO, anahtar kelimeler, rakipler, içerik, Merchant ve AI görünürlüğü tek
            platformda.
          </span>
        </div>

        {/* Alt şerit */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.12)",
            paddingTop: "28px",
          }}
        >
          <span style={{ fontSize: 23, color: "rgba(255,255,255,0.45)" }}>seoevi.com.tr</span>
          <span style={{ fontSize: 23, color: "rgba(255,255,255,0.45)" }}>
            {SITE.tagline}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
