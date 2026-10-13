import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Every role='client' profile needs a matching clients row (the
 * cleaning-job system's canonical client entity, decoupled from
 * auth.users so admin-created "ghost" clients can exist without a
 * login). Called right after a client account is created, from both
 * signup paths (password in login/actions.ts, Google in
 * auth/callback/route.ts) -- admin-created ghost clients insert
 * directly instead. Uses the service-role client since there's no
 * public insert policy on clients (by design, same as profiles), and
 * ignores a conflict on profile_id so calling this more than once is
 * harmless.
 */
export async function ensureClientRow(
  profileId: string,
  fullName: string | null,
  email: string | null,
  phone: string | null
) {
  const admin = createAdminClient();
  await admin
    .from("clients")
    .upsert(
      { profile_id: profileId, full_name: fullName, email, phone },
      { onConflict: "profile_id", ignoreDuplicates: true }
    );
}
