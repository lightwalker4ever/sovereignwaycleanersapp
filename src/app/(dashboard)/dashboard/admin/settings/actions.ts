"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * No assertIsRole here on purpose -- RLS already allows public select
 * on app_settings, and this exact function gets reused unauthenticated
 * from the homepage once the contact form checks it (Phase 2). The
 * *admin page* that calls this is still gated by its own layout, same
 * double-gating every other admin page already relies on.
 */
export async function getContactFormEnabled(): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "contact_form_enabled")
    .single();
  return data?.value === true;
}

export async function setContactFormEnabled(enabled: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ value: enabled })
    .eq("key", "contact_form_enabled");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/");
}
