import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { listCleanerJobCards, jobTimeLabel } from "@/lib/cleaner-jobs";
import { MobileShell } from "@/components/shell/MobileShell";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { StatusPill } from "@/components/ui/StatusPill";
import { CLEANER_TABS } from "../page";

export default async function CleanerSchedulePage() {
  const user = await getCurrentUser();

  const cards = await listCleanerJobCards(user!.id);
  const upcoming = cards.filter((c) => c.displayStatus !== "completed");

  return (
    <MobileShell
      header={
        <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight">Schedule</h1>
            <p className="mt-0.5 text-sm text-dash-muted">Every upcoming job, in order.</p>
          </div>
          <SignOutButton />
        </header>
      }
      tabs={CLEANER_TABS}
    >
      <div className="px-4 pb-6">
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {upcoming.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/cleaner/${c.id}`}
              className="flex items-center gap-3.5 border-b border-dash-border-soft px-4 py-3.5 text-dash-ink last:border-b-0"
            >
              <span className="flex w-16 flex-none flex-col">
                <span className="text-[15px] font-extrabold">{jobTimeLabel(c)}</span>
                <span className="text-[11px] text-dash-muted">
                  {new Date(c.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">{c.clientName || "Unnamed client"}</span>
                <span className="text-[13px] text-dash-muted">{c.address || "No address on file"}</span>
              </span>
              <StatusPill status={c.displayStatus} />
            </Link>
          ))}
          {upcoming.length === 0 && <p className="px-4 py-6 text-center text-sm text-dash-muted">Nothing upcoming.</p>}
        </div>
      </div>
    </MobileShell>
  );
}
