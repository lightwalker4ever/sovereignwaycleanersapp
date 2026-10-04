"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Roles an admin can hand out via invite. "client" is excluded here --
// clients self-register via Google, there's no reason to invite one.
//
// No email-invite flow yet (that's a planned follow-up): this creates
// the account with a password the admin sets directly, so they can
// hand the credentials to the new staff member themselves. Swapping
// this for a real "click a link to set your password" email invite
// later only touches this one function.
const inviteSchema = z.object({
  email: z.string().email("Invalid email provided"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["cleaner", "supervisor", "manager", "admin"]),
});

// Full role set, used when changing an existing user's role -- unlike
// invites, demoting someone back to "client" is a legitimate action
// (e.g. an ex-contractor).
const roleSchema = z.enum(["client", "cleaner", "supervisor", "manager", "admin"]);

async function assertIsAdmin() {
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

  if (profile?.role !== "admin") throw new Error("Admins only");
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
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }
  const { email, password, role } = parsed.data;

  const admin = createAdminClient();

  // email_confirm: true activates the account immediately -- there's
  // no confirmation email step yet, so this is what makes the account
  // usable right away with the password the admin just set.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) {
    return { success: false, error: error.message };
  }
  if (!data.user) {
    return { success: false, error: "Account created, but no user record was returned." };
  }

  // The new auth user already got a 'client' profile via the
  // handle_new_user trigger -- now set the role the admin actually
  // chose. This update runs through the service-role client, which
  // bypasses RLS and the profiles_guard_role_change trigger allows it
  // since auth.uid() is null in this context (see the migration).
  const { error: roleError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", data.user.id);
  if (roleError) {
    return {
      success: false,
      error: `Account created, but couldn't set their role: ${roleError.message}`,
    };
  }

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateUserRole(userId: string, role: string) {
  await assertIsAdmin();

  const parsedRole = roleSchema.safeParse(role);
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

export interface AdminUserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  await assertIsAdmin();

  const admin = createAdminClient();

  // auth.admin.listUsers() has email/created_at; profiles has role --
  // merge the two by id. Paginated at 50/page by default, which is
  // plenty at this business's scale for now.
  const [{ data: authData, error: authError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      admin.auth.admin.listUsers(),
      admin.from("profiles").select("id, role, full_name"),
    ]);

  if (authError) throw new Error(authError.message);
  if (profilesError) throw new Error(profilesError.message);

  const profileById = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  return authData.users
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "(no email)",
        fullName: profile?.full_name ?? null,
        role: profile?.role ?? "client",
        createdAt: u.created_at,
      };
    })
    .sort((a, b) => a.email.localeCompare(b.email));
}
