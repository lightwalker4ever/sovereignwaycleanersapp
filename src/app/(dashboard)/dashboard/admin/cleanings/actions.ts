"use server";

import { z } from "zod";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameSchema, phoneSchema } from "@/lib/validation";
import { resolveClientStandardState, assignChecklistToCleaning } from "@/lib/standards";
import { getCleaningDetailForParty, type CleaningDetailForParty } from "@/lib/cleanings";
import {
  toDisplayCleaningStatus,
  aggregateChecklistByCleaning,
  type DisplayCleaningStatus,
} from "@/lib/cleaning-status";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";

const resend = new Resend(process.env.RESEND_API_KEY);

export interface AssignableStaff {
  id: string;
  fullName: string | null;
  email: string | null;
}

export interface CleanerBooking {
  cleanerId: string;
  scheduledAt: string;
}

export async function listAssignableStaff(): Promise<{
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  /** Each cleaner's upcoming jobs (from yesterday on), for the New cleaning
   *  drawer's availability hint -- small enough to fetch once up front
   *  rather than round-tripping on every date/time change. */
  cleanerSchedule: CleanerBooking[];
}> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: cleaners, error: cleanerError },
    { data: supervisors, error: supervisorError },
    { data: upcoming, error: upcomingError },
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").eq("role", "cleaner").order("full_name"),
    admin.from("profiles").select("id, full_name, email").eq("role", "supervisor").order("full_name"),
    admin
      .from("cleanings")
      .select("cleaner_id, scheduled_at")
      .gte("scheduled_at", new Date(Date.now() - 24 * 3_600_000).toISOString())
      .neq("status", "completed"),
  ]);
  if (cleanerError) throw new Error(cleanerError.message);
  if (supervisorError) throw new Error(supervisorError.message);
  if (upcomingError) throw new Error(upcomingError.message);

  return {
    cleaners: (cleaners ?? []).map((c) => ({ id: c.id, fullName: c.full_name, email: c.email })),
    supervisors: (supervisors ?? []).map((s) => ({ id: s.id, fullName: s.full_name, email: s.email })),
    // Awaiting-confirmation requests have no cleaner yet -- they aren't
    // "booked" availability for anyone, so they're excluded here.
    cleanerSchedule: (upcoming ?? [])
      .filter((u): u is { cleaner_id: string; scheduled_at: string } => u.cleaner_id !== null)
      .map((u) => ({ cleanerId: u.cleaner_id, scheduledAt: u.scheduled_at })),
  };
}

const ghostClientSchema = z.object({
  fullName: nameSchema,
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "Invalid email provided"),
  phone: phoneSchema,
});

export type CreateCleaningState = { success: boolean; error?: string } | null;

