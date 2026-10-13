import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Batches signed-URL generation for the cleaning-photos bucket (which
 * is private -- see the migration's rationale). Used by every page
 * that renders cleaning photos (cleaner's own page now, supervisor
 * and client-facing pages in later phases), so the signing call and
 * its error handling exist once. Returns a map from storage_path to
 * signed URL; paths that fail to sign are simply omitted rather than
 * failing the whole batch.
 */
export async function getSignedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("cleaning-photos")
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.signedUrl && !entry.error) {
      map.set(entry.path ?? "", entry.signedUrl);
    }
  }
  return map;
}
