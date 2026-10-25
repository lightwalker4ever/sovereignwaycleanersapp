import { LogOut } from "lucide-react";
import { signOut } from "@/app/(dashboard)/actions";

/**
 * Persistent sign-out for the cleaner/client mobile shell -- dropped
 * into every top-level page's header, not just Profile/Account, since
 * those were previously the only place to find it (admin/supervisor
 * already have one always visible in their sidebar via AppShell).
 */
export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOut} className={className}>
      <button
        type="submit"
        aria-label="Sign out"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dash-border bg-dash-surface text-dash-ink-2"
      >
        <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
      </button>
    </form>
  );
}