export async function createCleaning(
  prevState: CreateCleaningState,
  formData: FormData
): Promise<CreateCleaningState> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();

  const clientMode = formData.get("clientMode") as string;
  const cleanerId = formData.get("cleanerId") as string;
  const supervisorId = formData.get("supervisorId") as string;
  const notes = ((formData.get("notes") as string) || "").trim() || null;
  const standardListId = (formData.get("standardListId") as string) || null;
  const date = (formData.get("date") as string) || "";
  const time = (formData.get("time") as string) || "";
  const repeatWeekly = formData.get("repeatWeekly") === "on";

  if (!cleanerId || !supervisorId) {
    return { success: false, error: "Pick a cleaner and a supervisor" };
  }
  if (!date || !time) {
    return { success: false, error: "Pick a date and start time" };
  }
  const scheduledAt = new Date(`${date}T${time}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: "That date and time isn't valid" };
  }

  // Re-validate role server-side rather than trusting the dropdown.
  const [{ data: cleanerProfile }, { data: supervisorProfile }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", cleanerId).single(),
    admin.from("profiles").select("role").eq("id", supervisorId).single(),
  ]);
  if (cleanerProfile?.role !== "cleaner") {
    return { success: false, error: "Selected cleaner is invalid" };
  }
  if (supervisorProfile?.role !== "supervisor") {
    return { success: false, error: "Selected supervisor is invalid" };
  }

  let clientId: string;

  if (clientMode === "new") {
    const parsed = ghostClientSchema.safeParse({
      fullName: formData.get("fullName"),
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const { data: newClient, error: clientError } = await admin
      .from("clients")
      .insert({
        full_name: parsed.data.fullName,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
      })
      .select("id")
      .single();
    if (clientError || !newClient) {
      return { success: false, error: clientError?.message ?? "Failed to create client" };
    }
    clientId = newClient.id;
  } else {
    clientId = formData.get("clientId") as string;
    if (!clientId) return { success: false, error: "Pick a client" };
  }

  let state = await resolveClientStandardState(clientId);

  if (!state) {
    if (!standardListId) {
      return {
        success: false,
        error: "This client has no standards assigned -- pick a standard list",
      };
    }
    const { data: assignment, error: assignError } = await admin
      .from("client_standard_assignments")
      .upsert({ client_id: clientId, standard_list_id: standardListId }, { onConflict: "client_id" })
      .select("id")
      .single();
    if (assignError || !assignment) {
      return { success: false, error: assignError?.message ?? "Failed to assign standards" };
    }
    state = await resolveClientStandardState(clientId);
    if (!state) {
      return { success: false, error: "Failed to resolve the assigned standards" };
    }
  }

  const enabledItems = state.items.filter((i) => i.enabled);
  if (enabledItems.length === 0) {
    return { success: false, error: "This client's standard list has no enabled standards" };
  }

  const { data: cleaning, error: cleaningError } = await admin
    .from("cleanings")
    .insert({
      client_id: clientId,
      cleaner_id: cleanerId,
      supervisor_id: supervisorId,
      notes,
      scheduled_at: scheduledAt.toISOString(),
      repeat_weekly: repeatWeekly,
    })
    .select("id")
    .single();
  if (cleaningError || !cleaning) {
    return { success: false, error: cleaningError?.message ?? "Failed to create cleaning" };
  }

  const { error: checklistError } = await admin.from("cleaning_standards").insert(
    enabledItems.map((item, index) => ({
      cleaning_id: cleaning.id,
      standard_id: item.standardId,
      title: item.title,
      description: item.description,
      area: item.area,
      sort_order: index,
    }))
  );
  if (checklistError) {
    return { success: false, error: checklistError.message };
  }

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin/clients");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export interface CleaningRow {
  id: string;
  reference: string;
  scheduledAt: string;
  clientName: string | null;
  address: string | null;
  cleanerId: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  checklistDone: number;
  checklistTotal: number;
  displayStatus: DisplayCleaningStatus;
}

export async function listCleanings(): Promise<CleaningRow[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [
    { data: cleanings, error },
    { data: clients, error: clientsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    admin
      .from("cleanings")
      .select("id, reference, client_id, cleaner_id, supervisor_id, status, scheduled_at, started_at")
      .order("scheduled_at", { ascending: false }),
    admin.from("clients").select("id, full_name, address"),
    admin.from("profiles").select("id, full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const cleaningIds = (cleanings ?? []).map((c) => c.id);
  const { data: checklist, error: checklistError } = cleaningIds.length
    ? await admin.from("cleaning_standards").select("cleaning_id, review_status").in("cleaning_id", cleaningIds)
    : { data: [], error: null };
  if (checklistError) throw new Error(checklistError.message);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
  const checklistByCleaningId = aggregateChecklistByCleaning(checklist ?? []);

  const rows: CleaningRow[] = (cleanings ?? []).map((c) => {
    const client = clientById.get(c.client_id);
    const agg = checklistByCleaningId.get(c.id);
    return {
      id: c.id,
      reference: c.reference,
      scheduledAt: c.scheduled_at,
      clientName: client?.full_name ?? null,
      address: client?.address ?? null,
      cleanerId: c.cleaner_id,
      cleanerName: c.cleaner_id ? profileNameById.get(c.cleaner_id) ?? null : null,
      supervisorName: c.supervisor_id ? profileNameById.get(c.supervisor_id) ?? null : null,
      checklistDone: agg?.done ?? 0,
      checklistTotal: agg?.total ?? 0,
      displayStatus: toDisplayCleaningStatus(c.status, agg?.hasNotMet ?? false, c.scheduled_at, c.started_at),
    };
  });

  return rows;
}

export async function getCleaningDetail(cleaningId: string): Promise<CleaningDetailForParty | null> {
  await assertIsRole(["admin"]);
  // No one specific user -- admin isn't the cleaner or supervisor --
  // so ownerColumn null skips the ownership check entirely.
  return getCleaningDetailForParty(cleaningId, "", null);
}

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

export interface CleaningRequestDetail {
  id: string;
  reference: string;
  status: string;
  service: string | null;
  serviceTitle: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;
  requestedDate: string | null;
  requestedWindow: string | null;
  isFlexible: boolean;
  accessMethod: string | null;
  accessNotes: string | null;
  notes: string | null;
  marketingConsent: boolean;
  propertyAnswers: Record<string, unknown> | null;
  priceBreakdown: {
    lineItems: { label: string; amount: number }[];
    subtotalExVat: number;
    vatAmount: number;
    totalIncVat: number;
    locationLabel: string;
  } | null;
  declineReason: string | null;
  createdAt: string;
}

/**
 * Purpose-built fetch for the admin request drawer -- distinct from
 * getCleaningDetailForParty() (shared by cleaner/supervisor/client/admin
 * for an already-confirmed job's checklist/photos/comments), since an
 * awaiting_confirmation request has none of that yet. Admin-only.
 */
export async function getCleaningRequestDetail(cleaningId: string): Promise<CleaningRequestDetail | null> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  const { data: cleaning, error } = await admin
    .from("cleanings")
    .select(
      "id, reference, status, service, client_id, requested_date, requested_window, is_flexible, access_method, access_notes, notes, marketing_consent, property_answers, price_breakdown, decline_reason, created_at"
    )
    .eq("id", cleaningId)
    .single();
  if (error || !cleaning) return null;

  const { data: client } = await admin
    .from("clients")
    .select("full_name, email, phone, address")
    .eq("id", cleaning.client_id)
    .single();

  return {
    id: cleaning.id,
    reference: cleaning.reference,
    status: cleaning.status,
    service: cleaning.service,
    serviceTitle: cleaning.service ? (SERVICE_TITLE[cleaning.service] ?? cleaning.service) : "Unknown service",
    clientName: client?.full_name ?? null,
    clientEmail: client?.email ?? null,
    clientPhone: client?.phone ?? null,
    clientAddress: client?.address ?? null,
    requestedDate: cleaning.requested_date,
    requestedWindow: cleaning.requested_window,
    isFlexible: cleaning.is_flexible,
    accessMethod: cleaning.access_method,
    accessNotes: cleaning.access_notes,
    notes: cleaning.notes,
    marketingConsent: cleaning.marketing_consent,
    propertyAnswers: (cleaning.property_answers as Record<string, unknown> | null) ?? null,
    priceBreakdown: (cleaning.price_breakdown as CleaningRequestDetail["priceBreakdown"]) ?? null,
    declineReason: cleaning.decline_reason,
    createdAt: cleaning.created_at,
  };
}

function windowLabelFor(key: string | null): string {
  return ARRIVAL_WINDOWS.find((w) => w.key === key)?.label ?? "";
}

export type SendReminderResult = { success: true } | { success: false; error: string };

/**
 * Phase E of the persisted-quote work: a manual nudge for a 'quoted'
 * instant-price draft the customer never submitted -- resends the
 * magic link saveInstantQuoteDraft() already emailed once
 * automatically, reusing the stored resume_token rather than minting
 * a new one.
 */
export async function sendQuoteReminder(cleaningId: string): Promise<SendReminderResult> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  const { data: cleaning, error: fetchError } = await admin
    .from("cleanings")
    .select("reference, service, client_id, status, resume_token, price_breakdown")
    .eq("id", cleaningId)
    .single();
  if (fetchError || !cleaning) return { success: false, error: "Quote not found" };
  if (cleaning.status !== "quoted" || !cleaning.resume_token) {
    return { success: false, error: "This quote has already moved on" };
  }

  const { data: client } = await admin.from("clients").select("email").eq("id", cleaning.client_id).single();
  if (!client?.email) return { success: false, error: "No email on file for this client" };

  const breakdown = cleaning.price_breakdown as { totalIncVat?: number } | null;
  const serviceTitle = SERVICE_TITLE[cleaning.service ?? ""] ?? "cleaning";
  const resumeUrl = `https://sovereignwaycleaners.co.uk/quote/resume?token=${cleaning.resume_token}`;

  try {
    await resend.emails.send({
      from: "Sovereign Way Cleaners <onboarding@resend.dev>",
      to: client.email,
      subject: `Still interested? Your ${serviceTitle} quote is waiting (${cleaning.reference})`,
      html: `
        <p>Hi,</p>
        <p>Just checking in -- your <strong>${serviceTitle}</strong> quote is still saved for you.</p>
        ${breakdown?.totalIncVat ? `<p style="font-size:20px;font-weight:bold">£${breakdown.totalIncVat.toFixed(2)} inc. VAT</p>` : ""}
        <p><a href="${resumeUrl}" style="display:inline-block;padding:10px 18px;background:#1B5E3B;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">Continue my quote</a></p>
        <p>Or call us on <strong>01732 711856</strong> or WhatsApp <strong>07445 109813</strong> if you'd rather talk it through.</p>
        <br>
        <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
      `,
    });
  } catch (e) {
    console.error("Failed to send quote reminder email", e);
    return { success: false, error: "Couldn't send that right now. Please try again." };
  }

  return { success: true };
}

