"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getRateCard, type RateCard } from "@/lib/rate-card";
import { lookupPostcode } from "@/lib/postcode-lookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/current-user";
import type { Json } from "@/lib/supabase/database.types";
import { nameSchema, emailSchema, requiredPhoneSchema } from "@/lib/validation";
import { normalizeUkPhone } from "@/lib/quote-phone";
import type { ArrivalWindowKey, AccessMethod } from "@/lib/quote-state";
import { CONFIRMATION_WINDOW_HOURS, WINDOW_ORDER, type TailoredServiceSlug } from "@/lib/quote-config";
import {
  getCleanerScheduleGrid,
  listAvailableCleanersForSlot,
  resolveBookingCleaner,
} from "@/lib/cleaner-availability";
import {
  calculateEndOfTenancy,
  calculateDeepCleaning,
  calculateOfficeCleaning,
  type QuoteServiceKey,
  type EndOfTenancyInput,
  type DeepCleaningInput,
  type OfficeCleaningInput,
  type QuoteBreakdown,
} from "@/lib/quote-calculations";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * If the browser submitting this quote already has an active session
 * for a client account, returns that account's own clients.id so the
 * quote lands on their existing record instead of a brand-new,
 * disconnected ghost client -- linkGhostClientToProfile() only runs at
 * sign-in/signup, never again for someone already logged in, so
 * without this every quote an already-authenticated customer submits
 * would silently orphan itself from their own dashboard.
 */
async function getSessionClientId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") return null;
  const admin = createAdminClient();
  const { data } = await admin.from("clients").select("id").eq("profile_id", user.id).maybeSingle();
  return data?.id ?? null;
}

export interface MyQuoteAccount {
  fullName: string | null;
  email: string;
  phone: string | null;
  address: string | null;
}

/**
 * Powers the /quote journey's "prefill and lock identity fields for an
 * already-logged-in customer" behaviour. Name and phone come back so
 * the details step can prefill *and disable* them (the customer
 * shouldn't be able to submit a quote as someone else while signed
 * into their own account); address comes back for prefill only -- it
 * stays editable, since a one-off clean at a different property is a
 * legitimate thing to ask for.
 */
export async function getMyAccountForQuote(): Promise<MyQuoteAccount | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "client" || !user.email) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("clients")
    .select("full_name, phone, address")
    .eq("profile_id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { fullName: data.full_name ?? user.fullName, email: user.email, phone: data.phone, address: data.address };
}

export type GetQuoteRateCardResult =
  | { success: true; rateCard: RateCard }
  | { success: false; error: string };

export async function getQuoteRateCard(): Promise<GetQuoteRateCardResult> {
  try {
    const rateCard = await getRateCard();
    return { success: true, rateCard };
  } catch (e) {
    console.error("Failed to load rate card for quote calculator", e);
    return { success: false, error: "The quote calculator is temporarily unavailable." };
  }
}

export interface PostcodeCoverageResult {
  /** False only when the postcode genuinely doesn't exist -- blocks
   *  continuing. There's no real "do we serve this area" business rule
   *  anywhere in the app (every postcode resolves to a price via
   *  resolveLocationMultiplier()'s default-rate fallback), so this is
   *  purely "is this a real UK postcode", checked up front so a
   *  mistyped postcode can't quote someone the standard rate and then
   *  surprise them with a location adjustment once they fix the typo. */
  valid: boolean;
  /** The recognized outward code (e.g. "N12"), shown in the "we clean in ..." message.
   *  Null when the lookup service itself failed (fails soft -- valid stays
   *  true so a postcodes.io outage never blocks the quote, it just skips
   *  the confirmation message). */
  area: string | null;
}

export async function checkPostcodeCoverage(postcode: string): Promise<PostcodeCoverageResult> {
  const trimmed = postcode.trim();
  if (!trimmed) return { valid: false, area: null };

  const result = await lookupPostcode(trimmed);
  if (result.status === "not_found") return { valid: false, area: null };
  if (result.status === "error") return { valid: true, area: null };

  // A UK postcode's inward code (the part after the space) is always
  // exactly 3 characters -- everything before that is the outward code
  // (e.g. "N12", "SE1", "SW1A") shown in the "we clean in ..." message.
  const compact = trimmed.toUpperCase().replace(/\s+/g, "");
  const outwardCode = compact.length > 3 ? compact.slice(0, -3) : result.geo.postcodeArea;
  return { valid: true, area: outwardCode };
}

/**
 * Captures an email for a postcode the coverage check didn't recognize,
 * per the spec's "don't dead-end" instruction. Best-effort: a failed
 * insert never blocks the visitor from continuing with the quote.
 */
export async function submitCoverageWaitlist(postcode: string, email: string): Promise<{ success: boolean }> {
  const parsedEmail = emailSchema.safeParse(email.trim());
  if (!parsedEmail.success) return { success: false };

  const admin = createAdminClient();
  const { error } = await admin
    .from("coverage_waitlist")
    .insert({ postcode: postcode.trim(), email: parsedEmail.data });
  if (error) {
    console.error("Failed to save coverage waitlist entry", error);
    return { success: false };
  }
  return { success: true };
}

const SERVICE_TITLE: Record<QuoteServiceKey, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

export type EmailQuoteResult = { success: true } | { success: false; error: string };

/**
 * Step 2's "Not ready? Email me this quote" link -- the only place an
 * email is asked for before step 4, so this never persists a lead or a
 * client record, it just sends the already-computed breakdown. The
 * breakdown is trusted as given here (not recomputed) since nothing is
 * stored or charged -- worst case a tampered link emails someone an
 * incorrect-but-harmless quote, same trust level as sharing a screenshot.
 */
