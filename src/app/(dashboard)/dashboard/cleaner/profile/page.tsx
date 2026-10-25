import { LogOut } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { signOut } from "@/app/(dashboard)/actions";
import { MobileShell } from "@/components/shell/MobileShell";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { CLEANER_TABS } from "../page";

export default async function CleanerProfilePage() {
  const user = await getCurrentUser();

  const fullName = user?.fullName ?? user?.email ?? "";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <MobileShell
      header={
        <header className="flex items-start justify-between gap-3 px-5 pt-6 pb-4">
          <h1 className="text-[26px] font-extrabold tracking-tight">Profile</h1>
          <SignOutButton />
        </header>
      }
      tabs={CLEANER_TABS}
    >
      <div className="flex flex-col gap-4 px-4 pb-6">
        <div className="flex items-center gap-3.5 rounded-2xl border border-dash-border bg-dash-surface p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-dash-brand-900 text-base font-bold text-white">
            {initials || "?"}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-extrabold">{fullName}</span>
            <span className="text-sm text-dash-muted">{user?.email}</span>
            {user?.phone && <span className="text-sm text-dash-muted">{user.phone}</span>}
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-dash-border bg-dash-surface text-[15px] font-bold text-dash-ink"
          >
            <LogOut size={18} strokeWidth={1.8} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </MobileShell>
  );
}
