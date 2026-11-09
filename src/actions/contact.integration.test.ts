import { beforeEach, describe, expect, it, vi } from "vitest";

// Both contact.ts's own dependency chain (via createAdminClient) import
// "server-only", which throws outside Next.js's webpack build unless
// stubbed -- see client-jobs.test.ts for the same pattern.
vi.mock("server-only", () => ({}));

// contact.ts builds its own `new Resend(...)` at module scope -- mock
// the whole package so no real network call happens, while still
// letting us assert exactly what it tried to send.
const sendMock = vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const { submitContactForm } = await import("./contact");
const { createAdminClient } = await import("@/lib/supabase/admin");

function buildFormData(overrides: Partial<Record<"name" | "email" | "service" | "message", string>> = {}) {
  const fd = new FormData();
  fd.set("name", overrides.name ?? "Jane Smith");
  fd.set("email", overrides.email ?? `jane.${Date.now()}@example.com`);
  fd.set("service", overrides.service ?? "General enquiries");
  fd.set("message", overrides.message ?? "a".repeat(60));
  return fd;
}

describe("submitContactForm (integration)", () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it("persists a real contact_requests row and sends both emails", async () => {
    const email = `jane.${Date.now()}@example.com`;

    const result = await submitContactForm(null, buildFormData({ email }));
    expect(result).toEqual({ success: true });

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("contact_requests")
      .select("name, email, service, message, status")
      .eq("email", email)
      .single();
    expect(error).toBeNull();
    expect(data).toMatchObject({
      name: "Jane Smith",
      email,
      service: "General enquiries",
      status: "new",
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    const [notificationCall, confirmationCall] = sendMock.mock.calls.map(([args]) => args);
    expect(notificationCall.subject).toBe("New enquiry from Jane Smith");
    expect(confirmationCall.to).toBe(email);
    expect(confirmationCall.subject).toBe("We've received your quote request");
  });

  it("rejects an invalid submission without writing a row or sending email", async () => {
    const result = await submitContactForm(null, buildFormData({ name: "Not A Valid Name 123" }));

    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});
