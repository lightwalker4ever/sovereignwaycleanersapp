import { ClipboardCheck, CalendarDays, CalendarCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getMySupervisorAvailability } from "./actions";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { SupervisorAvailabilityEditor } from "@/components/supervisor/SupervisorAvailabilityEditor";
import { capitalize } from "@/lib/utils";
import type { ShellNavItem } from "@/components/shell/types";

export default async function SupervisorAvailabilityPage() {
  const user = await getCurrentUser();
  const { weekly, exceptions } = await getMySupervisorAvailability();

  const fullName = user?.fullName ?? user?.email ?? "";
  const initials = fullName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const navItems: ShellNavItem[] = [
    { href: "/dashboard/supervisor", label: "Review queue", icon: <ClipboardCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/cleanings", label: "Cleanings", icon: <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/availability", label: "Availability", icon: <CalendarCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
  ];

  return (
    <AppShell navItems={navItems} user={{ initials: initials || "?", name: fullName, roleLabel: capitalize(user?.role ?? "supervisor") }}>
      <PageContainer>
        <header>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">My availability</h1>
          <p className="mt-1 text-sm text-dash-muted">Set which days you&apos;re normally on duty.</p>
        </header>

        <SupervisorAvailabilityEditor initialWeekly={weekly} initialExceptions={exceptions} />
      </PageContainer>
    </AppShell>
  );
}
