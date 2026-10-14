import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { capitalize } from "@/lib/utils";
import { listMyReviews } from "./actions";

export default async function SupervisorPage() {
  const cleanings = await listMyReviews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Your reviews</h1>
        <p className="mt-1 text-sm text-gray-600">
          Jobs you supervise. Anything marked &ldquo;In review&rdquo; is waiting on you.
        </p>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl ring-1 ring-foreground/10">
        {cleanings.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/supervisor/${c.id}`}
            className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50"
          >
            <div>
              <p className="font-medium text-gray-900">{c.clientName || "Unnamed client"}</p>
              <p className="text-xs text-gray-500">
                {new Date(c.createdAt).toLocaleDateString("en-GB")}
              </p>
            </div>
            <Badge variant={c.status === "in_review" ? "default" : "secondary"}>
              {capitalize(c.status.replace("_", " "))}
            </Badge>
          </Link>
        ))}
        {cleanings.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-400">No cleanings assigned to you yet.</p>
        )}
      </div>
    </div>
  );
}
