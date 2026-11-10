import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// quote.ts's dependency chain (createAdminClient, cleaner-availability,
// staff.ts) all import "server-only" -- see client-jobs.test.ts for why
// this needs stubbing outside Next.js's webpack build.
vi.mock("server-only", () => ({}));

// getSessionClientId() calls getCurrentUser(), which calls next/headers'
// cookies() -- only valid inside a real Next.js request. Mocking it to
// "no session" simulates the overwhelmingly common real case for this
// action anyway: an anonymous customer submitting the public quote form.
vi.mock("@/lib/supabase/current-user", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

// revalidatePath() also only works inside a real Next.js request.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const sendMock = vi.fn().mockResolvedValue({ data: { id: "test-email-id" }, error: null });
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: sendMock } })),
}));

const { submitInstantQuoteRequest, acceptQuoteRequest } = await import("./quote");
const { createStaffAccount } = await import("@/lib/staff");
const { setWeeklyAvailability } = await import("@/lib/cleaner-availability");
const { createAdminClient } = await import("@/lib/supabase/admin");

beforeEach(() => {
  sendMock.mockClear();
  // Deterministic, CI-independent fail-soft path: postcodes.io
  // reports every postcode used in this file as not found, so
  // location multiplier / geographic restriction fall back to their
  // documented defaults rather than depending on a real network call.
  // Only intercepts calls to postcodes.io specifically -- the
  // Supabase JS client (Auth admin, REST, RPC) also uses fetch
  // internally, and those real local-instance calls must pass
  // through untouched.
  const realFetch = global.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes("api.postcodes.io")) {
        return Promise.resolve(new Response(null, { status: 404 }));
      }
      return realFetch(input, init);
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function createTestCleaner(label: string): Promise<string> {
  const email = `instant-quote-${label}-${Date.now()}@example.com`;
  const result = await createStaffAccount({
    email,
    password: "Test1234!",
    fullName: `Instant Quote Test Cleaner ${label}`,
    role: "cleaner",
  });
  if (!result.success) throw new Error(result.error);
  return result.userId;
}

const baseInput = {
  draftId: null,
  service: "end_of_tenancy" as const,
  selectedInputs: { propertySize: "studio1bed" as const, bathrooms: 1 as const, addons: {} },
  postcode: "TN9 1AA",
  // Friday (day-of-week 5) + morning, deliberately a combination no
  // other integration test file's fixtures use: cleaner_availability
  // is a RECURRING weekly rule, not date-specific, so every
  // integration test file sharing this CI run's one Postgres instance
  // shares the same pool of "who's available on day-of-week X, window
  // Y" -- cleaner-availability.integration.test.ts uses Thursday
  // mornings, which would otherwise leak a second, unrelated cleaner
  // into this file's "available" results on any Thursday date here.
  requestedDate: "2026-02-06",
  requestedWindow: "morning" as const,
  isFlexible: false,
  cleanerId: null,
  cleanerChoice: "any" as const,
  addressLine: "1 Test Street",
  accessMethod: "present" as const,
  accessNotes: "",
  marketingConsent: false,
  trackOnline: false,
};

describe("submitInstantQuoteRequest (integration)", () => {
  it("creates a real cleanings + clients row, recomputes the price server-side, and locks in an available cleaner", async () => {
    const cleanerId = await createTestCleaner("free");
    await setWeeklyAvailability(cleanerId, [{ dayOfWeek: 5, windowKey: "morning" }]);

    const email = `instant-quote-customer-${Date.now()}@example.com`;
    const result = await submitInstantQuoteRequest({
      ...baseInput,
      name: "Jane Smith",
      email,
      phone: "01732711856",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    // Studio/1-bed, 1 bathroom, no add-ons -- same golden value as
    // quote-calculations.test.ts's own pure unit test.
    expect(result.totalIncVat).toBe(222);

    const admin = createAdminClient();
    const { data: cleaning, error } = await admin
      .from("cleanings")
      .select("status, cleaner_id, scheduled_at, service, postcode, client_id")
      .eq("id", result.cleaningId)
      .single();
    expect(error).toBeNull();
    expect(cleaning).toMatchObject({
      status: "awaiting_confirmation",
      cleaner_id: cleanerId,
      service: "end_of_tenancy",
      postcode: "TN9 1AA",
    });
    expect(cleaning!.scheduled_at.startsWith("2026-02-06T08:00:00")).toBe(true);

    const { data: client, error: clientError } = await admin
      .from("clients")
      .select("full_name, email")
      .eq("id", cleaning!.client_id)
      .single();
    expect(clientError).toBeNull();
    expect(client).toMatchObject({ full_name: "Jane Smith", email });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toBe(email);
    expect(sendMock.mock.calls[0][0].subject).toBe(`We've received your booking request (${result.reference})`);
  });

  it("falls back to no cleaner locked in when nobody is available, without blocking the booking", async () => {
    // No cleaner anywhere declares Friday-afternoon availability.
    const email = `instant-quote-nocleaner-${Date.now()}@example.com`;
    const result = await submitInstantQuoteRequest({
      ...baseInput,
      requestedWindow: "afternoon",
      name: "John Doe",
      email,
      phone: "01732711856",
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    const admin = createAdminClient();
    const { data: cleaning } = await admin
      .from("cleanings")
      .select("status, cleaner_id")
      .eq("id", result.cleaningId)
      .single();
    expect(cleaning).toMatchObject({ status: "awaiting_confirmation", cleaner_id: null });
  });

  it("rejects an invalid phone number without creating any rows or sending email", async () => {
    const result = await submitInstantQuoteRequest({
      ...baseInput,
      name: "Jane Smith",
      email: `instant-quote-invalid-${Date.now()}@example.com`,
      phone: "123",
    });

    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();
  });
});

/** Mimics the row admin's "price a tailored quote" flow would have created. */
async function createQuotedRequest(overrides: { postcode?: string } = {}) {
  const admin = createAdminClient();
  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ full_name: "Accept Quote Test Client", email: `accept-quote-${Date.now()}@example.com` })
    .select("id")
    .single();
  if (clientError || !client) throw new Error(clientError?.message ?? "client insert failed");

  const resumeToken = crypto.randomUUID();
  const { data: request, error: requestError } = await admin
    .from("quote_requests")
    .insert({
      service: "domestic_cleaning",
      client_id: client.id,
      postcode: overrides.postcode ?? "TN9 1AA",
      answers: {},
      status: "quoted",
      quoted_price: 150,
      resume_token: resumeToken,
    })
    .select("id")
    .single();
  if (requestError || !request) throw new Error(requestError?.message ?? "quote_requests insert failed");

  return { requestId: request.id, clientId: client.id, resumeToken };
}

describe("acceptQuoteRequest (integration)", () => {
  it("converts a real quote_requests row into a cleanings row and locks in an available cleaner", async () => {
    const cleanerId = await createTestCleaner("accept");
    // Saturday (day-of-week 6), a combination unused by any other
    // integration test file sharing this CI run's one Postgres
    // instance -- see the comment on baseInput above.
    await setWeeklyAvailability(cleanerId, [{ dayOfWeek: 6, windowKey: "morning" }]);
    const { requestId, clientId, resumeToken } = await createQuotedRequest();

    const result = await acceptQuoteRequest({
      token: resumeToken,
      postcode: "TN9 1AA",
      phone: "01732711856",
      addressLine: "1 Test Street",
      requestedDate: "2026-02-07",
      requestedWindow: "morning",
      isFlexible: false,
      cleanerId: null,
      cleanerChoice: "any",
    });

    expect(result).toEqual({ success: true });

    const admin = createAdminClient();
    const { data: request } = await admin
      .from("quote_requests")
      .select("status, cleaning_id")
      .eq("id", requestId)
      .single();
    expect(request?.status).toBe("converted");
    expect(request?.cleaning_id).toBeTruthy();

    const { data: cleaning } = await admin
      .from("cleanings")
      .select("status, cleaner_id, client_id, service, postcode")
      .eq("id", request!.cleaning_id!)
      .single();
    expect(cleaning).toMatchObject({
      status: "awaiting_confirmation",
      cleaner_id: cleanerId,
      client_id: clientId,
      service: "domestic_cleaning",
      postcode: "TN9 1AA",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].subject).toContain("You're booked in!");
  });

  it("rejects a mismatched postcode without converting the request", async () => {
    const { requestId, resumeToken } = await createQuotedRequest({ postcode: "TN9 1AA" });

    const result = await acceptQuoteRequest({
      token: resumeToken,
      postcode: "SW1A 1AA",
      phone: "01732711856",
      addressLine: "1 Test Street",
      requestedDate: "2026-02-07",
      requestedWindow: "morning",
      isFlexible: false,
      cleanerId: null,
      cleanerChoice: "any",
    });

    expect(result.success).toBe(false);
    expect(sendMock).not.toHaveBeenCalled();

    const admin = createAdminClient();
    const { data: request } = await admin.from("quote_requests").select("status").eq("id", requestId).single();
    expect(request?.status).toBe("quoted");
  });

  it("rejects a request that's already been responded to", async () => {
    const admin = createAdminClient();
    const { requestId, resumeToken } = await createQuotedRequest();
    await admin.from("quote_requests").update({ status: "declined" }).eq("id", requestId);

    const result = await acceptQuoteRequest({
      token: resumeToken,
      postcode: "TN9 1AA",
      phone: "01732711856",
      addressLine: "1 Test Street",
      requestedDate: "2026-02-07",
      requestedWindow: "morning",
      isFlexible: false,
      cleanerId: null,
      cleanerChoice: "any",
    });

    expect(result).toEqual({ success: false, error: "This quote has already been responded to." });
  });
});
