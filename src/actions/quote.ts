"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getRateCard, type RateCard } from "@/lib/rate-card";
import { lookupPostcode } from "@/lib/postcode-lookup";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { nameSchema, emailSchema, requiredPhoneSchema } from "@/lib/validation";
import { normalizeUkPhone } from "@/lib/quote-phone";
import type { ArrivalWindowKey, AccessMethod } from "@/lib/quote-state";
import { CONFIRMATION_WINDOW_HOURS, type TailoredServiceSlug } from "@/lib/quote-config";
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
  covered: boolean;
  /** The recognized outward code (e.g. "N12"), shown in the "we clean in ..." message. */
  area: string | null;
}

/**
 * Step 1's coverage check. There's no real "do we serve this area"
 * business rule anywhere in the app today -- every postcode already
 * resolves to a price via resolveLocationMultiplier()'s default-rate
 * fallback. So "covered" here just means "this is a valid, recognized
 * UK postcode" (via the same postcodes.io lookup already used for
 * pricing) -- it's purely an informational, non-blocking message, not
 * a gate. Swap this for a real allow/deny table if the business ever
 * wants one.
 */
export async function checkPostcodeCoverage(postcode: string): Promise<PostcodeCoverageResult> {
  const trimmed = postcode.trim();
  if (!trimmed) return { covered: false, area: null };

  const geo = await lookupPostcode(trimmed);
  if (!geo) return { covered: false, area: null };

  // A UK postcode's inward code (the part after the space) is always
  // exactly 3 characters -- everything before that is the outward code
  // (e.g. "N12", "SE1", "SW1A") shown in the "we clean in ..." message.
  const compact = trimmed.toUpperCase().replace(/\s+/g, "");
  const outwardCode = compact.length > 3 ? compact.slice(0, -3) : geo.postcodeArea;
  return { covered: true, area: outwardCode };
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

  const geo = await lookupPostcode(postcode);
  if (!geo) return resolvedDefault;

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

  if (input.draftId) {
    const { data: existing } = await admin
      .from("cleanings")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "quoted")
      .maybeSingle();
    if (existing) {
      await admin.from("clients").update({ email: parsedEmail.data }).eq("id", existing.client_id);
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

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ email: parsedEmail.data })
    .select("id")
    .single();
  if (clientError || !client) {
    console.error("Failed to create client for quote draft", clientError);
    return { success: false, error: "Unable to save your quote right now." };
  }

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .insert({
      client_id: client.id,
      status: "quoted",
      service: input.service,
      postcode: trimmedPostcode,
      property_answers: input.selectedInputs as unknown as Json,
      price_breakdown: breakdown as unknown as Json,
      source: "website_quote",
    })
    .select("id")
    .single();
  if (cleaningError || !cleaning) {
    console.error("Failed to create quote draft", cleaningError);
    return { success: false, error: "Unable to save your quote right now." };
  }

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

  if (input.draftId) {
    const { data: existing } = await admin
      .from("quote_requests")
      .select("id, client_id")
      .eq("id", input.draftId)
      .eq("status", "draft")
      .maybeSingle();
    if (existing) {
      await admin.from("clients").update({ email: parsedEmail.data }).eq("id", existing.client_id);
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

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({ email: parsedEmail.data })
    .select("id")
    .single();
  if (clientError || !client) {
    console.error("Failed to create client for tailored quote draft", clientError);
    return { success: false, error: "Unable to save your quote right now." };
  }

  const { data: quoteRequest, error: requestError } = await admin
    .from("quote_requests")
    .insert({
      client_id: client.id,
      status: "draft",
      service: input.service,
      postcode: trimmedPostcode,
      answers: input.answers as unknown as Json,
    })
    .select("id")
    .single();
  if (requestError || !quoteRequest) {
    console.error("Failed to create tailored quote draft", requestError);
    return { success: false, error: "Unable to save your quote right now." };
  }

  return { success: true, draftId: quoteRequest.id, totalIncVat: 0 };
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
 * "Integration with the existing app") -- admin's "Confirm & schedule"
 * fills in cleaner_id/supervisor_id/the checklist later, it doesn't
 * create a second row. The price is recomputed server-side from a
 * fresh rate card and location resolution, never trusted from the
 * client, and stored as price_breakdown exactly as quoted -- it's
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

  const fullAddress = [input.addressLine.trim(), trimmedPostcode].filter(Boolean).join(", ");
  const startTime = input.requestedWindow ? WINDOW_START_TIME[input.requestedWindow] : "09:00";
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
      const { error: clientUpdateError } = await admin
        .from("clients")
        .update({
          full_name: parsedContact.data.name,
          email: parsedContact.data.email,
          phone: parsedContact.data.phone,
          address: fullAddress || null,
        })
        .eq("id", existing.client_id);
      if (!clientUpdateError) {
        const { data: updated, error: cleaningUpdateError } = await admin
          .from("cleanings")
          .update({
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

    const { data: inserted, error: cleaningError } = await admin
      .from("cleanings")
      .insert({
        client_id: client.id,
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
            ? `<p>Want to track this clean online? <a href="https://sovereignwaycleaners.co.uk/login">Set a password</a> using this email address to follow progress, photos and results.</p>`
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
      const { error: clientUpdateError } = await admin
        .from("clients")
        .update({
          full_name: parsedContact.data.name,
          email: parsedContact.data.email,
          phone: parsedContact.data.phone,
          address: fullAddress || null,
        })
        .eq("id", existing.client_id);
      if (!clientUpdateError) {
        const { data: updated, error: requestUpdateError } = await admin
          .from("quote_requests")
          .update({
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

    const { data: inserted, error: requestError } = await admin
      .from("quote_requests")
      .insert({
        service: input.service,
        client_id: client.id,
        postcode: trimmedPostcode,
        answers: input.answers as unknown as Json,
        notes: input.notes.trim() || null,
        marketing_consent: input.marketingConsent,
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

  revalidatePath("/dashboard/admin/enquiries");

  return { success: true, reference };
}
