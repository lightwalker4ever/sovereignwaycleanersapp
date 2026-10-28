"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { CONTACT_REQUEST_STATUSES, type ContactRequestStatus } from "@/lib/contact-request-status";

const statusSchema = z.enum(CONTACT_REQUEST_STATUSES);
const MIN_NOTE_LENGTH = 50;

export interface ContactRequestNote {
  id: string;
  status: "contacted" | "closed";
  note: string;
  authorName: string | null;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string;
  propertyType: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
  notes: ContactRequestNote[];
}

/**
 * Shared by both /dashboard/sales (its own role-gated layout) and
 * /dashboard/admin/enquiries (admin's parallel view, gated by the
 * existing admin layout) -- assertIsRole's array form is exactly
 * what lets one Server Action serve two roles' pages.
 */
export async function listContactRequests(): Promise<ContactRequest[]> {
  await assertIsRole(["sales", "admin"]);

  const admin = createAdminClient();
  const [{ data, error }, { data: notes, error: notesError }] = await Promise.all([
    admin
      .from("contact_requests")
      .select(
        "id, name, email, phone, service, property_type, preferred_date, preferred_time, message, status, created_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("contact_request_notes")
      .select("id, contact_request_id, status, note, author_name, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (notesError) throw new Error(notesError.message);

  const notesByRequestId = new Map<string, ContactRequestNote[]>();
  for (const n of notes ?? []) {
    const list = notesByRequestId.get(n.contact_request_id) ?? [];
    list.push({ id: n.id, status: n.status, note: n.note, authorName: n.author_name, createdAt: n.created_at });
    notesByRequestId.set(n.contact_request_id, list);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    service: r.service,
    propertyType: r.property_type,
    preferredDate: r.preferred_date,
    preferredTime: r.preferred_time,
    message: r.message,
    status: r.status,
    createdAt: r.created_at,
    notes: notesByRequestId.get(r.id) ?? [],
  }));
}

/**
 * `note` is required (50+ characters) whenever moving to "contacted"
 * or "closed" -- the point is a record of what was actually done, not
 * just a status flip. Stored as its own row (not overwriting a single
 * column) so the enquiry card can show the full history as it moves
 * through multiple status changes over time.
 */
export async function updateContactRequestStatus(id: string, status: string, note?: string) {
  await assertIsRole(["sales", "admin"]);

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");

  const admin = createAdminClient();

  if (parsed.data === "contacted" || parsed.data === "closed") {
    const trimmed = (note ?? "").trim();
    if (trimmed.length < MIN_NOTE_LENGTH) {
      throw new Error(`Add at least ${MIN_NOTE_LENGTH} characters describing the action taken`);
    }
    const me = await getCurrentUser();
    const { error: noteError } = await admin.from("contact_request_notes").insert({
      contact_request_id: id,
      status: parsed.data,
      note: trimmed,
      author_name: me?.fullName ?? me?.email ?? null,
    });
    if (noteError) throw new Error(noteError.message);
  }

  const { error } = await admin
    .from("contact_requests")
    .update({ status: parsed.data })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/admin/enquiries");
}
