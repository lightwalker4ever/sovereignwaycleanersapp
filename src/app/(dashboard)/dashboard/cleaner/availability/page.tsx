import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MobileShell } from "@/components/shell/MobileShell";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { AvailabilityEditor } from "@/components/cleaner/AvailabilityEditor";
import { CLEANER_TABS } from "../page";
import { getMyAvailability } from "./actions";

export default async function CleanerAvailabilityPage() {
  const { weekly, exceptions } = await getMyAvailability();

  return (
    <MobileShell
      header={
        <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <div>
            <Link
              href="/dashboard/cleaner/schedule"
              className="flex items-center gap-1 text-sm font-semibold text-dash-muted"
            >
              <ChevronLeft size={16} aria-hidden="true" /> Schedule
            </Link>
            <h1 className="mt-1 text-[26px] font-extrabold tracking-tight">My availability</h1>
            <p className="mt-0.5 text-sm text-dash-muted">Set which days and times you normally work.</p>
          </div>
          <SignOutButton />
        </header>
      }
      tabs={CLEANER_TABS}
    >
      <div className="px-4 pb-6">
        <AvailabilityEditor initialWeekly={weekly} initialExceptions={exceptions} />
      </div>
    </MobileShell>
  );
}
