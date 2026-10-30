"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { nameSchema, emailSchema, passwordSchema } from "@/lib/validation";
import { staffRoleSchema, type StaffRole } from "@/lib/roles";
import { createStaffAccount } from "@/lib/staff";

// No email-invite flow yet (that's a planned follow-up): account
// creation sets a password the admin chooses directly, so they can
// hand the credentials to the new staff member themselves. Swapping
// this for a real "click a link to set your password" email invite
// later only touches this one function.
const inviteSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, "Name is required"),
  role: staffRoleSchema,
});

async function assertIsAdmin() {
  await assertIsRole(["admin"]);
}

export type InviteState = { success: boolean; error?: string } | null;

export async function inviteUser(
  prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  await assertIsAdmin();

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { email, password, fullName, role } = parsed.data;

  const result = await createStaffAccount({ email, password, fullName, role });
  if (!result.success) return result;

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateUserRole(userId: string, role: StaffRole) {
  await assertIsAdmin();

  const parsedRole = staffRoleSchema.safeParse(role);
  if (!parsedRole.success) {
    throw new Error("Invalid role");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ role: parsedRole.data })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
}

export async function updateUserName(userId: string, fullName: string) {
  await assertIsAdmin();

  const parsed = nameSchema.safeParse(fullName);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ full_name: parsed.data })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
}

export async function updateUserEmail(userId: string, email: string) {
  await assertIsAdmin();

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const admin = createAdminClient();

  // Update the real login email first; only touch our denormalized
  // profiles.email copy once that succeeds, so the two never disagree.
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    email: parsed.data,
    email_confirm: true,
  });
  if (authError) throw new Error(authError.message);

  const { error: profileError } = await admin
    .from("profiles")
    .update({ email: parsed.data })
    .eq("id", userId);
  if (profileError) throw new Error(profileError.message);

  revalidatePath("/dashboard/admin");
}

export async function setUserActive(userId: string, active: boolean) {
  await assertIsAdmin();

  const admin = createAdminClient();
  // Supabase's built-in ban mechanism: enforced at the auth level, so
  // a deactivated user can't sign in or refresh a session at all --
  // no need for our own "is_active" checks scattered through the app.
  // "none" un-bans; a very long duration stands in for "indefinitely"
  // (there's no literal permanent-ban value).
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: active ? "none" : "876000h",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin");
}

export async function regeneratePassword(userId: string): Promise<string> {
  await assertIsAdmin();

  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(error.message);

  return password;
}

export async function sendPasswordResetEmail(email: string) {
  await assertIsAdmin();

  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  // This only needs the anon-level capability (resetPasswordForEmail
  // is a public GoTrue endpoint), but reusing the admin client here is
  // harmless since it can do everything the anon client can, and it
  // keeps this file's Supabase usage in one place. Routes through the
  // existing /auth/callback code-exchange handler, same as every
  // other sign-in link, landing on /update-password once a session is
  // established from the recovery code.
  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/update-password`,
  });
  if (error) throw new Error(error.message);
}

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: StaffRole;
  createdAt: string;
  active: boolean;
  /** No account has ever signed in (no confirmation-email step exists yet,
   *  so this is the closest real signal to "invited, not yet started"). */
  invited: boolean;
  lastSignInAt: string | null;
  /** Cleaner: jobs assigned this calendar month. Supervisor: cleanings
   *  finalized (completed) this month. Other roles: null -- not applicable. */
  jobsThisMonth: number | null;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  await assertIsAdmin();

  const admin = createAdminClient();

  // auth.admin.listUsers() has email/created_at/banned_until/
  // last_sign_in_at; profiles has role/full_name -- merge the two by
  // id. Paginated at 50/page by default, which is plenty at this
  // business's scale for now.
  const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      admin.auth.admin.listUsers(),
      admin.from("profiles").select("id, role, full_name"),
    ]);

  if (authError) throw new Error(authError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileById = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const { data: cleaningsThisMonth, error: cleaningsError } = await admin
    .from("cleanings")
    .select("cleaner_id, supervisor_id, status, scheduled_at, completed_at")
    .gte("scheduled_at", monthStart.toISOString());
  if (cleaningsError) throw new Error(cleaningsError.message);

  const cleanerJobCount = new Map<string, number>();
  const supervisorReviewedCount = new Map<string, number>();
  for (const c of cleaningsThisMonth ?? []) {
    if (c.cleaner_id) {
      cleanerJobCount.set(c.cleaner_id, (cleanerJobCount.get(c.cleaner_id) ?? 0) + 1);
    }
    if (c.supervisor_id && c.status === "completed" && c.completed_at && new Date(c.completed_at) >= monthStart) {
      supervisorReviewedCount.set(c.supervisor_id, (supervisorReviewedCount.get(c.supervisor_id) ?? 0) + 1);
    }
  }

  return authData.users
    .map((u) => {
      const profile = profileById.get(u.id);
      const role = profile?.role ?? "client";
      const bannedUntil = (u as { banned_until?: string | null }).banned_until;
      const jobsThisMonth =
        role === "cleaner"
          ? (cleanerJobCount.get(u.id) ?? 0)
          : role === "supervisor"
            ? (supervisorReviewedCount.get(u.id) ?? 0)
            : null;
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        fullName: profile?.full_name ?? null,
        role,
        createdAt: u.created_at,
        active: !bannedUntil || new Date(bannedUntil) <= new Date(),
        invited: !u.last_sign_in_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        jobsThisMonth,
      };
    })
    // Clients always self-register and always start as 'client' --
    // this page is for managing staff, so they're excluded entirely
    // rather than shown with a role that can't be reassigned here.
    .filter((u): u is AdminUserRow => u.role !== "client")
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function countCleanersOnJobNow(): Promise<number> {
  await assertIsAdmin();

  const admin = createAdminClient();
  const { data, error } = await admin.from("cleanings").select("cleaner_id").eq("status", "in_progress");
  if (error) throw new Error(error.message);

  return new Set((data ?? []).map((c) => c.cleaner_id)).size;
}