export type ConfirmRequestResult = { success: true } | { success: false; error: string };

/**
 * "Confirm & schedule" -- the website-quote equivalent of createCleaning(),
 * but updates the existing awaiting_confirmation row (assigning cleaner/
 * supervisor/the exact time) rather than inserting a new one, and
 * generates the checklist as a separate step via assignChecklistToCleaning()
 * since the row already exists. Emails the customer.
 */
export async function confirmCleaningRequest(input: {
  cleaningId: string;
  cleanerId: string;
  supervisorId: string;
  date: string;
  time: string;
  standardListId?: string;
}): Promise<ConfirmRequestResult> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  if (!input.cleanerId || !input.supervisorId) {
    return { success: false, error: "Pick a cleaner and a supervisor" };
  }
  if (!input.date || !input.time) {
    return { success: false, error: "Pick a date and start time" };
  }
  const scheduledAt = new Date(`${input.date}T${input.time}`);
  if (Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: "That date and time isn't valid" };
  }

  const [{ data: cleanerProfile }, { data: supervisorProfile }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", input.cleanerId).single(),
    admin.from("profiles").select("role").eq("id", input.supervisorId).single(),
  ]);
  if (cleanerProfile?.role !== "cleaner") return { success: false, error: "Selected cleaner is invalid" };
  if (supervisorProfile?.role !== "supervisor") return { success: false, error: "Selected supervisor is invalid" };

  const { data: cleaning, error: fetchError } = await admin
    .from("cleanings")
    .select("client_id, service")
    .eq("id", input.cleaningId)
    .single();
  if (fetchError || !cleaning) return { success: false, error: "Request not found" };

  const checklistResult = await assignChecklistToCleaning(
    input.cleaningId,
    cleaning.client_id,
    input.standardListId ?? null
  );
  if (!checklistResult.success) return checklistResult;

  const { error: updateError } = await admin
    .from("cleanings")
    .update({
      cleaner_id: input.cleanerId,
      supervisor_id: input.supervisorId,
      scheduled_at: scheduledAt.toISOString(),
      status: "assigned",
    })
    .eq("id", input.cleaningId);
  if (updateError) return { success: false, error: updateError.message };

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", cleaning.client_id).single();
  if (client?.email) {
    const dateLabel = scheduledAt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    const timeLabel = scheduledAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: "Your cleaning is confirmed",
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Good news -- your ${SERVICE_TITLE[cleaning.service ?? ""] ?? "cleaning"} is confirmed for <strong>${dateLabel} at ${timeLabel}</strong>.</p>
          <p>We'll be in touch if anything changes. If you have any questions, call us on <strong>01732 711856</strong> or WhatsApp <strong>07445 109813</strong>.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send confirmation email", e);
    }
  }

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

