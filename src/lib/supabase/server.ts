import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu tarafı Supabase istemcisi (RLS geçerli).
 * Server Component, Server Action ve Route Handler içinde kullanılır.
 */
export async function sunucuIstemcisi() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component içinden çağrıldığında çerez yazılamaz.
            // Oturum yenileme middleware tarafında yapılır.
          }
        },
      },
    },
  );
}
