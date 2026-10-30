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

const DEFAULT_CAREERS_PIPELINE_TEASER = "We're growing — join our approved contractor network.";

/**
 * Admin-set, not live-computed -- a precisely-computed pipeline count,
 * even rounded, could let a competitor infer growth trends by checking
 * the public Careers page repeatedly over time. Same fail-soft shape as
 * getSalesNotificationEmail() above.
 */
export async function getCareersPipelineTeaser(): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_settings")
    .select("value")
    .eq("key", "careers_pipeline_teaser")
    .single();
  return typeof data?.value === "string" ? data.value : DEFAULT_CAREERS_PIPELINE_TEASER;
}
