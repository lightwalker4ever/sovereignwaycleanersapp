"use client";

import { useLinkStatus } from "next/link";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Swaps a nav item's icon for a spinner while its own <Link> navigation
 * is in flight -- must be rendered as a descendant of that <Link>
 * (useLinkStatus reads context Link provides to its children). `icon`
 * is a pre-rendered element, not a component reference, matching
 * ShellNavItem's existing constraint -- see its doc comment.
 */
export function NavIcon({ icon, size = 20 }: { icon: ReactNode; size?: number }) {
  const { pending } = useLinkStatus();
  if (pending) return <Loader2 size={size} strokeWidth={1.8} className="animate-spin" aria-hidden="true" />;
  return <>{icon}</>;
}

/**
 * A small spinner shown only while its enclosing <Link> is navigating --
 * for a text-only nav link with no icon to swap (e.g. Sales' header
 * nav, which has none of the Sidebar/BottomTabBar icon infrastructure).
 */
export function LinkPendingSpinner({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <Loader2 size={14} strokeWidth={2} className={`inline animate-spin ${className ?? ""}`} aria-hidden="true" />;
}
