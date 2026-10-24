import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";

const SERVICE_TITLE: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
  domestic_cleaning: "Domestic Cleaning",
  commercial_cleaning: "Commercial Cleaning",
  carpet_cleaning: "Carpet Cleaning",
  after_build_clean: "After Build Clean",
  builders_sparkle_clean: "Builders & Sparkle Clean",
  move_in_out: "Move In / Out Cleaning",
};

const DRAFT_EXPIRY_MS = 14 * 24 * 60 * 60 * 1000;

export type ClientQuoteStatus = "quoted_draft" | "tailored_draft" | "awaiting_quote" | "tailored_quoted";

export interface ClientQuoteCard {
  id: string;
  reference: string;
  serviceTitle: string;
  status: ClientQuoteStatus;
  /** Resumable via /quote/property or /quote/about-job -- only set for
   *  quoted_draft/tailored_draft, the two pre-submission states. */
  resumable: boolean;
  totalIncVat: number | null;
  createdAt: string;
}

/**
 * Phase D of the persisted-quote work: everything this client hasn't
 * yet turned into a real booking -- shown on login so a quote they
 * started (but didn't finish) isn't lost. Deliberately excludes
 * cleanings already at 'awaiting_confirmation' or later, since those
 * already show as the client's upcoming job elsewhere
 * (listClientJobCards) -- showing them here too would be a duplicate.
 *
 * The 14-day expiry (agreed with the user, same window
 * resolveQuoteDraftByToken enforces for the magic-link resume) only
 * applies to the two pre-submission states (quoted_draft/
 * tailored_draft) -- a tailored request that's already been submitted
 * (awaiting_quote) or priced by staff (tailored_quoted) is live
 * business the company still owes a response to, not an abandoned
 * draft, so it stays visible regardless of age.
 */
export async function listClientPendingQuotes(clientId: string): Promise<ClientQuoteCard[]> {
  const admin = createAdminClient();
  const expiryCutoff = new Date(Date.now() - DRAFT_EXPIRY_MS).toISOString();

  const [{ data: cleanings, error: cleaningsError }, { data: requests, error: requestsError }] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, reference, service, price_breakdown, created_at")
      .eq("client_id", clientId)
      .eq("status", "quoted")
      .gte("created_at", expiryCutoff)
      .order("created_at", { ascending: false }),
    admin
      .from("quote_requests")
      .select("id, reference, service, status, quoted_price, created_at")
      .eq("client_id", clientId)
      .in("status", ["draft", "awaiting_quote", "quoted"])
      .order("created_at", { ascending: false }),
  ]);
  if (cleaningsError) throw new Error(cleaningsError.message);
  if (requestsError) throw new Error(requestsError.message);

  const cards: ClientQuoteCard[] = [];

  for (const c of cleanings ?? []) {
    const breakdown = c.price_breakdown as { totalIncVat?: number } | null;
    cards.push({
      id: c.id,
      reference: c.reference,
      serviceTitle: SERVICE_TITLE[c.service ?? ""] ?? c.service ?? "Cleaning",
      status: "quoted_draft",
      resumable: true,
      totalIncVat: breakdown?.totalIncVat ?? null,
      createdAt: c.created_at,
    });
  }

  for (const r of requests ?? []) {
    if (r.status === "draft" && r.created_at < expiryCutoff) continue;
    cards.push({
      id: r.id,
      reference: r.reference,
      serviceTitle: SERVICE_TITLE[r.service] ?? r.service,
      status: r.status === "draft" ? "tailored_draft" : r.status === "awaiting_quote" ? "awaiting_quote" : "tailored_quoted",
      resumable: r.status === "draft",
      totalIncVat: r.quoted_price,
      createdAt: r.created_at,
    });
  }

  return cards.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface ResumeOwnDraftResult {
  kind: "instant" | "tailored";
  postcode: string;
  instant: { service: string; selectedInputs: Json } | null;
  tailored: { service: string; answers: Json } | null;
}

/**
 * The authenticated equivalent of resolveQuoteDraftByToken -- no token
 * or postcode re-entry needed, since the dashboard itself already
 * proved who the customer is. Ownership (draft.client_id === clientId)
 * is still checked, same as every other client-scoped action in this
 * file's caller (dashboard/client/actions.ts).
 */
export async function resolveOwnQuoteDraft(clientId: string, draftId: string): Promise<ResumeOwnDraftResult | null> {
  const admin = createAdminClient();

  const { data: cleaning } = await admin
    .from("cleanings")
    .select("id, client_id, status, service, postcode, property_answers")
    .eq("id", draftId)
    .maybeSingle();
  if (cleaning) {
    if (cleaning.client_id !== clientId || cleaning.status !== "quoted") return null;
    return {
      kind: "instant",
      postcode: cleaning.postcode ?? "",
      instant: { service: cleaning.service ?? "", selectedInputs: cleaning.property_answers as Json },
      tailored: null,
    };
  }

  const { data: quoteRequest } = await admin
    .from("quote_requests")
    .select("id, client_id, status, service, postcode, answers")
    .eq("id", draftId)
    .maybeSingle();
  if (quoteRequest) {
    if (quoteRequest.client_id !== clientId || quoteRequest.status !== "draft") return null;
    return {
      kind: "tailored",
      postcode: quoteRequest.postcode,
      instant: null,
      tailored: { service: quoteRequest.service, answers: quoteRequest.answers as Json },
    };
  }

  return null;
}