export async function emailQuoteToSelf(
  service: QuoteServiceKey,
  breakdown: QuoteBreakdown,
  email: string
): Promise<EmailQuoteResult> {
  const parsed = emailSchema.safeParse(email.trim());
  if (!parsed.success) {
    return { success: false, error: "Enter a valid email address" };
  }

  const lineRows = breakdown.lineItems
    .map((l) => `<tr><td style="padding:4px 0;color:#34403A">${l.label}</td><td style="padding:4px 0;text-align:right">£${l.amount.toFixed(2)}</td></tr>`)
    .join("");

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: parsed.data,
      subject: `Your ${SERVICE_TITLE[service]} quote from Sovereign Way Cleaners`,
      html: `
        <p>Hi,</p>
        <p>Here's the ${SERVICE_TITLE[service]} quote you were looking at:</p>
        <table style="width:100%;max-width:420px;border-collapse:collapse;font-family:sans-serif;font-size:14px">
          ${lineRows}
          <tr><td style="padding:8px 0;border-top:1px solid #E2E7E3;color:#55615A">Subtotal (ex. VAT)</td><td style="padding:8px 0;border-top:1px solid #E2E7E3;text-align:right">£${breakdown.subtotalExVat.toFixed(2)}</td></tr>
          <tr><td style="color:#55615A">VAT (20%)</td><td style="text-align:right">£${breakdown.vatAmount.toFixed(2)}</td></tr>
          <tr><td style="padding-top:8px;font-weight:bold">Total (inc. VAT)</td><td style="padding-top:8px;text-align:right;font-weight:bold">£${breakdown.totalIncVat.toFixed(2)}</td></tr>
        </table>
        <p>When you're ready, you can pick up where you left off any time at <a href="https://sovereignwaycleaners.co.uk/quote">sovereignwaycleaners.co.uk/quote</a>.</p>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
    return { success: true };
  } catch (e) {
    console.error("Failed to email quote", e);
    return { success: false, error: "Couldn't send that right now. Please try again." };
  }
}

export interface ResolvedLocation {
  multiplier: number;
  label: string;
}

/**
 * Matches in fixed tiers (district, then region, then postcode area, then
 * default) -- `priority` only disambiguates multiple rows within the same
 * tier, it never reorders across tiers. Fails soft to the default
 * multiplier on any lookup failure or no match -- never blocks the quote.
 */
export async function resolveLocationMultiplier(postcode: string): Promise<ResolvedLocation> {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("location_multipliers")
    .select("match_type, match_value, multiplier, label")
    .order("priority", { ascending: true });

  const fallback: ResolvedLocation = { multiplier: 1, label: "Standard rate" };
  if (error || !rows) return fallback;

  const defaultRow = rows.find((r) => r.match_type === "default");
  const resolvedDefault = defaultRow
    ? { multiplier: Number(defaultRow.multiplier), label: defaultRow.label }
    : fallback;

  const lookup = await lookupPostcode(postcode);
  if (lookup.status !== "found") return resolvedDefault;
  const geo = lookup.geo;

  for (const row of rows) {
    if (row.match_type === "admin_district" && row.match_value === geo.adminDistrict) {
      return { multiplier: Number(row.multiplier), label: row.label };
    }
  }
  for (const row of rows) {
    if (row.match_type === "region" && row.match_value === geo.region) {
      return { multiplier: Number(row.multiplier), label: row.label };
    }
  }
  for (const row of rows) {
    if (row.match_type === "postcode_area" && row.match_value === geo.postcodeArea) {
      return { multiplier: Number(row.multiplier), label: row.label };
    }
  }

  return resolvedDefault;
}

const WINDOW_START_TIME: Record<ArrivalWindowKey, string> = {
  morning: "08:00",
  midday: "11:00",
  afternoon: "14:00",
};

const instantContactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().transform(normalizeUkPhone).pipe(requiredPhoneSchema),
});

function computeInstantBreakdown(
  service: QuoteServiceKey,
  selectedInputs: EndOfTenancyInput | DeepCleaningInput | OfficeCleaningInput,
  rateCard: RateCard,
  location: ResolvedLocation
): QuoteBreakdown {
  if (service === "end_of_tenancy") {
    return calculateEndOfTenancy(selectedInputs as EndOfTenancyInput, rateCard, location.multiplier, location.label);
  }
  if (service === "deep_cleaning") {
    return calculateDeepCleaning(selectedInputs as DeepCleaningInput, rateCard, location.multiplier, location.label);
  }
  return calculateOfficeCleaning(selectedInputs as OfficeCleaningInput, rateCard, location.multiplier, location.label);
}

const SITE_URL = "https://sovereignwaycleaners.co.uk";

/**
 * Phase C's "here's your quote" email -- sent exactly once, when a
 * draft is first created (never on a later edit, so tweaking an
 * option repeatedly doesn't spam the customer). The magic link embeds
 * resumeToken only; resolveQuoteDraftByToken still requires the
 * customer to re-enter their postcode before anything is restored, so
 * the token alone isn't enough to pull up someone else's quote from a
 * forwarded/leaked email. Best-effort -- a failed send never blocks
 * the draft save itself.
 */
async function sendDraftSavedEmail(input: {
  email: string;
  reference: string;
  resumeToken: string;
  subject: string;
  bodyHtml: string;
}) {
  const resumeUrl = `${SITE_URL}/quote/resume?token=${input.resumeToken}`;
  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: input.email,
      subject: input.subject,
      html: `
        ${input.bodyHtml}
        <p><a href="${resumeUrl}" style="display:inline-block;padding:10px 18px;background:#1B5E3B;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Continue my quote</a></p>
        <p style="font-size:13px;color:#667">Or go to ${resumeUrl} and enter your postcode to confirm it's you.</p>
        <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong>.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send draft-saved email", e);
  }
}

export type SaveQuoteDraftResult =
  | { success: true; draftId: string; totalIncVat: number }
  | { success: false; error: string };

/**
 * Phase B of the persisted-quote work: called as soon as the customer
 * finishes configuring an instant-price service and moves on to pick
 * a date -- saves a 'quoted' cleanings row (email + postcode + the
 * computed price, no date or full contact details yet) instead of
 * waiting for final submission. Price is recomputed server-side, same
 * trust model as submitInstantQuoteRequest below.
 *
 * Reuses the existing draft row for this browser session (draftId,
 * kept in sessionStorage) rather than creating a new one every time
 * the customer tweaks an option and moves on again. Falls back to
 * creating a fresh draft if the given draftId can't be reused (not
 * found, or already past the 'quoted' stage) -- never blocks the
 * customer from continuing.
 */
