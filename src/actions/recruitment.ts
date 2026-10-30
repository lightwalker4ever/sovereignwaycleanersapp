"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, requiredPhoneSchema } from "@/lib/validation";
import { normalizeUkPhone } from "@/lib/quote-phone";
import {
  RECRUITMENT_DAYS,
  RECRUITMENT_PERIOD_KEYS,
  AREA_OF_EXPERIENCE_KEYS,
  type BusinessStructure,
  type RecruitmentPeriodKey,
} from "@/lib/recruitment-config";

const contractorContactSchema = z.object({
  fullName: nameSchema,
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
  const parsedContact = contractorContactSchema.safeParse({ fullName: input.fullName, phone: input.phone });
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
