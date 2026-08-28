import type { IsAdimi } from "@/types/database";

export const IS_TURLERI = [
  "tam_analiz",
  "onpage",
  "keyword",
  "serp",
  "rakip",
  "backlink",
  "merchant",
  "icerik",
  "ai",
] as const;

export type IsTuru = (typeof IS_TURLERI)[number];

export const IS_TURU_ADI: Record<IsTuru, string> = {
  tam_analiz: "Tam site analizi",
  onpage: "Teknik SEO taraması",
  keyword: "Anahtar kelime analizi",
  serp: "SERP analizi",
  rakip: "Rakip analizi",
  backlink: "Geri bağlantı analizi",
  merchant: "Merchant analizi",
  icerik: "İçerik analizi",
  ai: "AI görünürlüğü analizi",
};

/** Tam analiz akışının adımları — kullanıcıya bu adlarla gösterilir. */
export const TAM_ANALIZ_ADIMLARI: IsAdimi[] = [
  { ad: "Site taranıyor", durum: "bekliyor" },
  { ad: "Teknik SEO inceleniyor", durum: "bekliyor" },
  { ad: "Anahtar kelimeler analiz ediliyor", durum: "bekliyor" },
  { ad: "Rakipler inceleniyor", durum: "bekliyor" },
  { ad: "Fırsatlar hesaplanıyor", durum: "bekliyor" },
];

export const IS_ADIMLARI: Record<IsTuru, IsAdimi[]> = {
  tam_analiz: TAM_ANALIZ_ADIMLARI,
  onpage: [
    { ad: "Site taranıyor", durum: "bekliyor" },
    { ad: "Teknik SEO inceleniyor", durum: "bekliyor" },
  ],
  keyword: [{ ad: "Anahtar kelimeler analiz ediliyor", durum: "bekliyor" }],
  serp: [{ ad: "Arama sonuçları alınıyor", durum: "bekliyor" }],
  rakip: [{ ad: "Rakipler inceleniyor", durum: "bekliyor" }],
  backlink: [{ ad: "Geri bağlantılar toplanıyor", durum: "bekliyor" }],
  merchant: [{ ad: "Merchant verileri kontrol ediliyor", durum: "bekliyor" }],
  icerik: [{ ad: "İçerik analizi yapılıyor", durum: "bekliyor" }],
  ai: [{ ad: "AI görünürlüğü hesaplanıyor", durum: "bekliyor" }],
};
