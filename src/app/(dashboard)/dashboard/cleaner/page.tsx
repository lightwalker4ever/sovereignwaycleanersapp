import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { listMyCleanings } from "./actions";

export default async function CleanerPage() {
  const cleanings = await listMyCleanings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your cleanings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Jobs assigned to you. Start one to begin photographing each standard.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-foreground/10">
        {cleanings.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/cleaner/${c.id}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">{c.clientName || "Unnamed client"}</p>
              <p className="text-xs text-gray-500">
                {new Date(c.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Badge variant="secondary">{capitalize(c.status.replace("_", " "))}</Badge>
          </Link>
        ))}
        {cleanings.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No cleanings assigned to you yet.</p>
        )}
      </div>
    </div>
  );
}
