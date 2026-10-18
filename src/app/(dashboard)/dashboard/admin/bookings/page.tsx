import Link from "next/link";
import { listBookings } from "./actions";
import { BookingStatusSelect } from "@/components/admin/BookingStatusSelect";

const SERVICE_LABEL: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
};

export default async function BookingsPage() {
  const bookings = await listBookings();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Instant-quote bookings from the website. Convert a pending booking into a cleaning job
          once you&apos;re ready to schedule it.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <table className="w-full min-w-225 text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Postcode</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{SERVICE_LABEL[b.service]}</td>
                <td className="px-4 py-3 text-gray-600">
                  <div>{b.clientName || "—"}</div>
                  <div className="text-xs text-gray-400">
                    {b.clientEmail}
                    {b.clientPhone ? ` · ${b.clientPhone}` : ""}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{b.postcode}</td>
                <td className="px-4 py-3 text-gray-600">£{b.totalIncVat.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <BookingStatusSelect bookingId={b.id} initialStatus={b.status} />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {new Date(b.createdAt).toLocaleDateString("en-GB")}
                </td>
                <td className="px-4 py-3 text-right">
                  {b.status !== "converted" && (
                    <Link
                      href={`/dashboard/admin/cleanings?clientId=${b.clientId}&bookingId=${b.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      Create cleaning job
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
