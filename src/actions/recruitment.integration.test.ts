import { beforeEach, describe, expect, it, vi } from "vitest";

// recruitment.ts's dependency chain (createAdminClient) imports
// "server-only" -- see client-jobs.test.ts for why this needs
// stubbing outside Next.js's webpack build.
vi.mock("server-only", () => ({}));

const sendMock = vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const {
  submitContractorApplication,
  getContractorApplicationByToken,
  uploadContractorEvidenceDocument,
  removeContractorEvidenceDocument,
  markContractorEvidenceSubmitted,
} = await import("./recruitment");
const { createAdminClient } = await import("@/lib/supabase/admin");

beforeEach(() => {
  sendMock.mockClear();
});

const baseApplicationInput = {
  fullName: "Jane Smith",
  email: "",
  phone: "01732711856",
  address: "1 Test Street, TN9 1AA",
  hasDbs: true,
  hasLiabilityInsurance: true,
  hasIso: false,
  otherEvidenceNotes: "",
  yearsExperience: 5,
  areasOfExperience: ["domestic_cleaning"],
  otherAreaOfExperience: "",
  businessStructure: "sole_trader" as const,
  companyEmployeeCount: null,
  notes: "",
  availability: [{ dayOfWeek: 1, periodKey: "day" as const }],
};

describe("submitContractorApplication (integration)", () => {
  it("creates a real contractor_applications + contractor_availability rows", async () => {
    const email = `contractor-${Date.now()}@example.com`;
    const result = await submitContractorApplication({ ...baseApplicationInput, email });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.reference).toBeTruthy();

    const admin = createAdminClient();
    const { data: application, error } = await admin
      .from("contractor_applications")
      .select("id, full_name, email, has_liability_insurance, years_experience, status, resume_token")
      .eq("reference", result.reference)
      .single();
    expect(error).toBeNull();
    expect(application).toMatchObject({
      full_name: "Jane Smith",
      email,
      has_liability_insurance: true,
      years_experience: 5,
      status: "submitted",
    });
    expect(application!.resume_token).toBeTruthy();

    const { data: availability } = await admin
      .from("contractor_availability")
      .select("day_of_week, period_key")
      .eq("application_id", application!.id);
    expect(availability).toEqual([{ day_of_week: 1, period_key: "day" }]);
  });

  it("rejects an application without liability insurance, without creating a row", async () => {
    const email = `contractor-no-insurance-${Date.now()}@example.com`;
    const result = await submitContractorApplication({
      ...baseApplicationInput,
      email,
      hasLiabilityInsurance: false,
    });

    expect(result).toEqual({
      success: false,
      error: "Product & Public Liability insurance is required to apply",
    });

    const admin = createAdminClient();
    const { data } = await admin.from("contractor_applications").select("id").eq("email", email).maybeSingle();
    expect(data).toBeNull();
  });
});

/** Mimics a row already in the system, bypassing the public submission path. */
async function createTestApplication(): Promise<{ id: string; resumeToken: string; phone: string }> {
  const admin = createAdminClient();
  const phone = "01732711856";
  const { data, error } = await admin
    .from("contractor_applications")
    .insert({
      full_name: "Evidence Test Applicant",
      email: `evidence-${Date.now()}@example.com`,
      phone,
      address: "1 Test Street, TN9 1AA",
      has_liability_insurance: true,
      years_experience: 3,
      areas_of_experience: ["domestic_cleaning"],
      business_structure: "sole_trader",
    })
    .select("id, resume_token")
    .single();
  if (error || !data) throw new Error(error?.message ?? "contractor_applications insert failed");
  return { id: data.id, resumeToken: data.resume_token, phone };
}

describe("contractor evidence flow (integration)", () => {
  it("rejects a lookup with the wrong phone number", async () => {
    const { resumeToken } = await createTestApplication();
    const result = await getContractorApplicationByToken(resumeToken, "07000000000");
    expect(result.success).toBe(false);
  });

  it("uploads a real file to Storage, lists it, removes it, and marks evidence submitted", async () => {
    const { resumeToken, phone } = await createTestApplication();

    const lookup = await getContractorApplicationByToken(resumeToken, phone);
    expect(lookup.success).toBe(true);
    if (!lookup.success) return;
    expect(lookup.detail.documents).toEqual([]);
    expect(lookup.detail.evidenceSubmittedAt).toBeNull();

    const fileContent = "test evidence file content";
    const file = new File([fileContent], "evidence.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.set("file", file);

    const uploadResult = await uploadContractorEvidenceDocument(resumeToken, phone, formData);
    expect(uploadResult.success).toBe(true);
    if (!uploadResult.success) return;
    expect(uploadResult.document.originalFilename).toBe("evidence.pdf");

    const admin = createAdminClient();
    const { data: documentRow } = await admin
      .from("contractor_evidence_documents")
      .select("storage_path")
      .eq("id", uploadResult.document.id)
      .single();
    expect(documentRow).toBeTruthy();

    // Real Supabase Storage round-trip, not just the DB row.
    const { data: downloaded, error: downloadError } = await admin.storage
      .from("recruitment-documents")
      .download(documentRow!.storage_path);
    expect(downloadError).toBeNull();
    expect(await downloaded!.text()).toBe(fileContent);

    const afterUpload = await getContractorApplicationByToken(resumeToken, phone);
    expect(afterUpload.success && afterUpload.detail.documents).toEqual([
      { id: uploadResult.document.id, originalFilename: "evidence.pdf" },
    ]);

    const removeResult = await removeContractorEvidenceDocument(resumeToken, phone, uploadResult.document.id);
    expect(removeResult).toEqual({ success: true });

    const { data: afterRemoveRow } = await admin
      .from("contractor_evidence_documents")
      .select("id")
      .eq("id", uploadResult.document.id)
      .maybeSingle();
    expect(afterRemoveRow).toBeNull();

    const { error: downloadAfterRemoveError } = await admin.storage
      .from("recruitment-documents")
      .download(documentRow!.storage_path);
    expect(downloadAfterRemoveError).toBeTruthy();

    const submitResult = await markContractorEvidenceSubmitted(resumeToken, phone);
    expect(submitResult).toEqual({ success: true });

    const { data: application } = await admin
      .from("contractor_applications")
      .select("evidence_submitted_at")
      .eq("resume_token", resumeToken)
      .single();
    expect(application!.evidence_submitted_at).toBeTruthy();

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].subject).toContain("Evidence submitted for contractor application");
  });
});
