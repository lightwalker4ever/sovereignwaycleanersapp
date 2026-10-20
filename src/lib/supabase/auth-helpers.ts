import "server-only";

import { getCurrentUser } from "@/lib/supabase/current-user";
import type { Role } from "@/lib/roles";

/**
 * Confirms the signed-in caller's *real* role is one of `allowed`,
 * throwing otherwise. Returns the user and profile so callers that
 * already need them don't have to re-query. Every privileged Server
 * Action should call this first, then use createAdminClient() to
 * perform the actual write -- the same two-step pattern
 * dashboard/admin/actions.ts established with assertIsAdmin().
 *
 * Delegates to getCurrentUser(), which memoizes the underlying
 * auth.getUser() + profiles lookup per request -- most of this app's
 * data-fetching functions (not just click-triggered Server Actions)
 * are awaited directly from a page's own Server Component render, so
 * this reuses whatever the page/layout already fetched instead of
 * re-hitting Supabase Auth again. Only `user.id` is ever read from the
 * returned `user` by any call site (confirmed before this change), so
 * the slimmer {id, email} shape here is a safe, non-breaking swap for
 * the previous full Supabase User object.
 */
export async function assertIsRole(allowed: Role[]) {
  const current = await getCurrentUser();
  if (!current) throw new Error("Not signed in");
  if (!current.role || !allowed.includes(current.role)) {
    throw new Error("You don't have access to do that");
  }

  return {
    user: { id: current.id, email: current.email },
    profile: { role: current.role },
  };
}

/** Any non-client (staff) role -- cleaner, supervisor, manager, admin, sales. */
export const STAFF_ROLES_FOR_ASSERT: Role[] = ["cleaner", "supervisor", "manager", "admin", "sales"];
