import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { StaffRole } from "@/lib/roles";

export type CreateStaffAccountResult = { success: true; userId: string } | { success: false; error: string };

/**
 * Shared by inviteUser() (admin manually adding staff, src/app/
 * (dashboard)/dashboard/admin/actions.ts) and approveContractorApplication()
 * (recruitment admin actions) -- same two-step mechanic either way:
 * create the auth user (email_confirm: true activates it immediately,
 * there's no confirmation-email step), then set the role the
 * handle_new_user trigger's default 'client' profile doesn't have yet.
 */
export async function createStaffAccount(input: {
  email: string;
  password: string;
  fullName: string;
  role: StaffRole;
}): Promise<CreateStaffAccountResult> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });
  if (error) return { success: false, error: error.message };
  if (!data.user) return { success: false, error: "Account created, but no user record was returned." };

  const { error: roleError } = await admin.from("profiles").update({ role: input.role }).eq("id", data.user.id);
  if (roleError) {
    return { success: false, error: `Account created, but couldn't set their role: ${roleError.message}` };
  }

  return { success: true, userId: data.user.id };
}
