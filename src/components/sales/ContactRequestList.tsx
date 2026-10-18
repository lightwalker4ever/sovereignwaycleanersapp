import { ContactRequestStatusSelect } from "@/components/sales/ContactRequestStatusSelect";
import type { ContactRequest } from "@/app/(dashboard)/dashboard/sales/actions";

export function ContactRequestList({ requests }: { requests: ContactRequest[] }) {
  if (requests.length === 0) {
    return <p className="p-6 text-center text-sm text-gray-400">No enquiries yet.</p>;
  }

  return (
    <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-foreground/10">
      {requests.map((r) => {
        const details = [r.propertyType, r.preferredDate, r.preferredTime]
          .filter(Boolean)
          .join(" · ");

        return (
          <div key={r.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{r.name}</p>
                <p className="text-xs text-gray-500">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ""}
                </p>
              </div>
              <ContactRequestStatusSelect requestId={r.id} initialStatus={r.status} />
            </div>
            <p className="text-sm text-gray-700">
              <span className="font-medium">{r.service}</span>
              {details && <span className="text-gray-500"> · {details}</span>}
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-600">{r.message}</p>
            <p className="text-xs text-gray-400">
              {new Date(r.createdAt).toLocaleString("en-GB")}
            </p>
          </div>
        );
      })}
    </div>
  );
}
