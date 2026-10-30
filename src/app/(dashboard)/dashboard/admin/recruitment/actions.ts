"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRecruitmentDocumentUrls } from "@/lib/recruitment-documents";
import { createStaffAccount } from "@/lib/staff";
import type { RecruitmentPeriodKey } from "@/lib/recruitment-config";

const resend = new Resend(process.env.RESEND_API_KEY);
const SITE_URL = "https://sovereignwaycleaners.co.uk";

export interface ContractorApplicationRow {
  id: string;
  reference: string;
  fullName: string;
  status: string;
  createdAt: string;
}

export async function listContractorApplications(): Promise<ContractorApplicationRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("contractor_applications")
    .select("id, reference, full_name, status, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((a) => ({
    id: a.id,
    reference: a.reference,
    fullName: a.full_name,
    status: a.status,
    createdAt: a.created_at,
  }));
}

export interface ContractorApplicationDetail {
  id: string;
  reference: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  hasDbs: boolean;
  hasLiabilityInsurance: boolean;
  hasIso: boolean;
  otherEvidenceNotes: string | null;
  yearsExperience: number;
  areasOfExperience: string[];
  otherAreaOfExperience: string | null;
  businessStructure: "sole_trader" | "company";
  companyEmployeeCount: number | null;
  notes: string | null;
  status: string;
  evidenceRequestedAt: string | null;
  evidenceNotes: string | null;
  evidenceSubmittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  availability: { dayOfWeek: number; periodKey: RecruitmentPeriodKey }[];
  documents: { id: string; originalFilename: string; signedUrl: string | null }[];
}