export async function saveInstantQuoteDraft(input: {
  draftId: string | null;
  service: QuoteServiceKey;
  selectedInputs: EndOfTenancyInput | DeepCleaningInput | OfficeCleaningInput;
  postcode: string;
  email: string;
}): Promise<SaveQuoteDraftResult> {
  const trimmedPostcode = input.postcode.trim();
  if (!trimmedPostcode) return { success: false, error: "Postcode is required" };
  const parsedEmail = emailSchema.safeParse(input.email.trim());
  if (!parsedEmail.success) return { success: false, error: "A valid email is required" };

  let rateCard: RateCard;
  try {
    rateCard = await getRateCard();
  } catch (e) {
    console.error("Failed to load rate card for quote draft", e);
    return { success: false, error: "Unable to save your quote right now." };
  }

  const location = await resolveLocationMultiplier(trimmedPostcode);
  const breakdown = computeInstantBreakdown(input.service, input.selectedInputs, rateCard, location);

  const admin = createAdminClient();
  const sessionClientId = await getSessionClientId();

  if (input.draftId) {
    const { data: existing } = await admin
      .from("cleanings")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "quoted")
      .maybeSingle();
    if (existing) {
      // Re-parent an anonymously-started draft onto the account the
      // customer has since logged into, instead of leaving it tied to
      // a disconnected ghost client forever.
      const draftClientId = sessionClientId ?? existing.client_id;
      if (draftClientId !== existing.client_id) {
        await admin.from("cleanings").update({ client_id: draftClientId }).eq("id", input.draftId);
      } else {
        await admin.from("clients").update({ email: parsedEmail.data }).eq("id", existing.client_id);
      }
      const { error: updateError } = await admin
        .from("cleanings")
        .update({
          service: input.service,
          postcode: trimmedPostcode,
          property_answers: input.selectedInputs as unknown as Json,
          price_breakdown: breakdown as unknown as Json,
        })
        .eq("id", input.draftId);
      if (!updateError) {
        return { success: true, draftId: input.draftId, totalIncVat: breakdown.totalIncVat };
      }
      console.error("Failed to update quote draft, creating a fresh one instead", updateError);
    }
  }

  let clientId: string;
  if (sessionClientId) {
    clientId = sessionClientId;
  } else {
    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({ email: parsedEmail.data })
      .select("id")
      .single();
    if (clientError || !client) {
      console.error("Failed to create client for quote draft", clientError);
      return { success: false, error: "Unable to save your quote right now." };
    }
    clientId = client.id;
  }

  // Generated only here, on a fresh draft, and never regenerated on an
  // update -- the one magic link already emailed below must keep
  // working for the life of this draft.
  const resumeToken = randomUUID();

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .insert({
      client_id: clientId,
      status: "quoted",
      service: input.service,
      postcode: trimmedPostcode,
      property_answers: input.selectedInputs as unknown as Json,
      price_breakdown: breakdown as unknown as Json,
      source: "website_quote",
      resume_token: resumeToken,
    })
    .select("id, reference")
    .single();
  if (cleaningError || !cleaning) {
    console.error("Failed to create quote draft", cleaningError);
    return { success: false, error: "Unable to save your quote right now." };
  }

  await sendDraftSavedEmail({
    email: parsedEmail.data,
    reference: cleaning.reference,
    resumeToken,
    subject: `Your ${SERVICE_TITLE[input.service]} quote is saved (${cleaning.reference})`,
    bodyHtml: `
      <p>Hi,</p>
      <p>We've saved your <strong>${SERVICE_TITLE[input.service]}</strong> quote. Reference <strong>${cleaning.reference}</strong>.</p>
      <p style="font-size:20px;font-weight:bold">£${breakdown.totalIncVat.toFixed(2)} inc. VAT</p>
      <p>No payment or booking yet -- pick up where you left off whenever you're ready.</p>
    `,
  });

  return { success: true, draftId: cleaning.id, totalIncVat: breakdown.totalIncVat };
}

/**
 * Tailored-service equivalent of saveInstantQuoteDraft -- saved as
 * soon as the customer finishes the "About the job" step, well before
 * step 4 collects contact details. No price yet (tailored services
 * are priced manually by staff), so this is just answers + postcode +
 * email on a 'draft' quote_requests row.
 */
export async function saveTailoredQuoteDraft(input: {
  draftId: string | null;
  service: TailoredServiceSlug;
  answers: Record<string, string>;
  postcode: string;
  email: string;
}): Promise<SaveQuoteDraftResult> {
  const trimmedPostcode = input.postcode.trim();
  if (!trimmedPostcode) return { success: false, error: "Postcode is required" };
  const parsedEmail = emailSchema.safeParse(input.email.trim());
  if (!parsedEmail.success) return { success: false, error: "A valid email is required" };

  const admin = createAdminClient();
  const sessionClientId = await getSessionClientId();

  if (input.draftId) {
    const { data: existing } = await admin
      .from("quote_requests")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "draft")
      .maybeSingle();
    if (existing) {
      const draftClientId = sessionClientId ?? existing.client_id;
      if (draftClientId !== existing.client_id) {
        await admin.from("quote_requests").update({ client_id: draftClientId }).eq("id", input.draftId);
      } else {
        await admin.from("clients").update({ email: parsedEmail.data }).eq("id", existing.client_id);
      }
      const { error: updateError } = await admin
        .from("quote_requests")
        .update({
          service: input.service,
          postcode: trimmedPostcode,
          answers: input.answers as unknown as Json,
        })
        .eq("id", input.draftId);
      if (!updateError) {
        return { success: true, draftId: input.draftId, totalIncVat: 0 };
      }
      console.error("Failed to update tailored quote draft, creating a fresh one instead", updateError);
    }
  }

  let clientId: string;
  if (sessionClientId) {
    clientId = sessionClientId;
  } else {
    const { data: client, error: clientError } = await admin
      .from("clients")
      .insert({ email: parsedEmail.data })
      .select("id")
      .single();
    if (clientError || !client) {
      console.error("Failed to create client for tailored quote draft", clientError);
      return { success: false, error: "Unable to save your quote right now." };
    }
    clientId = client.id;
  }

  const resumeToken = randomUUID();

  const { data: quoteRequest, error: requestError } = await admin
    .from("quote_requests")
    .insert({
      client_id: clientId,
      status: "draft",
      service: input.service,
      postcode: trimmedPostcode,
      answers: input.answers as unknown as Json,
      resume_token: resumeToken,
    })
    .select("id, reference")
    .single();
  if (requestError || !quoteRequest) {
    console.error("Failed to create tailored quote draft", requestError);
    return { success: false, error: "Unable to save your quote right now." };
  }

  await sendDraftSavedEmail({
    email: parsedEmail.data,
    reference: quoteRequest.reference,
    resumeToken,
    subject: `Your ${TAILORED_SERVICE_TITLE[input.service]} request is saved (${quoteRequest.reference})`,
    bodyHtml: `
      <p>Hi,</p>
      <p>We've saved your <strong>${TAILORED_SERVICE_TITLE[input.service]}</strong> request so far. Reference <strong>${quoteRequest.reference}</strong>.</p>
      <p>Nothing's been sent to us yet -- pick up where you left off whenever you're ready to finish and send it.</p>
    `,
  });

  return { success: true, draftId: quoteRequest.id, totalIncVat: 0 };
}

