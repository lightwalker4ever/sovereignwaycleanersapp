import { CLEANING_STATUS_INFO, type DisplayCleaningStatus } from "@/lib/cleaning-status";

/**
 * The one shared status pill for all 5 cleaning statuses -- used on
 * every screen (admin, supervisor, cleaner, client) per
 * design-handoff/DESIGN_HANDOFF.md's "Status system". Never used for
 * other kinds of pills (staff Active/Invited, etc.) -- those are
 * one-off inline spans, since they aren't part of this shared status
 * language.
 */
export function StatusPill({
  status,
  className,
}: {
  status: DisplayCleaningStatus;
  className?: string;
}) {
  const info = CLEANING_STATUS_INFO[status];
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${className ?? ""}`}
      style={{ background: info.bg, color: info.text }}
    >
      {info.label}
    </span>
  );
}
