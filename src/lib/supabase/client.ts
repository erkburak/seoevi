"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı tarafı Supabase istemcisi.
 * Yalnızca herkese açık (publishable) anahtar kullanır.
 */
export function tarayiciIstemcisi() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
