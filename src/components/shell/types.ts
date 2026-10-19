import type { ReactNode } from "react";

export interface ShellNavItem {
  href: string;
  label: string;
  /**
   * A pre-rendered icon element (e.g. <LayoutDashboard size={20} />),
   * not the icon component itself -- Sidebar/BottomTabBar are Client
   * Components, and React Server Components can't pass a bare
   * component/function reference across that boundary as a prop, only
   * serializable data or already-created elements.
   */
  icon: ReactNode;
  /** Live count badge (e.g. Cleanings = in review + unassigned, Feedback = unread). */
  badge?: number;
}

export interface ShellUser {
  initials: string;
  name: string;
  roleLabel: string;
}
