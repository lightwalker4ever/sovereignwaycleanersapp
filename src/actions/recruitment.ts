"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, emailSchema, requiredPhoneSchema } from "@/lib/validation";
import { normalizeUkPhone } from "@/lib/quote-phone";
import { getSalesNotificationEmail } from "@/lib/app-settings";
import {
  RECRUITMENT_DAYS,
  RECRUITMENT_PERIOD_KEYS,
  AREA_OF_EXPERIENCE_KEYS,
  type BusinessStructure,
  type RecruitmentPeriodKey,
} from "@/lib/recruitment-config";

const contractorContactSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: z.string().transform(normalizeUkPhone).pipe(requiredPhoneSchema),
});

export interface ContractorAvailabilityEntry {
  dayOfWeek: number;
  periodKey: RecruitmentPeriodKey;
}

export type SubmitContractorApplicationResult =
  | { success: true; reference: string }
  | { success: false; error: string };

/**
 * Public submission for the contractor-pool application
 * (src/app/(marketing)/careers/apply). Nothing here is trusted from the
 * client beyond shape -- in particular hasLiabilityInsurance is
 * re-checked server-side, never just gated by a disabled submit button,
 * same "never trust the client checkbox alone" rule as every other
 * can't-submit-without-X guard in this app.
 */
export async function submitContractorApplication(input: {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  hasDbs: boolean;
  hasLiabilityInsurance: boolean;
  hasIso: boolean;
  otherEvidenceNotes: string;
  yearsExperience: number;
  areasOfExperience: string[];
  otherAreaOfExperience: string;
  businessStructure: BusinessStructure;
  companyEmployeeCount: number | null;
  notes: string;
  availability: ContractorAvailabilityEntry[];
}): Promise<SubmitContractorApplicationResult> {
  const parsedContact = contractorContactSchema.safeParse({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
  });
  if (!parsedContact.success) {
    return { success: false, error: parsedContact.error.issues[0].message };
  }

  const address = input.address.trim();
  if (!address) return { success: false, error: "Enter your address" };

  if (!input.hasLiabilityInsurance) {
    return { success: false, error: "Product & Public Liability insurance is required to apply" };
  }

  if (!Number.isInteger(input.yearsExperience) || input.yearsExperience < 0) {
    return { success: false, error: "Enter a valid number of years' experience" };
  }

  const areasOfExperience = input.areasOfExperience.filter((a) => AREA_OF_EXPERIENCE_KEYS.includes(a));
  const otherArea = input.otherAreaOfExperience.trim();
  if (areasOfExperience.length === 0 && !otherArea) {
    return { success: false, error: "Select at least one area of experience, or describe it under “Other”" };
  }

  if (input.businessStructure !== "sole_trader" && input.businessStructure !== "company") {
    return { success: false, error: "Choose whether you're a sole trader or a company" };
  }
  const companyEmployeeCount =
    input.businessStructure === "company" && Number.isInteger(input.companyEmployeeCount) && (input.companyEmployeeCount as number) >= 0
      ? input.companyEmployeeCount
      : null;
  if (input.businessStructure === "company" && companyEmployeeCount === null) {
    return { success: false, error: "Enter how many employees the company has" };
  }

  const validDays = new Set<number>(RECRUITMENT_DAYS);
  const validPeriods = new Set<string>(RECRUITMENT_PERIOD_KEYS);
  for (const entry of input.availability) {
    if (!validDays.has(entry.dayOfWeek) || !validPeriods.has(entry.periodKey)) {
      return { success: false, error: "Invalid availability entry" };
    }
  }

  const admin = createAdminClient();
  const { data: application, error } = await admin
    .from("contractor_applications")
    .insert({
      full_name: parsedContact.data.fullName,
      email: parsedContact.data.email,
      phone: parsedContact.data.phone,
      address,
      has_dbs: input.hasDbs,
      has_liability_insurance: true,
      has_iso: input.hasIso,
      other_evidence_notes: input.otherEvidenceNotes.trim() || null,
      years_experience: input.yearsExperience,
      areas_of_experience: areasOfExperience,
      other_area_of_experience: otherArea || null,
      business_structure: input.businessStructure,
      company_employee_count: companyEmployeeCount,
      notes: input.notes.trim() || null,
    })
    .select("id, reference")
    .single();
  if (error || !application) {
    console.error("Failed to create contractor application", error);
    return { success: false, error: "Unable to submit your application right now. Please try again." };
  }

  if (input.availability.length > 0) {
    const { error: availabilityError } = await admin.from("contractor_availability").insert(
      input.availability.map((entry) => ({
        application_id: application.id,
        day_of_week: entry.dayOfWeek,
        period_key: entry.periodKey,
      }))
    );
    if (availabilityError) {
      console.error("Failed to save contractor application availability", availabilityError);
    }
  }

  return { success: true, reference: application.reference };
}

const jobApplicantSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: z.string().transform(normalizeUkPhone).pipe(requiredPhoneSchema),
});

const MAX_CV_BYTES = 5 * 1024 * 1024;

export type SubmitJobApplicationResult = { success: true } | { success: false; error: string };

/**
 * One atomic form submit (not a multi-step journey like the tailored
 * quote flow's photo uploads), so the optional CV uploads inside this
 * same call rather than via a separate pre-row-exists action --
 * FormData is still the right shape since it carries a File, same
 * uploadTailoredPhoto() mechanic (service-role client, no bucket
 * policy needed).
 */
export async function submitJobApplication(formData: FormData): Promise<SubmitJobApplicationResult> {
  const jobPostingId = String(formData.get("jobPostingId") ?? "").trim();
  if (!jobPostingId) return { success: false, error: "Missing job posting" };

  const parsed = jobApplicantSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const message = String(formData.get("message") ?? "").trim();

  const admin = createAdminClient();

  const { data: posting } = await admin
    .from("job_postings")
    .select("id, status")
    .eq("id", jobPostingId)
    .maybeSingle();
  if (!posting || posting.status !== "open") {
    return { success: false, error: "This role is no longer accepting applications." };
  }

  let cvStoragePath: string | null = null;
  const file = formData.get("cv");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_CV_BYTES) return { success: false, error: "CV is too large (max 5MB)" };
    const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
    const storagePath = `job-applications/${randomUUID()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from("recruitment-documents")
      .upload(storagePath, file, { contentType: file.type });
    if (uploadError) return { success: false, error: "Unable to upload your CV. Please try again." };
    cvStoragePath = storagePath;
  }

  const { error } = await admin.from("job_applications").insert({
    job_posting_id: jobPostingId,
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    message: message || null,
    cv_storage_path: cvStoragePath,
  });
  if (error) {
    console.error("Failed to create job application", error);
    return { success: false, error: "Unable to submit your application right now. Please try again." };
  }

  return { success: true };
}

/**
 * Token alone is never trusted -- every lookup below also re-verifies
 * the applicant's own phone number, same "token + a second fact"
 * pattern as the quote flow's getQuoteResponseByToken() (token +
 * postcode). Shared by every /careers/evidence action so the check
 * lives in exactly one place.
 */
async function resolveContractorApplicationByToken(
  admin: ReturnType<typeof createAdminClient>,
  token: string,
  phone: string
): Promise<{ id: string; reference: string; fullName: string; status: string } | null> {
  const trimmedToken = token.trim();
  if (!trimmedToken) return null;

  const { data: app } = await admin
    .from("contractor_applications")
    .select("id, reference, full_name, phone, status")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (!app) return null;
  if (normalizeUkPhone(phone.trim()) !== app.phone) return null;

  return { id: app.id, reference: app.reference, fullName: app.full_name, status: app.status };
}

export interface ContractorEvidenceDetail {
  reference: string;
  fullName: string;
  status: string;
  evidenceNotes: string | null;
  evidenceSubmittedAt: string | null;
  documents: { id: string; originalFilename: string }[];
}

export type GetContractorEvidenceResult =
  | { success: true; detail: ContractorEvidenceDetail }
  | { success: false; error: string };

export async function getContractorApplicationByToken(token: string, phone: string): Promise<GetContractorEvidenceResult> {
  if (!phone.trim()) return { success: false, error: "Enter the phone number from your application." };

  const admin = createAdminClient();
  const app = await resolveContractorApplicationByToken(admin, token, phone);
  if (!app) {
    return { success: false, error: "We couldn't find that application. Check your link and phone number." };
  }

  const { data: full } = await admin
    .from("contractor_applications")
    .select("evidence_notes, evidence_submitted_at")
    .eq("id", app.id)
    .single();
  const { data: documents } = await admin
    .from("contractor_evidence_documents")
    .select("id, original_filename")
    .eq("application_id", app.id)
    .order("created_at", { ascending: true });

  return {
    success: true,
    detail: {
      reference: app.reference,
      fullName: app.fullName,
      status: app.status,
      evidenceNotes: full?.evidence_notes ?? null,
      evidenceSubmittedAt: full?.evidence_submitted_at ?? null,
      documents: (documents ?? []).map((d) => ({ id: d.id, originalFilename: d.original_filename })),
    },
  };
}

const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

export type UploadEvidenceResult =
  | { success: true; document: { id: string; originalFilename: string } }
  | { success: false; error: string };

export async function uploadContractorEvidenceDocument(
  token: string,
  phone: string,
  formData: FormData
): Promise<UploadEvidenceResult> {
  const admin = createAdminClient();
  const app = await resolveContractorApplicationByToken(admin, token, phone);
  if (!app) return { success: false, error: "We couldn't find that application." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };
  if (file.size > MAX_EVIDENCE_BYTES) return { success: false, error: "File is too large (max 10MB)" };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "pdf";
  const storagePath = `contractor/${app.id}/${randomUUID()}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from("recruitment-documents")
    .upload(storagePath, file, { contentType: file.type });
  if (uploadError) return { success: false, error: "Unable to upload that file. Please try again." };

  const { data: document, error } = await admin
    .from("contractor_evidence_documents")
    .insert({ application_id: app.id, storage_path: storagePath, original_filename: file.name })
    .select("id, original_filename")
    .single();
  if (error || !document) {
    await admin.storage.from("recruitment-documents").remove([storagePath]);
    return { success: false, error: "Unable to save that file. Please try again." };
  }

  return { success: true, document: { id: document.id, originalFilename: document.original_filename } };
}

