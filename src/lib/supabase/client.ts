import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

/**
 * Supabase client for use in "use client" components (e.g. the
 * Google sign-in button). Reads the public URL/anon key, which are
 * safe to expose to the browser by design.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
