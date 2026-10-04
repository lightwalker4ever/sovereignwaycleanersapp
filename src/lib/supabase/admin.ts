import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * The `import "server-only"` above makes any accidental import of this
 * file from a "use client" component fail the build, so the
 * service-role key can never end up in the browser bundle.
 *
 * Only import this from Server Actions under
 * src/app/(dashboard)/dashboard/admin/, for operations that must act
 * across all users regardless of RLS (inviting users, changing roles).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