export type RemoveEvidenceResult = { success: true } | { success: false; error: string };

export async function removeContractorEvidenceDocument(
  token: string,
  phone: string,
  documentId: string
): Promise<RemoveEvidenceResult> {
  const admin = createAdminClient();
  const app = await resolveContractorApplicationByToken(admin, token, phone);
  if (!app) return { success: false, error: "We couldn't find that application." };

  const { data: document } = await admin
    .from("contractor_evidence_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("application_id", app.id)
    .maybeSingle();
  if (!document) return { success: false, error: "File not found" };

  await admin.storage.from("recruitment-documents").remove([document.storage_path]);
  const { error } = await admin.from("contractor_evidence_documents").delete().eq("id", documentId);
  if (error) return { success: false, error: error.message };

  return { success: true };
}

/**
 * The applicant's "I'm done" button -- marks evidence_submitted_at and
 * pings admin by email so the case comes back onto their radar, rather
 * than admin having to poll the Recruitment list for changes.
 */
export async function markContractorEvidenceSubmitted(token: string, phone: string): Promise<RemoveEvidenceResult> {
  const admin = createAdminClient();
  const app = await resolveContractorApplicationByToken(admin, token, phone);
  if (!app) return { success: false, error: "We couldn't find that application." };

  const { error } = await admin
    .from("contractor_applications")
    .update({ evidence_submitted_at: new Date().toISOString() })
    .eq("id", app.id);
  if (error) return { success: false, error: error.message };

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const notifyEmail = await getSalesNotificationEmail();
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: notifyEmail,
      subject: `Evidence submitted for contractor application (${app.reference})`,
      html: `<p>${app.fullName} has uploaded the requested evidence for their contractor application. Please review it in Recruitment.</p>`,
    });
  } catch (e) {
    console.error("Failed to send evidence-submitted notification", e);
  }

  return { success: true };
}
