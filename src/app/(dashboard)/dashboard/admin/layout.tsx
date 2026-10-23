import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Home,
  Users,
  ListChecks,
  MessageSquare,
  ClipboardList,
  Inbox,
  Sparkles,
  Tag,
  MapPin,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getAdminNavBadges } from "@/lib/admin-dashboard";
import { AppShell } from "@/components/shell/AppShell";
import { capitalize } from "@/lib/utils";
import type { ShellNavItem } from "@/components/shell/types";

// Renders the icon element here on the server -- ShellNavItem.icon is a
// ReactNode, not a component reference, since a bare component/function
// can't be passed as a prop into Sidebar's "use client" boundary.
function navIcon(Icon: LucideIcon) {
  return <Icon size={20} strokeWidth={1.8} aria-hidden="true" />;
}

/**
 * Role gate for everything under /dashboard/admin. Co-located with the
 * routes it protects rather than encoded in proxy.ts -- see
 * src/proxy.ts for why. Accepts both "admin" and "manager" -- the
 * redesign pairs them onto one shell/home (design-handoff
 * DESIGN_HANDOFF.md's "Admin / Manager" row), and manager previously
 * had no dashboard of its own at all.
 */
export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin" && user.role !== "manager") {
    redirect("/dashboard");
  }

  const { cleaningsInReview, bookingsPending, enquiriesNew, quoteRequestsAwaiting } = await getAdminNavBadges();

  // The handoff's own nav list (Dashboard/Cleanings/Clients/Staff/
  // Standards/Feedback) plus the pre-existing Quote-and-Book admin
  // pages it doesn't mention -- those still need to be reachable in
  // one click, per the acceptance checklist.
  const navItems: ShellNavItem[] = [
    { href: "/dashboard/admin", label: "Dashboard", icon: navIcon(LayoutDashboard) },
    {
      href: "/dashboard/admin/cleanings",
      label: "Cleanings",
      icon: navIcon(CalendarDays),
      badge: cleaningsInReview || undefined,
    },
    { href: "/dashboard/admin/clients", label: "Clients", icon: navIcon(Home) },
    { href: "/dashboard/admin/staff", label: "Staff", icon: navIcon(Users) },
    { href: "/dashboard/admin/standards", label: "Standards", icon: navIcon(ListChecks) },
    { href: "/dashboard/admin/feedback", label: "Feedback", icon: navIcon(MessageSquare) },
    {
      href: "/dashboard/admin/bookings",
      label: "Bookings",
      icon: navIcon(ClipboardList),
      badge: bookingsPending || undefined,
    },
    {
      href: "/dashboard/admin/enquiries",
      label: "Enquiries",
      icon: navIcon(Inbox),
      badge: enquiriesNew || undefined,
    },
    {
      href: "/dashboard/admin/quote-requests",
      label: "Quote Requests",
      icon: navIcon(Sparkles),
      badge: quoteRequestsAwaiting || undefined,
    },
    { href: "/dashboard/admin/rate-card", label: "Rate Card", icon: navIcon(Tag) },
    { href: "/dashboard/admin/location-pricing", label: "Location Pricing", icon: navIcon(MapPin) },
    { href: "/dashboard/admin/settings", label: "Settings", icon: navIcon(SettingsIcon) },
  ];

  const fullName = user.fullName ?? user.email ?? "";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell
      navItems={navItems}
      user={{ initials: initials || "?", name: fullName, roleLabel: capitalize(user.role ?? "") }}
    >
      {children}
    </AppShell>
  );
}
