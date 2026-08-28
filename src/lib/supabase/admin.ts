import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Servis rolü istemcisi — RLS'i atlar.
 * Yalnızca arka plan işleri, önbellek ve sistem kayıtları için kullanılır.
 * Bu modül asla istemci bileşenlerinden içe aktarılmamalıdır.
 */
export function yoneticiIstemcisi() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase sunucu yapılandırması eksik.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