export async function getContractorApplicationDetail(id: string): Promise<ContractorApplicationDetail | null> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: app }, { data: availability }, { data: documents }] = await Promise.all([
    admin.from("contractor_applications").select("*").eq("id", id).maybeSingle(),
    admin.from("contractor_availability").select("day_of_week, period_key").eq("application_id", id),
    admin
      .from("contractor_evidence_documents")
      .select("id, storage_path, original_filename")
      .eq("application_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!app) return null;

  const signedUrls = await getRecruitmentDocumentUrls((documents ?? []).map((d) => d.storage_path));

  return {
    id: app.id,
    reference: app.reference,
    fullName: app.full_name,
    email: app.email,
    phone: app.phone,
    address: app.address,
    hasDbs: app.has_dbs,
    hasLiabilityInsurance: app.has_liability_insurance,
    hasIso: app.has_iso,
    otherEvidenceNotes: app.other_evidence_notes,
    yearsExperience: app.years_experience,
    areasOfExperience: Array.isArray(app.areas_of_experience) ? (app.areas_of_experience as string[]) : [],
    otherAreaOfExperience: app.other_area_of_experience,
    businessStructure: app.business_structure,
    companyEmployeeCount: app.company_employee_count,
    notes: app.notes,
    status: app.status,
    evidenceRequestedAt: app.evidence_requested_at,
    evidenceNotes: app.evidence_notes,
    evidenceSubmittedAt: app.evidence_submitted_at,
    decidedAt: app.decided_at,
    createdAt: app.created_at,
    availability: (availability ?? []).map((a) => ({ dayOfWeek: a.day_of_week, periodKey: a.period_key as RecruitmentPeriodKey })),
    documents: (documents ?? []).map((d) => ({
      id: d.id,
      originalFilename: d.original_filename,
      signedUrl: signedUrls.get(d.storage_path) ?? null,
    })),
  };
}

export type RecruitmentActionResult = { success: true } | { success: false; error: string };

const noteSchema = z.string().trim().min(1, "Describe what you need from the applicant");

/**
 * Admin asks for evidence -- emails the applicant a secure, token-gated
 * upload link (same resume_token + second-fact pattern as the quote
 * flow's own /quote/response, see /careers/evidence) rather than
 * expecting an email reply with attachments, which would need inbound-
 * email infrastructure this app doesn't have.
 */
export async function requestContractorEvidence(id: string, note: string): Promise<RecruitmentActionResult> {
  await assertIsRole(["admin"]);

  const parsed = noteSchema.safeParse(note);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("contractor_applications")
    .select("reference, full_name, email, resume_token, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { success: false, error: "Application not found" };
  if (app.status === "approved" || app.status === "rejected") {
    return { success: false, error: "This application has already been decided" };
  }

  const { error } = await admin
    .from("contractor_applications")
    .update({ status: "evidence_requested", evidence_requested_at: new Date().toISOString(), evidence_notes: parsed.data })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  const link = `${SITE_URL}/careers/evidence?token=${app.resume_token}`;
  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: app.email,
      subject: `Next steps for your application (${app.reference})`,
      html: `
        <p>Hi ${app.full_name},</p>
        <p>Thanks for applying to join our approved contractor pool. To move your application forward, we need a bit more from you:</p>
        <p>${parsed.data}</p>
        <p>You can securely upload your documents here: <a href="${link}">${link}</a></p>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send evidence-request email", e);
  }

  revalidatePath("/dashboard/admin/recruitment");
  return { success: true };
}

/**
 * Creates a real cleaner profile the same way admin manually adding
 * staff does (createStaffAccount(), shared with inviteUser()) -- the
 * applicant isn't given login credentials by this email, admin still
 * relays those separately via the existing Staff flow, same as today.
 */
export async function approveContractorApplication(id: string): Promise<RecruitmentActionResult> {
  const { user: me } = await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("contractor_applications")
    .select("reference, full_name, email, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { success: false, error: "Application not found" };
  if (app.status === "approved" || app.status === "rejected") {
    return { success: false, error: "This application has already been decided" };
  }

  const temporaryPassword = randomBytes(9).toString("base64url");
  const staffResult = await createStaffAccount({
    email: app.email,
    password: temporaryPassword,
    fullName: app.full_name,
    role: "cleaner",
  });
  if (!staffResult.success) return staffResult;

  const { error } = await admin
    .from("contractor_applications")
    .update({
      status: "approved",
      reviewed_by: me.id,
      decided_at: new Date().toISOString(),
      created_cleaner_profile_id: staffResult.userId,
    })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: app.email,
      subject: `Your application has been approved! (${app.reference})`,
      html: `
        <p>Hi ${app.full_name},</p>
        <p>Great news -- your application to join our approved contractor pool has been <strong>approved</strong>.</p>
        <p>We'll be in touch shortly with next steps.</p>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send approval email", e);
  }

  revalidatePath("/dashboard/admin/recruitment");
  revalidatePath("/dashboard/admin/staff");
  return { success: true };
}

const reasonSchema = z.string().trim().min(1, "A reason is required");

export async function rejectContractorApplication(id: string, reason: string): Promise<RecruitmentActionResult> {
  const { user: me } = await assertIsRole(["admin"]);

  const parsed = reasonSchema.safeParse(reason);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const admin = createAdminClient();
  const { data: app } = await admin
    .from("contractor_applications")
    .select("reference, full_name, email, status")
    .eq("id", id)
    .maybeSingle();
  if (!app) return { success: false, error: "Application not found" };
  if (app.status === "approved" || app.status === "rejected") {
    return { success: false, error: "This application has already been decided" };
  }

  // The reason is an internal note only -- never shown to the
  // applicant, same shape as declineCleaningRequest()'s own reason.
  const { error } = await admin
    .from("contractor_applications")
    .update({ status: "rejected", reviewed_by: me.id, decided_at: new Date().toISOString(), evidence_notes: parsed.data })
    .eq("id", id);
  if (error) return { success: false, error: error.message };

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: app.email,
      subject: `Your application (${app.reference})`,
      html: `
        <p>Hi ${app.full_name},</p>
        <p>Thank you for your interest in joining Sovereign Way Cleaners' contractor network.</p>
        <p>After careful consideration, we've decided not to move forward with a work agreement between us at this time.</p>
        <p>We wish you the best in your future endeavours.</p>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send rejection email", e);
  }

  revalidatePath("/dashboard/admin/recruitment");
  return { success: true };
}

export interface JobApplicationRow {
  id: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  message: string | null;
  cvUrl: string | null;
  status: "new" | "contacted" | "closed";
  createdAt: string;
}

export async function listJobApplications(): Promise<JobApplicationRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("job_applications")
    .select("id, full_name, email, phone, message, cv_storage_path, status, created_at, job_postings(title)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const cvPaths = (data ?? []).map((a) => a.cv_storage_path).filter((p): p is string => !!p);
  const signedUrls = await getRecruitmentDocumentUrls(cvPaths);

  return (data ?? []).map((a) => ({
    id: a.id,
    jobTitle: (a.job_postings as unknown as { title: string } | null)?.title ?? "Unknown role",
    fullName: a.full_name,
    email: a.email,
    phone: a.phone,
    message: a.message,
    cvUrl: a.cv_storage_path ? (signedUrls.get(a.cv_storage_path) ?? null) : null,
    status: a.status,
    createdAt: a.created_at,
  }));
}

const jobApplicationStatusSchema = z.enum(["new", "contacted", "closed"]);

export async function updateJobApplicationStatus(id: string, status: string) {
  await assertIsRole(["admin"]);

  const parsed = jobApplicationStatusSchema.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");

  const admin = createAdminClient();
  const { error } = await admin.from("job_applications").update({ status: parsed.data }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/recruitment");
}
