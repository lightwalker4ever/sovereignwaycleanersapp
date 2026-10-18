"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertIsRole } from "@/lib/supabase/auth-helpers";
import { createAdminClient } from "@/lib/supabase/admin";
import { BOOKING_STATUSES, type BookingStatus } from "@/lib/booking-status";

const statusSchema = z.enum(BOOKING_STATUSES);

export interface BookingSummary {
  id: string;
  service: "end_of_tenancy" | "deep_cleaning" | "office_cleaning";
  clientId: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  postcode: string;
  totalIncVat: number;
  status: BookingStatus;
  createdAt: string;
}

/**
 * Admin-only, deliberately not shared with Sales -- bookings bypass
 * Sales entirely (see the initiative's architecture decisions), unlike
 * contact_requests which is a genuinely shared queue.
 */
export async function listBookings(): Promise<BookingSummary[]> {
  await assertIsRole(["admin"]);

  const admin = createAdminClient();
  const [{ data: bookings, error }, { data: clients, error: clientsError }] = await Promise.all([
    admin
      .from("quote_bookings")
      .select("id, service, client_id, postcode, price_breakdown, status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("clients").select("id, full_name, email, phone"),
  ]);
  if (error) throw new Error(error.message);
  if (clientsError) throw new Error(clientsError.message);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));

  return (bookings ?? []).map((b) => {
    const client = clientById.get(b.client_id);
    const breakdown = b.price_breakdown as { totalIncVat?: number } | null;
    return {
      id: b.id,
      service: b.service,
      clientId: b.client_id,
      clientName: client?.full_name ?? null,
      clientEmail: client?.email ?? null,
      clientPhone: client?.phone ?? null,
      postcode: b.postcode,
      totalIncVat: breakdown?.totalIncVat ?? 0,
      status: b.status,
      createdAt: b.created_at,
    };
  });
}

export async function updateBookingStatus(id: string, status: string) {
  await assertIsRole(["admin"]);

  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) throw new Error("Invalid status");

  const admin = createAdminClient();
  const { error } = await admin.from("quote_bookings").update({ status: parsed.data }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/admin/bookings");
}
