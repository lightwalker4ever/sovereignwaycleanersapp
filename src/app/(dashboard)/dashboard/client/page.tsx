import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS_LABELS } from "@/components/client/ClientStatusBanner";
import { listMyCleaningsAsClient } from "./actions";

export default async function ClientPage() {
  const cleanings = await listMyCleaningsAsClient();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your cleanings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Live status for every cleaning booked with us.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-foreground/10">
        {cleanings.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/client/${c.id}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">
                {c.cleanerName ? `Cleaner: ${c.cleanerName}` : "Cleaner not yet assigned"}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(c.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Badge variant="secondary">{CLIENT_STATUS_LABELS[c.status] ?? c.status}</Badge>
          </Link>
        ))}
        {cleanings.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No cleanings booked yet.</p>
        )}
      </div>
    </div>
  );
}
