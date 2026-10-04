import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * Supabase client for Server Components, Server Actions, and Route
 * Handlers. Reads/writes auth cookies via next/headers.
 *
 * Note: in a Server Component, cookies() can't be written to (Next.js
 * only allows cookie writes from Server Actions/Route Handlers), so
 * the setAll() call below is wrapped in a try/catch — Supabase's
 * middleware (src/lib/supabase/middleware.ts) is what actually keeps
 * the session cookie refreshed when this client is used read-only
 * from a Server Component.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
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
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore, the
            // middleware handles session refresh in that case.
          }
        },
      },
    }
  );
}
