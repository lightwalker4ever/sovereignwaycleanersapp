import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

/**
 * Confirms the signed-in caller's *real* role (via their own session,
 * so RLS applies to the self-select) is one of `allowed`, throwing
 * otherwise. Returns the user and profile so callers that already
 * need them don't have to re-query. Every privileged Server Action
 * should call this first, then use createAdminClient() to perform the
 * actual write -- the same two-step pattern dashboard/admin/actions.ts
 * established with assertIsAdmin().
 */
export async function assertIsRole(allowed: Role[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !allowed.includes(profile.role)) {
    throw new Error("You don't have access to do that");
  }

  return { user, profile };
}

/** Any non-client (staff) role -- cleaner, supervisor, manager, admin. */
export const STAFF_ROLES_FOR_ASSERT: Role[] = ["cleaner", "supervisor", "manager", "admin"];
