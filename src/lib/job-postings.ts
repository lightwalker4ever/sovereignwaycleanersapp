import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface PublicJobPosting {
  id: string;
  title: string;
  summary: string;
  description: string;
  location: string;
}

/** Public reads -- no role check, same as rate-card.ts/app-settings.ts's
 *  own getters -- the Careers page is anonymous. */
export async function getOpenJobPostings(): Promise<PublicJobPosting[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_postings")
    .select("id, title, summary, description, location")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getOpenJobPosting(id: string): Promise<PublicJobPosting | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("job_postings")
    .select("id, title, summary, description, location")
    .eq("id", id)
    .eq("status", "open")
    .maybeSingle();
  return data ?? null;
}
