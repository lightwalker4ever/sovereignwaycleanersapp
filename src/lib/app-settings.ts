import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_SALES_NOTIFICATION_EMAIL = "nuno.m.s.teixeira@gmail.com";

/**
 * No role check here on purpose -- RLS already allows public select
 * on app_settings, and this is read unauthenticated from the public
 * homepage (src/app/page.tsx) as well as from the admin settings page.
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

/**
 * Fails soft to the original hardcoded address if the setting row is
 * ever missing -- unlike src/lib/rate-card.ts's fail-loud getRateCard(),
 * a missing setting here shouldn't block lead capture in
 * src/actions/contact.ts.
 */
export async function getSalesNotificationEmail(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "sales_notification_email")
    .single();
  return typeof data?.value === "string" ? data.value : DEFAULT_SALES_NOTIFICATION_EMAIL;
}
