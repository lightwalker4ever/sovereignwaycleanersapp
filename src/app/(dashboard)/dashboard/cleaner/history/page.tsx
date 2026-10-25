import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { listCleanerJobCards } from "@/lib/cleaner-jobs";
import { MobileShell } from "@/components/shell/MobileShell";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { CLEANER_TABS } from "../page";

export default async function CleanerHistoryPage() {
  const user = await getCurrentUser();

  const cards = await listCleanerJobCards(user!.id);
  const past = cards
    .filter((c) => c.displayStatus === "completed")
    .sort((a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime());

  return (
    <MobileShell
      header={
        <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div>
            <h1 className="text-[26px] font-extrabold tracking-tight">History</h1>
            <p className="mt-0.5 text-sm text-dash-muted">Jobs you&apos;ve finished.</p>
          </div>
          <SignOutButton />
        </header>
      }
      tabs={CLEANER_TABS}
    >
      <div className="px-4 pb-6">
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {past.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/cleaner/${c.id}`}
              className="flex items-center gap-3.5 border-b border-dash-border-soft px-4 py-3.5 text-dash-ink last:border-b-0"
            >
              <span className="flex w-16 flex-none flex-col">
                <span className="text-[13px] text-dash-muted">
                  {new Date(c.completedAt ?? c.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">{c.clientName || "Unnamed client"}</span>
                <span className="text-[13px] font-semibold text-[#155B33]">
                  {c.total} of {c.total} met
                  {c.redoCount > 0 ? ` (after ${c.redoCount} redo${c.redoCount === 1 ? "" : "s"})` : ""}
                </span>
              </span>
            </Link>
          ))}
          {past.length === 0 && <p className="px-4 py-6 text-center text-sm text-dash-muted">Nothing finished yet.</p>}
        </div>
      </div>
    </MobileShell>
  );
}