const DRAFT_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export type ResolveQuoteDraftResult =
  | {
      success: true;
      draftId: string;
      email: string;
      postcode: string;
      instant: { service: QuoteServiceKey; selectedInputs: Json } | null;
      tailored: { service: TailoredServiceSlug; answers: Json } | null;
    }
  | { success: false; error: string };

/**
 * Phase C's magic-link landing page calls this once the customer has
 * re-entered their postcode -- the token alone (from the email link)
 * isn't trusted to restore anything; it has to match this specific
 * draft's postcode too, so a forwarded/leaked email can't be used by
 * someone who doesn't actually know the property's postcode. Checks
 * both tables since the link doesn't encode which kind of draft it is.
 * Same 14-day window as the client dashboard's "your quotes" will use
 * (Phase D) -- a draft this old is treated as expired here too, even
 * though nothing currently sweeps/deletes it at that point.
 */
export async function resolveQuoteDraftByToken(token: string, postcode: string): Promise<ResolveQuoteDraftResult> {
  const trimmedToken = token.trim();
  const trimmedPostcode = postcode.trim();
  if (!trimmedToken) return { success: false, error: "That link looks incomplete." };
  if (!trimmedPostcode) return { success: false, error: "Enter the postcode on your quote." };

  const admin = createAdminClient();
  const postcodeMatches = (a: string, b: string) => a.replace(/\s+/g, "").toUpperCase() === b.replace(/\s+/g, "").toUpperCase();

  const { data: cleaning } = await admin
    .from("cleanings")
    .select("id, client_id, status, service, postcode, property_answers, created_at")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (cleaning) {
    if (cleaning.status !== "quoted") {
      return { success: false, error: "This quote has already moved on -- sign in to your account to see it, or start a new one." };
    }
    if (Date.now() - new Date(cleaning.created_at).getTime() > DRAFT_EXPIRY_MS) {
      return { success: false, error: "This quote has expired. Please start a new one." };
    }
    if (!cleaning.postcode || !postcodeMatches(cleaning.postcode, trimmedPostcode)) {
      return { success: false, error: "That postcode doesn't match this quote." };
    }
    const { data: client } = await admin.from("clients").select("email").eq("id", cleaning.client_id).single();
    return {
      success: true,
      draftId: cleaning.id,
      email: client?.email ?? "",
      postcode: cleaning.postcode,
      instant: { service: cleaning.service as QuoteServiceKey, selectedInputs: cleaning.property_answers as Json },
      tailored: null,
    };
  }

  const { data: quoteRequest } = await admin
    .from("quote_requests")
    .select("id, client_id, status, service, postcode, answers, created_at")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (quoteRequest) {
    if (quoteRequest.status !== "draft") {
      return { success: false, error: "This request has already moved on -- sign in to your account to see it, or start a new one." };
    }
    if (Date.now() - new Date(quoteRequest.created_at).getTime() > DRAFT_EXPIRY_MS) {
      return { success: false, error: "This request has expired. Please start a new one." };
    }
    if (!postcodeMatches(quoteRequest.postcode, trimmedPostcode)) {
      return { success: false, error: "That postcode doesn't match this request." };
    }
    const { data: client } = await admin.from("clients").select("email").eq("id", quoteRequest.client_id).single();
    return {
      success: true,
      draftId: quoteRequest.id,
      email: client?.email ?? "",
      postcode: quoteRequest.postcode,
      instant: null,
      tailored: { service: quoteRequest.service as TailoredServiceSlug, answers: quoteRequest.answers as Json },
    };
  }

  return { success: false, error: "We couldn't find that quote." };
}

/**
 * Which of the 3 arrival windows have at least one available cleaner,
 * per date, across a range -- powers both the "when" step's calendar
 * (whole months at a time) and its window picker (a single date).
 * Reuses getCleanerScheduleGrid() (the admin Schedule page's own data
 * source) rather than a separate implementation, but strips cleaner
 * identities out of what's returned here -- this is a public action,
 * nothing about which named cleaner is free should leave the server.
 */
export async function getQuoteWindowAvailability(
  startIso: string,
  days: number
): Promise<Record<string, ArrivalWindowKey[]>> {
  const { cells } = await getCleanerScheduleGrid(startIso, days);
  const result: Record<string, ArrivalWindowKey[]> = {};
  // Seed every date in range with an empty array first -- a date with
  // zero available cells must still appear as a key (with []), not be
  // missing entirely, or callers computing "which dates are
  // unavailable" from Object.entries() would never see a fully-booked
  // date at all (cells always covers every cleaner x date x window
  // combination regardless of state, so this loop sees every date).
  for (const cell of cells) {
    result[cell.date] ??= [];
  }
  for (const cell of cells) {
    if (cell.state !== "available") continue;
    if (!result[cell.date].includes(cell.windowKey)) result[cell.date].push(cell.windowKey);
  }
  return result;
}

export interface QuoteCleanerOption {
  id: string;
  firstName: string;
}

/**
 * The cleaner-picker step's option list -- every cleaner free for the
 * requested date+window (or, when flexible, free for *any* window
 * that day, unioned). Only a first name is returned, never the full
 * identity (name/email) listAvailableCleanersForSlot() itself holds --
 * this is public-facing.
 */
export async function getAvailableCleanersForQuote(
  date: string,
  windowKey: ArrivalWindowKey | null,
  isFlexible: boolean
): Promise<QuoteCleanerOption[]> {
  const windowsToCheck = isFlexible || !windowKey ? WINDOW_ORDER : [windowKey];
  const perWindow = await Promise.all(windowsToCheck.map((w) => listAvailableCleanersForSlot(date, w)));

  const byId = new Map<string, QuoteCleanerOption>();
  for (const list of perWindow) {
    for (const cleaner of list) {
      if (!byId.has(cleaner.id)) {
        byId.set(cleaner.id, { id: cleaner.id, firstName: (cleaner.fullName ?? "Our team").split(" ")[0] });
      }
    }
  }
  return Array.from(byId.values());
}

export type SubmitInstantQuoteResult =
  | {
      success: true;
      reference: string;
      cleaningId: string;
      totalIncVat: number;
    }
  | { success: false; error: string };

