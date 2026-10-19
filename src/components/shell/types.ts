import type { LucideIcon } from "lucide-react";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Live count badge (e.g. Cleanings = in review + unassigned, Feedback = unread). */
  badge?: number;
}

export interface ShellUser {
  initials: string;
  name: string;
  roleLabel: string;
}
