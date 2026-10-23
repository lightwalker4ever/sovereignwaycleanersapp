/**
 * The 7 cleaning statuses used everywhere in the redesigned UI (admin,
 * supervisor, cleaner, client) -- see design-handoff/DESIGN_HANDOFF.md's
 * "Status system" and quote-handoff/QUOTE_HANDOFF.md's "Integration with
 * the existing app". The database's cleanings.status enum has 6 values
 * (awaiting_confirmation/assigned/in_progress/in_review/completed/
 * declined); "changes_requested" is derived here rather than stored,
 * since it's fully reconstructable from existing data: a cleaning is
 * "in_progress" *because* it was sent back only when at least one of its
 * checklist items is still marked "not_met" (the only way a not_met row
 * can exist is via the supervisor's send-back flow, which is the only
 * thing that sets cleanings.status back to "in_progress" after it ever
 * reached "in_review").
 */
export const DISPLAY_CLEANING_STATUSES = [
  "awaiting_confirmation",
  "scheduled",
  "in_progress",
  "in_review",
  "changes_requested",
  "completed",
  "declined",
] as const;

export type DisplayCleaningStatus = (typeof DISPLAY_CLEANING_STATUSES)[number];

export const CLEANING_STATUS_INFO: Record<
  DisplayCleaningStatus,
  { label: string; bg: string; text: string }
> = {
  awaiting_confirmation: { label: "Awaiting confirmation", bg: "#FFF1D1", text: "#7A4B00" },
  scheduled: { label: "Scheduled", bg: "#EEF1EF", text: "#3F4B44" },
  in_progress: { label: "In progress", bg: "#FFF1D1", text: "#7A4B00" },
  in_review: { label: "In review", bg: "#E3EEFB", text: "#1C4F8F" },
  changes_requested: { label: "Changes requested", bg: "#FCE6DA", text: "#9A3A0B" },
  completed: { label: "Completed", bg: "#DFF1E5", text: "#155B33" },
  declined: { label: "Declined", bg: "#FDE8E6", text: "#B42318" },
};

const DB_STATUS_TO_DISPLAY: Record<string, DisplayCleaningStatus> = {
  awaiting_confirmation: "awaiting_confirmation",
  assigned: "scheduled",
  in_progress: "in_progress",
  in_review: "in_review",
  completed: "completed",
  declined: "declined",
};

/**
 * Maps a cleanings.status DB value (+ whether any checklist item is
 * currently "not_met") to the 5-value display status. `hasNotMet` only
 * matters while the DB status is "in_progress".
 */
export function toDisplayCleaningStatus(
  dbStatus: string,
  hasNotMet: boolean
): DisplayCleaningStatus {
  if (dbStatus === "in_progress" && hasNotMet) return "changes_requested";
  return DB_STATUS_TO_DISPLAY[dbStatus] ?? "scheduled";
}

export interface ChecklistAggregate {
  done: number;
  total: number;
  hasNotMet: boolean;
}

/**
 * Groups cleaning_standards rows by cleaning_id into {done, total,
 * hasNotMet} -- the shape both the admin dashboard's and the admin
 * Cleanings list's checklist-progress column/status derivation need.
 */
export function aggregateChecklistByCleaning(
  rows: { cleaning_id: string; review_status: string }[]
): Map<string, ChecklistAggregate> {
  const map = new Map<string, ChecklistAggregate>();
  for (const row of rows) {
    const agg = map.get(row.cleaning_id) ?? { done: 0, total: 0, hasNotMet: false };
    agg.total += 1;
    if (row.review_status === "met") agg.done += 1;
    if (row.review_status === "not_met") agg.hasNotMet = true;
    map.set(row.cleaning_id, agg);
  }
  return map;
}
