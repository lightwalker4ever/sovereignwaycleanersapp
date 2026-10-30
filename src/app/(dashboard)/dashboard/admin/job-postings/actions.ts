"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";

export interface JobPostingRow {
  id: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  status: "open" | "closed";
  createdAt: string;
}

export async function listJobPostings(): Promise<JobPostingRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_postings")
    .select("id, title, summary, description, location, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    summary: p.summary,
    description: p.description,
    location: p.location,
    status: p.status,
    createdAt: p.created_at,
  }));
}

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  summary: z.string().trim().min(1, "Summary is required"),
  description: z.string().trim().min(1, "Description is required"),
  location: z.string().trim().min(1, "Location is required"),
});

export type CreateJobPostingState = { success: boolean; error?: string } | null;

export async function createJobPosting(
  prevState: CreateJobPostingState,
  formData: FormData
): Promise<CreateJobPostingState> {
  await assertIsRole(["admin"]);

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    location: formData.get("location"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("job_postings").insert({
    title: parsed.data.title,
    summary: parsed.data.summary,
    description: parsed.data.description,
    location: parsed.data.location,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard/admin/job-postings");
  revalidatePath("/careers");
  return { success: true };
}

export async function updateJobPostingField(
  id: string,
  field: "title" | "summary" | "description" | "location",
  value: string
) {
  await assertIsRole(["admin"]);

  const trimmed = value.trim();
  if (!trimmed) throw new Error("This field is required");

  const admin = createAdminClient();
  const update: Partial<Record<typeof field, string>> = { [field]: trimmed };
  const { error } = await admin.from("job_postings").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/job-postings");
  revalidatePath("/careers");
}

export async function setJobPostingStatus(id: string, status: "open" | "closed") {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { error } = await admin.from("job_postings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/job-postings");
  revalidatePath("/careers");
}
