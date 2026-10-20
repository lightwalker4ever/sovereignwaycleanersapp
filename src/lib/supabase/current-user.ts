import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

export interface CurrentUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: Role | null;
  phone: string | null;
}

/**
 * The authenticated user + their profile row, fetched at most once per
 * request no matter how many nested layouts/pages ask for it.
 *
 * Before this, every dashboard layout and page independently called
 * `supabase.auth.getUser()` (a real network round-trip to Supabase
 * Auth to revalidate the JWT -- not a local decode) plus its own
 * `profiles` select, 2-3x over for a single page load (root dashboard
 * layout -> role layout -> page), on top of the one middleware already
 * does to refresh the session cookie. React's `cache()` memoizes this
 * by call within one request's render pass -- the officially
 * recommended pattern for this exact Supabase+Next.js footgun -- so
 * repeated calls across the layout/page tree reuse the same result
 * instead of re-hitting the network each time.
 *
 * Returns null if there's no authenticated session; callers still own
 * their own redirect() decisions (and role checks), this just removes
 * the duplicate fetching.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? null,
    phone: profile?.phone ?? null,
  };
});
