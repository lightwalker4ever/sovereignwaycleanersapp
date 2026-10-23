"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedPhotoUrls } from "@/lib/photos";

const resend = new Resend(process.env.RESEND_API_KEY);

const SERVICE_TITLE: Record<string, string> = {
  domestic_cleaning: "Domestic Cleaning",
  commercial_cleaning: "Commercial Cleaning",
  carpet_cleaning: "Carpet Cleaning",
  after_build_clean: "After Build Clean",
  builders_sparkle_clean: "Builders & Sparkle Clean",
  move_in_out: "Move In / Out Cleaning",
};

export interface QuoteRequestRow {
  id: string;
  serviceTitle: string;
  clientName: string | null;
  postcode: string;
  status: string;
  quotedPrice: number | null;
  createdAt: string;
}

export async function listQuoteRequests(): Promise<QuoteRequestRow[]> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  const { data: requests, error } = await admin
    .from("quote_requests")
    .select("id, service, client_id, postcode, status, quoted_price, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const clientIds = [...new Set((requests ?? []).map((r) => r.client_id))];
  const { data: clients } = clientIds.length
    ? await admin.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [] };
  const nameById = new Map((clients ?? []).map((c) => [c.id, c.full_name]));

  return (requests ?? []).map((r) => ({
    id: r.id,
    serviceTitle: SERVICE_TITLE[r.service] ?? r.service,
    clientName: nameById.get(r.client_id) ?? null,
    postcode: r.postcode,
    status: r.status,
    quotedPrice: r.quoted_price,
    createdAt: r.created_at,
  }));
}

export interface QuoteRequestDetail {
  id: string;
  status: string;
  serviceTitle: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  postcode: string;
  answers: Record<string, unknown>;
  notes: string | null;
  marketingConsent: boolean;
  quotedPrice: number | null;
  declineReason: string | null;
  photos: { storagePath: string; signedUrl: string | null }[];
  createdAt: string;
}

export async function getQuoteRequestDetail(id: string): Promise<QuoteRequestDetail | null> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  const { data: request, error } = await admin
    .from("quote_requests")
    .select("id, service, client_id, postcode, answers, notes, marketing_consent, status, quoted_price, decline_reason, created_at")
    .eq("id", id)
    .single();
  if (error || !request) return null;

  const [{ data: client }, { data: photoRows }] = await Promise.all([
    admin.from("clients").select("full_name, email, phone, address").eq("id", request.client_id).single(),
    admin.from("quote_request_photos").select("storage_path").eq("quote_request_id", id),
  ]);

  const signedUrls = await getSignedPhotoUrls((photoRows ?? []).map((p) => p.storage_path));

  return {
    id: request.id,
    status: request.status,
    serviceTitle: SERVICE_TITLE[request.service] ?? request.service,
    clientName: client?.full_name ?? null,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    clientAddress: client?.address ?? null,
    postcode: request.postcode,
    answers: (request.answers as Record<string, unknown>) ?? {},
    notes: request.notes,
    marketingConsent: request.marketing_consent,
    quotedPrice: request.quoted_price,
    declineReason: request.decline_reason,
    photos: (photoRows ?? []).map((p) => ({
      storagePath: p.storage_path,
      signedUrl: signedUrls.get(p.storage_path) ?? null,
    })),
    createdAt: request.created_at,
  };
}

export type QuoteRequestActionResult = { success: true } | { success: false; error: string };

/**
 * "Send quote": admin enters a price, which emails the customer. There's
 * no mechanism yet to resume the /quote journey at a fixed, pre-priced
 * step -- the 6 tailored services have no pricing formula or calendar
 * step at all today, so building that is out of scope here. The email
 * gives the price and asks the customer to call or reply to book, same
 * as every other tailored-request touchpoint.
 */
export async function sendQuoteForRequest(id: string, price: number): Promise<QuoteRequestActionResult> {
  await assertIsRole(["admin"]);
  if (!Number.isFinite(price) || price <= 0) return { success: false, error: "Enter a valid price" };

  const admin = createAdminClient();
  const { data: request, error: fetchError } = await admin
    .from("quote_requests")
    .select("service, client_id")
    .eq("id", id)
    .single();
  if (fetchError || !request) return { success: false, error: "Request not found" };

  const { error: updateError } = await admin
    .from("quote_requests")
    .update({ status: "quoted", quoted_price: price, quoted_at: new Date().toISOString() })
    .eq("id", id);
  if (updateError) return { success: false, error: updateError.message };

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", request.client_id).single();
  if (client?.email) {
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: "Your tailored price from Sovereign Way Cleaners",
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Here's your price for <strong>${SERVICE_TITLE[request.service] ?? request.service}</strong>: <strong>£${price.toFixed(2)}</strong>.</p>
          <p>To book, just call us on <strong>01732 711856</strong>, WhatsApp <strong>07445 109813</strong>, or reply to this email.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send tailored quote price email", e);
    }
  }

  revalidatePath("/dashboard/admin/quote-requests");
  return { success: true };
}

export async function declineQuoteRequest(id: string, reason: string): Promise<QuoteRequestActionResult> {
  await assertIsRole(["admin"]);
  const trimmedReason = reason.trim();
  if (!trimmedReason) return { success: false, error: "Add a reason for the customer" };

  const admin = createAdminClient();
  const { data: request, error: fetchError } = await admin
    .from("quote_requests")
    .select("client_id")
    .eq("id", id)
    .single();
  if (fetchError || !request) return { success: false, error: "Request not found" };

  const { error: updateError } = await admin
    .from("quote_requests")
    .update({ status: "declined", decline_reason: trimmedReason })
    .eq("id", id);
  if (updateError) return { success: false, error: updateError.message };

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", request.client_id).single();
  if (client?.email) {
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: "About your quote request",
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Unfortunately we're not able to quote for this job: ${trimmedReason}</p>
          <p>Sorry for the inconvenience -- call us on <strong>01732 711856</strong> if you'd like to discuss alternatives.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send tailored-request decline email", e);
    }
  }

  revalidatePath("/dashboard/admin/quote-requests");
  return { success: true };
}
