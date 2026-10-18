"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTACT_REQUEST_STATUSES, type ContactRequestStatus } from "@/lib/contact-request-status";

const statusSchema = z.enum(CONTACT_REQUEST_STATUSES);

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
  const { data, error } = await admin
    .from("contact_requests")
    .select(
      "id, name, email, phone, service, property_type, preferred_date, preferred_time, message, status, created_at"
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

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
  }));
}

export async function updateContactRequestStatus(id: string, status: string) {
  await assertIsRole(["sales", "admin"]);

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");

  const admin = createAdminClient();
  const { error } = await admin
    .from("contact_requests")
    .update({ status: parsed.data })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/sales");
  revalidatePath("/dashboard/admin/enquiries");
}
