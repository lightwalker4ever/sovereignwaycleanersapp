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

/**
 * Same job as ensureClientRow(), but first tries to link this login to
 * an existing ghost clients row (profile_id null) matching the same
 * email -- e.g. one created by the /quote journey's "Track this clean
 * online" checkbox before the customer ever set a password, so their
 * booking history carries over onto their new account instead of
 * getting a second, disconnected clients row. Falls back to
 * ensureClientRow()'s own behaviour when no such ghost row exists.
 * Idempotent: once linked, the ghost row's profile_id is no longer
 * null, so a repeat call just falls through to ensureClientRow()'s own
 * no-op upsert.
 */
export async function linkGhostClientToProfile(
  profileId: string,
  fullName: string | null,
  email: string | null,
  phone: string | null
) {
  if (!email) return ensureClientRow(profileId, fullName, email, phone);

  const admin = createAdminClient();
  const { data: ghost } = await admin
    .from("clients")
    .select("id, full_name, phone")
    .is("profile_id", null)
    .eq("email", email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (ghost) {
    await admin
      .from("clients")
      .update({
        profile_id: profileId,
        full_name: ghost.full_name ?? fullName,
        phone: ghost.phone ?? phone,
      })
      .eq("id", ghost.id);
    return;
  }

  await ensureClientRow(profileId, fullName, email, phone);
}