/**
 * Step 4's "Request this booking" for an instant-price service. Unlike
 * the old quote_bookings flow, this creates the Cleaning row directly
 * in 'awaiting_confirmation' (quote-handoff QUOTE_HANDOFF.md's
 * "Integration with the existing app"). cleaner_id is now resolved and
 * locked in right here too, via resolveBookingCleaner() -- re-checked
 * against live availability at this exact moment rather than trusting
 * whatever the cleaner-picker step showed earlier, since time has
 * passed and someone else could have taken the slot. Admin's "Confirm
 * & schedule" still runs afterwards (supervisor + exact time +
 * checklist aren't decided here), it'll just show this cleaner
 * pre-selected instead of empty. The price is recomputed server-side
 * from a fresh rate card and location resolution, never trusted from
 * the client, and stored as price_breakdown exactly as quoted -- it's
 * never recalculated again after this point.
 */
export async function submitInstantQuoteRequest(input: {
  draftId: string | null;
  service: QuoteServiceKey;
  selectedInputs: EndOfTenancyInput | DeepCleaningInput | OfficeCleaningInput;
  postcode: string;
  requestedDate: string;
  requestedWindow: ArrivalWindowKey | null;
  isFlexible: boolean;
  /** The cleaner-picker step's choice -- "specific" tries cleanerId
   *  first (falling back to a random pick if they're no longer free
   *  by submission time), "any"/null picks randomly among whoever's
   *  available. See resolveBookingCleaner(). */
  cleanerId: string | null;
  cleanerChoice: "specific" | "any" | null;
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  accessMethod: AccessMethod | null;
  accessNotes: string;
  marketingConsent: boolean;
  trackOnline: boolean;
  honeypot?: string;
}): Promise<SubmitInstantQuoteResult> {
  if (input.honeypot) {
    return { success: true, reference: "SWC-0000", cleaningId: "", totalIncVat: 0 };
  }

  const parsedContact = instantContactSchema.safeParse({
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  if (!parsedContact.success) {
    return { success: false, error: parsedContact.error.issues[0].message };
  }

  const trimmedPostcode = input.postcode.trim();
  if (!trimmedPostcode) return { success: false, error: "Postcode is required" };
  if (!input.requestedDate) return { success: false, error: "Pick a date" };
  if (!input.requestedWindow && !input.isFlexible) {
    return { success: false, error: "Pick an arrival window, or tell us you're flexible" };
  }

  let rateCard: RateCard;
  try {
    rateCard = await getRateCard();
  } catch (e) {
    console.error("Failed to load rate card for instant quote submission", e);
    return { success: false, error: "Unable to process your request right now. Please try again." };
  }

  const location = await resolveLocationMultiplier(trimmedPostcode);
  const breakdown = computeInstantBreakdown(input.service, input.selectedInputs, rateCard, location);

  const admin = createAdminClient();
  const sessionClientId = await getSessionClientId();

  // Only affects the confirmation email's "track online" paragraph
  // below -- an already-registered customer doesn't need to be told
  // to set a password, just to sign in.
  const { data: emailAlreadyRegistered } = await admin.rpc("email_exists", {
    check_email: parsedContact.data.email,
  });

  const fullAddress = [input.addressLine.trim(), trimmedPostcode].filter(Boolean).join(", ");

  // Re-resolved here, not trusted from the cleaner-picker step's own
  // (now possibly stale) snapshot of who was available -- see this
  // function's own doc comment. A flexible booking's resolved window
  // (if a match was found) gives it a real time instead of the old
  // meaningless default; requestedWindow/isFlexible themselves still
  // reflect what the customer actually said, unchanged.
  const resolvedBooking = await resolveBookingCleaner(
    input.requestedDate,
    input.requestedWindow,
    input.isFlexible,
    input.cleanerChoice === "specific" ? input.cleanerId : null
  );
  const effectiveWindow = resolvedBooking.windowKey ?? input.requestedWindow;
  const startTime = effectiveWindow ? WINDOW_START_TIME[effectiveWindow] : "09:00";
  const scheduledAt = new Date(`${input.requestedDate}T${startTime}:00`);

  // If this session already has a 'quoted' draft (saveInstantQuoteDraft,
  // called when leaving the property step), finish that same row --
  // filling in the client's name/phone/address and moving the status
  // on -- instead of creating a second client/cleaning pair. Falls
  // back to a fresh insert if the draft can't be found/reused, same
  // fail-soft shape as everywhere else in this flow.
  let cleaning: { id: string; reference: string } | null = null;
  if (input.draftId) {
    const { data: existing } = await admin
      .from("cleanings")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "quoted")
      .maybeSingle();
    if (existing) {
      // An already-logged-in customer's name/phone stay authoritative
      // from their account (never overwritten by submitted values --
      // the details step locks those fields, but this is the server-
      // side backstop); address is job-specific and always updated.
      const draftClientId = sessionClientId ?? existing.client_id;
      const clientUpdate = sessionClientId
        ? { address: fullAddress || null }
        : {
            full_name: parsedContact.data.name,
            email: parsedContact.data.email,
            phone: parsedContact.data.phone,
            address: fullAddress || null,
          };
      const { error: clientUpdateError } = await admin.from("clients").update(clientUpdate).eq("id", draftClientId);
      if (!clientUpdateError) {
        const { data: updated, error: cleaningUpdateError } = await admin
          .from("cleanings")
          .update({
            client_id: draftClientId,
            cleaner_id: resolvedBooking.cleanerId,
            status: "awaiting_confirmation",
            scheduled_at: scheduledAt.toISOString(),
            requested_date: input.requestedDate,
            requested_window: input.requestedWindow,
            is_flexible: input.isFlexible,
            access_method: input.accessMethod,
            access_notes: input.accessNotes.trim() || null,
            marketing_consent: input.marketingConsent,
            service: input.service,
            postcode: trimmedPostcode,
            property_answers: input.selectedInputs as unknown as Json,
            price_breakdown: breakdown as unknown as Json,
            notes: `Booked via the website quote journey (${input.service}).`,
          })
          .eq("id", input.draftId)
          .select("id, reference")
          .single();
        if (!cleaningUpdateError && updated) cleaning = updated;
        else console.error("Failed to finalize quote draft, creating a fresh cleaning instead", cleaningUpdateError);
      } else {
        console.error("Failed to update draft's client, creating a fresh cleaning instead", clientUpdateError);
      }
    }
  }

  if (!cleaning) {
    let clientId: string;
    if (sessionClientId) {
      await admin.from("clients").update({ address: fullAddress || null }).eq("id", sessionClientId);
      clientId = sessionClientId;
    } else {
      const { data: client, error: clientError } = await admin
        .from("clients")
        .insert({
          full_name: parsedContact.data.name,
          email: parsedContact.data.email,
          phone: parsedContact.data.phone,
          address: fullAddress || null,
        })
        .select("id")
        .single();
      if (clientError || !client) {
        console.error("Failed to create client for instant quote request", clientError);
        return { success: false, error: "Unable to process your request right now. Please try again." };
      }
      clientId = client.id;
    }

    const { data: inserted, error: cleaningError } = await admin
      .from("cleanings")
      .insert({
        client_id: clientId,
        cleaner_id: resolvedBooking.cleanerId,
        status: "awaiting_confirmation",
        scheduled_at: scheduledAt.toISOString(),
        requested_date: input.requestedDate,
        requested_window: input.requestedWindow,
        is_flexible: input.isFlexible,
        access_method: input.accessMethod,
        access_notes: input.accessNotes.trim() || null,
        marketing_consent: input.marketingConsent,
        source: "website_quote",
        service: input.service,
        postcode: trimmedPostcode,
        property_answers: input.selectedInputs as unknown as Json,
        price_breakdown: breakdown as unknown as Json,
        notes: `Booked via the website quote journey (${input.service}).`,
      })
      .select("id, reference")
      .single();
    if (cleaningError || !inserted) {
      console.error("Failed to create cleaning for instant quote request", cleaningError);
      return { success: false, error: "Unable to process your request right now. Please try again." };
    }
    cleaning = inserted;
  }

  const reference = cleaning.reference;
  const dateLabel = new Date(`${input.requestedDate}T00:00:00`).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const windowLabel = input.isFlexible
    ? "Any time that day"
    : input.requestedWindow
      ? `${input.requestedWindow[0].toUpperCase()}${input.requestedWindow.slice(1)}, ${WINDOW_START_TIME[input.requestedWindow]}`
      : "";

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: parsedContact.data.email,
      subject: `We've received your booking request (${reference})`,
      html: `
        <p>Hi ${parsedContact.data.name},</p>
        <p>Thanks -- your request is in. Reference <strong>${reference}</strong>.</p>
        <p><strong>${SERVICE_TITLE[input.service]}</strong><br>
        Requested for: ${dateLabel}${windowLabel ? ` · ${windowLabel}` : ""}<br>
        Total: £${breakdown.totalIncVat.toFixed(2)} (inc. VAT)</p>
        <p>We'll confirm your date within ${CONFIRMATION_WINDOW_HOURS} hours. No payment is needed now.</p>
        ${
          input.trackOnline
            ? emailAlreadyRegistered
              ? `<p>Want to track this clean online? <a href="https://sovereignwaycleaners.co.uk/login">Sign in</a> with this email address to follow progress, photos and results.</p>`
              : `<p>Want to track this clean online? <a href="https://sovereignwaycleaners.co.uk/login">Set a password</a> using this email address to follow progress, photos and results.</p>`
            : ""
        }
        <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong>.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send instant quote confirmation email", e);
  }

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin");

  return {
    success: true,
    reference,
    cleaningId: cleaning.id,
    totalIncVat: breakdown.totalIncVat,
  };
}

const MAX_TAILORED_PHOTO_BYTES = 10 * 1024 * 1024;

export type UploadTailoredPhotoResult =
  | { success: true; storagePath: string }
  | { success: false; error: string };

/**
 * Uploads one "About the job" photo immediately on selection, under a
 * client-generated groupId (QuoteState.tailoredPhotoGroupId) rather than
 * a quote_requests id that doesn't exist yet -- the tailored flow's File
 * objects can't live in sessionStorage, so uploading eagerly and keeping
 * only the small storage_path string is what survives a refresh.
 * submitTailoredQuoteRequest() links these paths to the real row once
 * it's created; an abandoned journey just leaves orphaned objects in a
 * private bucket, never referenced by any photos row.
 */
export async function uploadTailoredPhoto(groupId: string, formData: FormData): Promise<UploadTailoredPhotoResult> {
  const file = formData.get("file");
  if (!(file instanceof File)) return { success: false, error: "No file provided" };
  if (file.size > MAX_TAILORED_PHOTO_BYTES) return { success: false, error: "Photo is too large (max 10MB)" };
  if (!groupId) return { success: false, error: "Missing photo group" };

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const storagePath = `pending/${groupId}/${randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const { error } = await admin.storage.from("quote-request-photos").upload(storagePath, file, {
    contentType: file.type,
  });
  if (error) return { success: false, error: error.message };

  return { success: true, storagePath };
}

export async function deleteTailoredPhoto(storagePath: string): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from("quote-request-photos").remove([storagePath]);
}

const tailoredContactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: z.string().transform(normalizeUkPhone).pipe(requiredPhoneSchema),
});