/**
 * "Propose another date" -- updates the request's requested date/window
 * (status stays 'awaiting_confirmation') and emails the customer asking
 * them to call or reply to confirm. There's no customer-facing accept/
 * reject UI for this yet -- the email is the negotiation mechanism, same
 * as a phone call would be.
 */
export async function proposeAnotherDate(input: {
  cleaningId: string;
  date: string;
  window: string | null;
}): Promise<ConfirmRequestResult> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  if (!input.date) return { success: false, error: "Pick a date to propose" };

  const windowStart = input.window === "morning" ? "08:00" : input.window === "midday" ? "11:00" : input.window === "afternoon" ? "14:00" : "09:00";
  const scheduledAt = new Date(`${input.date}T${windowStart}:00`);

  const { data: cleaning, error: fetchError } = await admin
    .from("cleanings")
    .select("client_id, service")
    .eq("id", input.cleaningId)
    .single();
  if (fetchError || !cleaning) return { success: false, error: "Request not found" };

  const { error: updateError } = await admin
    .from("cleanings")
    .update({
      requested_date: input.date,
      requested_window: input.window,
      is_flexible: false,
      scheduled_at: scheduledAt.toISOString(),
    })
    .eq("id", input.cleaningId);
  if (updateError) return { success: false, error: updateError.message };

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", cleaning.client_id).single();
  if (client?.email) {
    const dateLabel = new Date(`${input.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: "A different date for your cleaning?",
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Your original date isn't available, but we could do <strong>${dateLabel}${input.window ? `, ${windowLabelFor(input.window)}` : ""}</strong> instead.</p>
          <p>Let us know if that works by calling <strong>01732 711856</strong>, WhatsApp <strong>07445 109813</strong>, or just replying to this email.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send proposed-date email", e);
    }
  }

  revalidatePath("/dashboard/admin/cleanings");
  return { success: true };
}

export async function declineCleaningRequest(input: {
  cleaningId: string;
  reason: string;
}): Promise<ConfirmRequestResult> {
  await assertIsRole(["admin"]);
  const admin = createAdminClient();

  const reason = input.reason.trim();
  if (!reason) return { success: false, error: "Add a reason for the customer" };

  const { data: cleaning, error: fetchError } = await admin
    .from("cleanings")
    .select("client_id")
    .eq("id", input.cleaningId)
    .single();
  if (fetchError || !cleaning) return { success: false, error: "Request not found" };

  const { error: updateError } = await admin
    .from("cleanings")
    .update({ status: "declined", decline_reason: reason })
    .eq("id", input.cleaningId);
  if (updateError) return { success: false, error: updateError.message };

  const { data: client } = await admin.from("clients").select("full_name, email").eq("id", cleaning.client_id).single();
  if (client?.email) {
    try {
      await resend.emails.send({
        from: "Sovereign Way Cleaners <onboarding@resend.dev>",
        to: client.email,
        subject: "About your booking request",
        html: `
          <p>Hi ${client.full_name ?? "there"},</p>
          <p>Unfortunately we're not able to take on this booking: ${reason}</p>
          <p>We're sorry for the inconvenience. If you'd like to discuss alternatives, call us on <strong>01732 711856</strong> or WhatsApp <strong>07445 109813</strong>.</p>
          <br>
          <p>Kind regards,<br><strong>Sovereign Way Cleaners</strong></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send decline email", e);
    }
  }

  revalidatePath("/dashboard/admin/cleanings");
  revalidatePath("/dashboard/admin");
  return { success: true };
}
