"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Marka bağlamı.
 *
 * Logo hem sunucu hem istemci bileşenlerinde kullanılıyor. Ayar
 * veritabanından geldiği için kök yerleşimde bir kez okunur ve buradan
 * dağıtılır; her bileşenin ayrı sorgu yapması gerekmez.
 */
export type Marka = {
  logoUrl: string | null;
  logoYukseklik: number;
};

const MarkaBaglami = createContext<Marka>({ logoUrl: null, logoYukseklik: 28 });

export function MarkaSaglayici({ deger, children }: { deger: Marka; children: ReactNode }) {
  return <MarkaBaglami.Provider value={deger}>{children}</MarkaBaglami.Provider>;
}

export function useMarka(): Marka {
  return useContext(MarkaBaglami);
}