const TAILORED_SERVICE_TITLE: Record<TailoredServiceSlug, string> = {
  domestic_cleaning: "Domestic Cleaning",
  commercial_cleaning: "Commercial Cleaning",
  carpet_cleaning: "Carpet Cleaning",
  after_build_clean: "After Build Clean",
  builders_sparkle_clean: "Builders & Sparkle Clean",
  move_in_out: "Move In / Out Cleaning",
};

export type SubmitTailoredQuoteResult =
  | { success: true; reference: string }
  | { success: false; error: string };

/**
 * The tailored-quote path's step 4 submission -- no price or date, per
 * quote-handoff QUOTE_HANDOFF.md. Creates a quote_requests row (status
 * 'awaiting_quote'), links any already-uploaded photos to it, and emails
 * the customer the "24 hours" copy. Admin's "Send quote" action (a later
 * build step) is what eventually prices it.
 */
export async function submitTailoredQuoteRequest(input: {
  draftId: string | null;
  service: TailoredServiceSlug;
  answers: Record<string, string>;
  notes: string;
  photoStoragePaths: string[];
  postcode: string;
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  marketingConsent: boolean;
  honeypot?: string;
}): Promise<SubmitTailoredQuoteResult> {
  if (input.honeypot) {
    return { success: true, reference: "SWC-0000" };
  }

  const parsedContact = tailoredContactSchema.safeParse({
    name: input.name,
    email: input.email,
    phone: input.phone,
  });
  if (!parsedContact.success) {
    return { success: false, error: parsedContact.error.issues[0].message };
  }

  const trimmedPostcode = input.postcode.trim();
  if (!trimmedPostcode) return { success: false, error: "Postcode is required" };

  const admin = createAdminClient();
  const sessionClientId = await getSessionClientId();
  const fullAddress = [input.addressLine.trim(), trimmedPostcode].filter(Boolean).join(", ");

  // Same draft-reuse shape as submitInstantQuoteRequest: finish the
  // 'draft' row saveTailoredQuoteDraft created when the customer left
  // the "About the job" step, instead of creating a second client +
  // quote_requests pair. Falls back to a fresh insert if it can't be
  // reused.
  let quoteRequest: { id: string; reference: string } | null = null;
  if (input.draftId) {
    const { data: existing } = await admin
      .from("quote_requests")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "draft")
      .maybeSingle();
    if (existing) {
      // An already-logged-in customer's name/phone stay authoritative
      // from their account; address is job-specific and always updated.
      const draftClientId = sessionClientId ?? existing.client_id;
      const clientUpdate = sessionClientId
        ? { address: fullAddress || null }
        : {
            full_name: parsedContact.data.name,
            email: parsedContact.data.email,
            phone: parsedContact.data.phone,
            address: fullAddress || null,
          };
      const { error: clientUpdateError } = await admin.from("clients").update(clientUpdate).eq("id", draftClientId);
      if (!clientUpdateError) {
        const { data: updated, error: requestUpdateError } = await admin
          .from("quote_requests")
          .update({
            client_id: draftClientId,
            status: "awaiting_quote",
            service: input.service,
            postcode: trimmedPostcode,
            answers: input.answers as unknown as Json,
            notes: input.notes.trim() || null,
            marketing_consent: input.marketingConsent,
          })
          .eq("id", input.draftId)
          .select("id, reference")
          .single();
        if (!requestUpdateError && updated) quoteRequest = updated;
        else console.error("Failed to finalize tailored draft, creating a fresh request instead", requestUpdateError);
      } else {
        console.error("Failed to update draft's client, creating a fresh request instead", clientUpdateError);
      }
    }
  }

  if (!quoteRequest) {
    let clientId: string;
    if (sessionClientId) {
      await admin.from("clients").update({ address: fullAddress || null }).eq("id", sessionClientId);
      clientId = sessionClientId;
    } else {
      const { data: client, error: clientError } = await admin
        .from("clients")
        .insert({
          full_name: parsedContact.data.name,
          email: parsedContact.data.email,
          phone: parsedContact.data.phone,
          address: fullAddress || null,
        })
        .select("id")
        .single();
      if (clientError || !client) {
        console.error("Failed to create client for tailored quote request", clientError);
        return { success: false, error: "Unable to process your request right now. Please try again." };
      }
      clientId = client.id;
    }

    const { data: inserted, error: requestError } = await admin
      .from("quote_requests")
      .insert({
        service: input.service,
        client_id: clientId,
        postcode: trimmedPostcode,
        answers: input.answers as unknown as Json,
        notes: input.notes.trim() || null,
        marketing_consent: input.marketingConsent,
        // Guarantees the "quoted" email's accept/decline link
        // (getQuoteResponseByToken) always has a token to use, even
        // for a request that never passed through the draft-save step.
        resume_token: randomUUID(),
      })
      .select("id, reference")
      .single();
    if (requestError || !inserted) {
      console.error("Failed to create tailored quote request", requestError);
      return { success: false, error: "Unable to process your request right now. Please try again." };
    }
    quoteRequest = inserted;
  }

  if (input.photoStoragePaths.length > 0) {
    const { error: photosError } = await admin.from("quote_request_photos").insert(
      input.photoStoragePaths.map((storagePath) => ({
        quote_request_id: quoteRequest.id,
        storage_path: storagePath,
      }))
    );
    if (photosError) {
      console.error("Failed to link photos to tailored quote request", photosError);
    }
  }

  const reference = quoteRequest.reference;

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: parsedContact.data.email,
      subject: `We've received your ${TAILORED_SERVICE_TITLE[input.service]} request (${reference})`,
      html: `
        <p>Hi ${parsedContact.data.name},</p>
        <p>Thanks -- we've got your request. Reference <strong>${reference}</strong>.</p>
        <p><strong>${TAILORED_SERVICE_TITLE[input.service]}</strong></p>
        <p>We'll email your tailored price within 24 hours.</p>
        <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong>.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send tailored quote confirmation email", e);
  }

  revalidatePath("/dashboard/admin/quote-requests");

  return { success: true, reference };
}

export interface QuoteResponseDetail {
  reference: string;
  serviceTitle: string;
  quotedPrice: number;
  status: "draft" | "awaiting_quote" | "quoted" | "declined" | "converted";
  clientName: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
}

export type GetQuoteResponseResult =
  | { success: true; detail: QuoteResponseDetail }
  | { success: false; error: string };

function postcodesMatch(a: string, b: string): boolean {
  return a.replace(/\s+/g, "").toLowerCase() === b.replace(/\s+/g, "").toLowerCase();
}

/**
 * Looks up a tailored quote request by the magic-link token from the
 * "quoted" email, same ownership check as resolveQuoteDraftByToken
 * (token alone isn't trusted -- it has to match this request's own
 * postcode too). Returns the request regardless of its current status
 * so the response page can show "already responded to" instead of a
 * bare error once it's been accepted/declined.
 */
export async function getQuoteResponseByToken(token: string, postcode: string): Promise<GetQuoteResponseResult> {
  const trimmedToken = token.trim();
  const trimmedPostcode = postcode.trim();
  if (!trimmedToken) return { success: false, error: "That link looks incomplete. Please use the link from your email." };
  if (!trimmedPostcode) return { success: false, error: "Enter the postcode from your quote." };

  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from("quote_requests")
    .select("reference, service, client_id, postcode, status, quoted_price")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (error || !request) return { success: false, error: "We couldn't find that quote." };
  if (!postcodesMatch(request.postcode, trimmedPostcode)) {
    return { success: false, error: "That postcode doesn't match our records." };
  }

  const { data: client } = await admin
    .from("clients")
    .select("full_name, phone, address")
    .eq("id", request.client_id)
    .single();

  // The stored address is "<street>, <postcode>" (built that way by
  // submitTailoredQuoteRequest). acceptQuoteRequest re-appends the
  // postcode to whatever the customer submits here, so the prefill
  // must strip it back off first -- otherwise an unedited accept
  // doubles it up ("...Street, SW1A 1AA, SW1A 1AA").
  const addressSuffix = `, ${request.postcode}`;
  const clientAddressLine =
    client?.address && client.address.toLowerCase().endsWith(addressSuffix.toLowerCase())
      ? client.address.slice(0, -addressSuffix.length)
      : (client?.address ?? null);

  return {
    success: true,
    detail: {
      reference: request.reference,
      serviceTitle: TAILORED_SERVICE_TITLE[request.service] ?? request.service,
      quotedPrice: request.quoted_price ?? 0,
      status: request.status,
      clientName: client?.full_name ?? null,
      clientPhone: client?.phone ?? null,
      clientAddress: clientAddressLine,
    },
  };
}

export type QuoteResponseActionResult = { success: true } | { success: false; error: string };

/**
 * Customer accepts a priced tailored quote. Collects the one thing
 * never asked for earlier in the journey -- a preferred date/window,
 * since the 6 tailored services have no calendar step -- and turns the
 * request into a real `cleanings` row at 'awaiting_confirmation', the
 * exact same status an instant-quote booking lands at. From there
 * admin's existing "Confirm & schedule" action (confirmCleaningRequest)
 * takes over -- no new admin scheduling UI needed.
 */
export async function acceptQuoteRequest(input: {
  token: string;
  postcode: string;
  phone: string;
  addressLine: string;
  requestedDate: string;
  requestedWindow: ArrivalWindowKey | null;
  isFlexible: boolean;
}): Promise<QuoteResponseActionResult> {
  const trimmedToken = input.token.trim();
  const trimmedPostcode = input.postcode.trim();
  if (!trimmedToken || !trimmedPostcode) {
    return { success: false, error: "That link looks incomplete. Please use the link from your email." };
  }
  if (!input.requestedDate) return { success: false, error: "Pick a date" };
  if (!input.requestedWindow && !input.isFlexible) {
    return { success: false, error: "Pick an arrival window, or tell us you're flexible" };
  }
  const parsedPhone = z.string().transform(normalizeUkPhone).pipe(requiredPhoneSchema).safeParse(input.phone);
  if (!parsedPhone.success) return { success: false, error: "Enter a valid UK phone number" };
  if (!input.addressLine.trim()) return { success: false, error: "Enter your address" };

  const admin = createAdminClient();
  const { data: request, error: fetchError } = await admin
    .from("quote_requests")
    .select("id, reference, service, client_id, postcode, status, quoted_price")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (fetchError || !request) return { success: false, error: "We couldn't find that quote." };
  if (!postcodesMatch(request.postcode, trimmedPostcode)) {
    return { success: false, error: "That postcode doesn't match our records." };
  }
  if (request.status !== "quoted") {
    return { success: false, error: "This quote has already been responded to." };
  }

  const fullAddress = [input.addressLine.trim(), request.postcode].filter(Boolean).join(", ");
  await admin
    .from("clients")
    .update({ phone: parsedPhone.data, address: fullAddress })
    .eq("id", request.client_id);

  const startTime = input.requestedWindow ? WINDOW_START_TIME[input.requestedWindow] : "09:00";
  const scheduledAt = new Date(`${input.requestedDate}T${startTime}:00`);

  const breakdown = {
    lineItems: [{ label: TAILORED_SERVICE_TITLE[request.service] ?? request.service, amount: request.quoted_price ?? 0 }],
    subtotalExVat: request.quoted_price ?? 0,
    vatAmount: 0,
    totalIncVat: request.quoted_price ?? 0,
    locationLabel: "",
  };

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .insert({
      client_id: request.client_id,
      status: "awaiting_confirmation",
      scheduled_at: scheduledAt.toISOString(),
      requested_date: input.requestedDate,
      requested_window: input.requestedWindow,
      is_flexible: input.isFlexible,
      source: "website_quote",
      service: request.service,
      postcode: request.postcode,
      price_breakdown: breakdown as unknown as Json,
      notes: `Accepted tailored quote ${request.reference}.`,
    })
    .select("id, reference")
    .single();
  if (cleaningError || !cleaning) {
    console.error("Failed to create cleaning from accepted quote request", cleaningError);
    return { success: false, error: "Unable to process this right now. Please try again." };
  }

  const { error: updateError } = await admin
    .from("quote_requests")
    .update({ status: "converted", cleaning_id: cleaning.id })
    .eq("id", request.id);
  if (updateError) {
    console.error("Failed to mark quote request as converted", updateError);
  }

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", request.client_id).single();
  if (client?.email) {
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: `You're booked in! (${cleaning.reference})`,
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Thanks for confirming -- your <strong>${TAILORED_SERVICE_TITLE[request.service] ?? request.service}</strong> is booked for <strong>£${(request.quoted_price ?? 0).toFixed(2)}</strong>. Reference <strong>${cleaning.reference}</strong>.</p>
          <p>We'll confirm your exact date and time within ${CONFIRMATION_WINDOW_HOURS} hours. No payment is needed now.</p>
          <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong>.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send tailored-quote acceptance email", e);
    }
  }

  revalidatePath("/dashboard/admin/quote-requests");
  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/client");

  return { success: true };
}

