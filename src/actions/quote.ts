"use server";

import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { getRateCard, type RateCard } from "@/lib/rate-card";
import { lookupPostcode } from "@/lib/postcode-lookup";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { nameSchema, emailSchema, phoneSchema } from "@/lib/validation";
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

const bookingContactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export type SubmitBookingResult = { success: true } | { success: false; error: string };

/**
 * Persists a booking from the quote wizard's final step. Never trusts a
 * client-submitted price -- recomputes it server-side from a fresh rate
 * card and a fresh location resolution, using the same pure calculate*
 * functions the live preview uses, so the stored price_breakdown can't
 * be tampered with from the browser.
 */
export async function submitBooking(input: {
  service: QuoteServiceKey;
  selectedInputs: EndOfTenancyInput | DeepCleaningInput | OfficeCleaningInput;
  postcode: string;
  name: string;
  email: string;
  phone?: string;
  honeypot?: string;
}): Promise<SubmitBookingResult> {
  if (input.honeypot) {
    // Pretend success so a bot filling the hidden field doesn't learn it was caught.
    return { success: true };
  }

  const parsed = bookingContactSchema.safeParse({
    name: input.name,
    email: input.email,
    phone: input.phone || undefined,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const trimmedPostcode = input.postcode.trim();
  if (!trimmedPostcode) {
    return { success: false, error: "Postcode is required" };
  }

  let rateCard: RateCard;
  try {
    rateCard = await getRateCard();
  } catch (e) {
    console.error("Failed to load rate card for booking submission", e);
    return { success: false, error: "Unable to process your booking right now. Please try again." };
  }

  const location = await resolveLocationMultiplier(trimmedPostcode);

  let breakdown: QuoteBreakdown;
  if (input.service === "end_of_tenancy") {
    breakdown = calculateEndOfTenancy(
      input.selectedInputs as EndOfTenancyInput,
      rateCard,
      location.multiplier,
      location.label
    );
  } else if (input.service === "deep_cleaning") {
    breakdown = calculateDeepCleaning(
      input.selectedInputs as DeepCleaningInput,
      rateCard,
      location.multiplier,
      location.label
    );
  } else {
    breakdown = calculateOfficeCleaning(
      input.selectedInputs as OfficeCleaningInput,
      rateCard,
      location.multiplier,
      location.label
    );
  }

  const admin = createAdminClient();

  const { data: client, error: clientError } = await admin
    .from("clients")
    .insert({
      full_name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
    })
    .select("id")
    .single();
  if (clientError || !client) {
    console.error("Failed to create client for booking", clientError);
    return { success: false, error: "Unable to process your booking right now. Please try again." };
  }

  const { error: bookingError } = await admin.from("quote_bookings").insert({
    service: input.service,
    client_id: client.id,
    postcode: trimmedPostcode,
    selected_inputs: input.selectedInputs as unknown as Json,
    price_breakdown: breakdown as unknown as Json,
  });
  if (bookingError) {
    console.error("Failed to create booking", bookingError);
    return { success: false, error: "Unable to process your booking right now. Please try again." };
  }

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: parsed.data.email,
      subject: "We've received your booking request",
      html: `
        <p>Hi ${parsed.data.name},</p>
        <p>Thank you for booking with us! We've received your request and will be in touch shortly to confirm the details.</p>
        <p><strong>Estimated total: £${breakdown.totalIncVat.toFixed(2)} (inc. VAT)</strong></p>
        <p>If you need to reach us in the meantime, you can call us on <strong>01732 711856</strong> or WhatsApp us on <strong>07445 109813</strong>.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send booking confirmation email", e);
  }

  revalidatePath("/dashboard/admin/bookings");
  return { success: true };
}
