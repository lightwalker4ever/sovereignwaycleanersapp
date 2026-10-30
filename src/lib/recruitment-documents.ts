import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const SIGNED_URL_TTL_SECONDS = 60 * 10;

/**
 * Same batched-signed-URL mechanic as getSignedPhotoUrls()
 * (src/lib/photos.ts), targeting the recruitment-documents bucket
 * instead -- used for both contractor evidence documents and job
 * application CVs, which share that one private bucket under
 * different path prefixes.
 */
export async function getRecruitmentDocumentUrls(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("recruitment-documents")
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