/**
 * Customer declines a priced tailored quote. A reason is optional here
 * (unlike admin's own decline, which requires one to tell the customer
 * why) -- the customer doesn't owe anyone an explanation to say no.
 */
export async function declineQuoteRequestByCustomer(input: {
  token: string;
  postcode: string;
  reason: string;
}): Promise<QuoteResponseActionResult> {
  const trimmedToken = input.token.trim();
  const trimmedPostcode = input.postcode.trim();
  if (!trimmedToken || !trimmedPostcode) {
    return { success: false, error: "That link looks incomplete. Please use the link from your email." };
  }

  const admin = createAdminClient();
  const { data: request, error: fetchError } = await admin
    .from("quote_requests")
    .select("id, postcode, status")
    .eq("resume_token", trimmedToken)
    .maybeSingle();
  if (fetchError || !request) return { success: false, error: "We couldn't find that quote." };
  if (!postcodesMatch(request.postcode, trimmedPostcode)) {
    return { success: false, error: "That postcode doesn't match our records." };
  }
  if (request.status !== "quoted") {
    return { success: false, error: "This quote has already been responded to." };
  }

  const { error: updateError } = await admin
    .from("quote_requests")
    .update({ status: "declined", decline_reason: input.reason.trim() || "Declined by customer" })
    .eq("id", request.id);
  if (updateError) return { success: false, error: updateError.message };

  revalidatePath("/dashboard/admin/quote-requests");
  revalidatePath("/dashboard/client");

  return { success: true };
}
