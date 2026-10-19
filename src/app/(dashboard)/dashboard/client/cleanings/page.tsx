import Link from "next/link";
import { listMyCleaningJobCards } from "../actions";
import { MobileShell } from "@/components/shell/MobileShell";
import { StatusPill } from "@/components/ui/StatusPill";
import { CLIENT_TABS } from "../page";

export default async function ClientCleaningsPage() {
  const cards = await listMyCleaningJobCards();

  return (
    <MobileShell
      header={
        <header className="px-5 pt-6 pb-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Cleanings</h1>
          <p className="mt-0.5 text-sm text-dash-muted">Every cleaning booked with us.</p>
        </header>
      }
      tabs={CLIENT_TABS}
    >
      <div className="px-4 pb-6">
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/client/${c.id}`}
              className="flex items-center gap-3.5 border-b border-dash-border-soft px-4 py-3.5 text-dash-ink last:border-b-0"
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">
                  {new Date(c.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="text-[13px] text-dash-muted">{c.cleanerName ? `Cleaned by ${c.cleanerName}` : "Cleaner not yet assigned"}</span>
              </span>
              <StatusPill status={c.displayStatus} />
            </Link>
          ))}
          {cards.length === 0 && <p className="px-4 py-6 text-center text-sm text-dash-muted">No cleanings booked yet.</p>}
        </div>
      </div>
    </MobileShell>
  );
}
