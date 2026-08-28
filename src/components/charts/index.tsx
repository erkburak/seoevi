import { cn, sayi, kisaSayi } from "@/lib/utils";

export type Nokta = { etiket: string; deger: number };

/* ------------------------------------------------------------------ */
/* Sparkline — tablo içi mikro grafik                                  */
/* ------------------------------------------------------------------ */

export function Sparkline({
  degerler,
  genislik = 72,
  yukseklik = 24,
  className,
}: {
  degerler: number[];
  genislik?: number;
  yukseklik?: number;
  className?: string;
}) {
  if (!degerler.length) return <span className="text-ink-300">—</span>;

  const enAz = Math.min(...degerler);
  const enCok = Math.max(...degerler);
  const aralik = enCok - enAz || 1;
  const adim = degerler.length > 1 ? genislik / (degerler.length - 1) : genislik;

  const noktalar = degerler.map((d, i) => {
    const x = i * adim;
    const y = yukseklik - ((d - enAz) / aralik) * (yukseklik - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const artiyor = degerler[degerler.length - 1] >= degerler[0];

  return (
    <svg
      width={genislik}
      height={yukseklik}
      viewBox={`0 0 ${genislik} ${yukseklik}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={noktalar.join(" ")}
        fill="none"
        stroke={artiyor ? "var(--color-positive)" : "var(--color-critical)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Çizgi grafik                                                        */
/* ------------------------------------------------------------------ */

export function CizgiGrafik({
  veri,
  yukseklik = 220,
  birim,
  className,
}: {
  veri: Nokta[];
  yukseklik?: number;
  birim?: string;
  className?: string;
}) {
  if (veri.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[12px] border border-dashed border-line text-[13px] text-ink-400",
          className,
        )}
        style={{ height: yukseklik }}
      >
        Grafik için yeterli veri yok.
      </div>
    );
  }

  const W = 640;
  const H = yukseklik;
  const solBosluk = 44;
  const altBosluk = 26;
  const ustBosluk = 12;

  const degerler = veri.map((v) => v.deger);
  const enCok = Math.max(...degerler);
  const enAz = Math.min(...degerler, 0);
  const aralik = enCok - enAz || 1;

  const cizimG = W - solBosluk - 12;
  const cizimY = H - altBosluk - ustBosluk;
  const adim = cizimG / (veri.length - 1);

  const x = (i: number) => solBosluk + i * adim;
  const y = (d: number) => ustBosluk + cizimY - ((d - enAz) / aralik) * cizimY;

  const cizgi = veri.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v.deger).toFixed(1)}`).join(" ");
  const alan = `${cizgi} L ${x(veri.length - 1).toFixed(1)} ${(ustBosluk + cizimY).toFixed(1)} L ${solBosluk} ${(ustBosluk + cizimY).toFixed(1)} Z`;

  const izgaraSayisi = 4;
  const etiketAdim = Math.max(1, Math.ceil(veri.length / 7));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("w-full", className)}
      style={{ height: yukseklik }}
      role="img"
      aria-label={`Zaman içindeki değişim grafiği${birim ? ` (${birim})` : ""}`}
    >
      <defs>
        <linearGradient id="cizgi-alan" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-ink-700)" stopOpacity="0.10" />
          <stop offset="100%" stopColor="var(--color-ink-700)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {Array.from({ length: izgaraSayisi + 1 }).map((_, i) => {
        const oran = i / izgaraSayisi;
        const yy = ustBosluk + cizimY * oran;
        const deger = enCok - aralik * oran;
        return (
          <g key={i}>
            <line x1={solBosluk} x2={W - 12} y1={yy} y2={yy} stroke="var(--color-line)" strokeWidth={1} />
            <text x={solBosluk - 8} y={yy + 4} textAnchor="end" className="fill-ink-300" style={{ fontSize: 10.5 }}>
              {kisaSayi(Math.round(deger))}
            </text>
          </g>
        );
      })}

      <path d={alan} fill="url(#cizgi-alan)" />
      <path d={cizgi} fill="none" stroke="var(--color-ink-800)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />

      {veri.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v.deger)} r={7} fill="transparent">
            <title>{`${v.etiket}: ${sayi(v.deger)}${birim ? ` ${birim}` : ""}`}</title>
          </circle>
          {i === veri.length - 1 ? (
            <circle cx={x(i)} cy={y(v.deger)} r={3} fill="var(--color-ink-900)" stroke="#fff" strokeWidth={2} />
          ) : null}
        </g>
      ))}

      {veri.map((v, i) =>
        i % etiketAdim === 0 || i === veri.length - 1 ? (
          <text
            key={`e-${i}`}
            x={x(i)}
            y={H - 6}
            textAnchor={i === 0 ? "start" : i === veri.length - 1 ? "end" : "middle"}
            className="fill-ink-300"
            style={{ fontSize: 10.5 }}
          >
            {v.etiket}
          </text>
        ) : null,
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Çubuk grafik                                                        */
/* ------------------------------------------------------------------ */

export function CubukGrafik({
  veri,
  yukseklik = 200,
  vurgulanan,
  className,
}: {
  veri: Nokta[];
  yukseklik?: number;
  vurgulanan?: string;
  className?: string;
}) {
  if (!veri.length) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-[12px] border border-dashed border-line text-[13px] text-ink-400", className)}
        style={{ height: yukseklik }}
      >
        Gösterilecek veri yok.
      </div>
    );
  }

  const enCok = Math.max(...veri.map((v) => v.deger), 1);

  return (
    <div className={cn("space-y-2.5", className)}>
      {veri.map((v) => {
        const oran = (v.deger / enCok) * 100;
        const vurgu = vurgulanan === v.etiket;
        return (
          <div key={v.etiket} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className={cn("truncate text-[13px]", vurgu ? "font-semibold text-ink-900" : "text-ink-600")}>
                  {v.etiket}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-50">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${oran}%`,
                    background: vurgu ? "var(--color-ink-900)" : "var(--color-ink-300)",
                    transition: "width 500ms var(--ease-out-soft)",
                  }}
                />
              </div>
            </div>
            <span className="tabular w-16 text-right text-[13px] font-medium text-ink-700">{kisaSayi(v.deger)}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dağılım şeridi — sıralama dağılımı gibi kırılımlar                  */
/* ------------------------------------------------------------------ */

export function DagilimSeridi({
  dilimler,
  className,
}: {
  dilimler: { etiket: string; deger: number; renk: string }[];
  className?: string;
}) {
  const toplam = dilimler.reduce((t, d) => t + d.deger, 0) || 1;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-ink-50">
        {dilimler.map((d) => (
          <div
            key={d.etiket}
            style={{ width: `${(d.deger / toplam) * 100}%`, background: d.renk }}
            title={`${d.etiket}: ${sayi(d.deger)}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {dilimler.map((d) => (
          <span key={d.etiket} className="inline-flex items-center gap-2 text-[12.5px] text-ink-500">
            <span className="size-2 rounded-full" style={{ background: d.renk }} />
            {d.etiket}
            <span className="tabular font-medium text-ink-800">{sayi(d.deger)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
