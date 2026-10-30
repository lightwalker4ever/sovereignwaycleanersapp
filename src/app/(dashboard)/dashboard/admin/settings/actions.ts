"use server";

import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailSchema } from "@/lib/validation";

export async function setContactFormEnabled(enabled: boolean) {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ value: enabled })
    .eq("key", "contact_form_enabled");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/contact");
}

export async function setSalesNotificationEmail(email: string) {
  await assertIsRole(["admin"]);

  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ value: parsed.data })
    .eq("key", "sales_notification_email");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/settings");
}

export async function setCareersPipelineTeaser(text: string) {
  await assertIsRole(["admin"]);

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Teaser text is required");

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({ value: trimmed })
    .eq("key", "careers_pipeline_teaser");
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/settings");
  revalidatePath("/careers");
}
