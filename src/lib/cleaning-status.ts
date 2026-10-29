/**
 * The 8 cleaning statuses used everywhere in the redesigned UI (admin,
 * supervisor, cleaner, client) -- see design-handoff/DESIGN_HANDOFF.md's
 * "Status system" and quote-handoff/QUOTE_HANDOFF.md's "Integration with
 * the existing app". The database's cleanings.status enum has 7 values
 * (quoted/awaiting_confirmation/assigned/in_progress/in_review/completed/
 * declined); "changes_requested" is derived here rather than stored,
 * since it's fully reconstructable from existing data: a cleaning is
 * "in_progress" *because* it was sent back only when at least one of its
 * checklist items is still marked "not_met" (the only way a not_met row
 * can exist is via the supervisor's send-back flow, which is the only
 * thing that sets cleanings.status back to "in_progress" after it ever
 * reached "in_review"). "quoted" is Phase B of the persisted-quote work:
 * an instant price computed and saved before the customer has given a
 * date or full contact details -- not a committed booking yet, so it's
 * excluded from a client's own job list (listClientJobCards) until the
 * customer actually submits.
 */
export const DISPLAY_CLEANING_STATUSES = [
  "quoted",
  "awaiting_confirmation",
  "scheduled",
  "missed",
  "rescheduled",
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
  quoted: { label: "Quoted", bg: "#E3EEFB", text: "#1C4F8F" },
  awaiting_confirmation: { label: "Awaiting confirmation", bg: "#FFF1D1", text: "#7A4B00" },
  scheduled: { label: "Scheduled", bg: "#EEF1EF", text: "#3F4B44" },
  missed: { label: "Missed job - Reschedule", bg: "#FDE8E6", text: "#B42318" },
  rescheduled: { label: "Rescheduled", bg: "#E6E9FD", text: "#3730A3" },
  in_progress: { label: "In progress", bg: "#FFF1D1", text: "#7A4B00" },
  in_review: { label: "In review", bg: "#E3EEFB", text: "#1C4F8F" },
  changes_requested: { label: "Changes requested", bg: "#FCE6DA", text: "#9A3A0B" },
  completed: { label: "Completed", bg: "#DFF1E5", text: "#155B33" },
  declined: { label: "Declined", bg: "#FDE8E6", text: "#B42318" },
};

const DB_STATUS_TO_DISPLAY: Record<string, DisplayCleaningStatus> = {
  quoted: "quoted",
  awaiting_confirmation: "awaiting_confirmation",
  assigned: "scheduled",
  in_progress: "in_progress",
  in_review: "in_review",
  completed: "completed",
  declined: "declined",
};

/**
 * Maps a cleanings.status DB value (+ whether any checklist item is
 * currently "not_met") to the display status. `hasNotMet` only matters
 * while the DB status is "in_progress". `scheduledAt`/`startedAt` are
 * optional -- a "scheduled" (DB "assigned") job whose scheduled time
 * has passed with no `started_at` becomes "missed", the same
 * derived-not-stored pattern as "changes_requested" above: it's fully
 * reconstructable from existing data, so there's no new DB status to
 * keep in sync with "now". "rescheduled" can't be derived the same way
 * (the fact that a job *was* missed is lost once its date moves to the
 * future), so it depends on `rescheduledAt`, the one piece of this that
 * actually is stored (`cleanings.rescheduled_at`, set by
 * rescheduleCleaning()) -- checked after "missed" so a rescheduled job
 * that's then missed *again* shows "missed" rather than a stale
 * "Rescheduled" badge.
 */
export function toDisplayCleaningStatus(
  dbStatus: string,
  hasNotMet: boolean,
  scheduledAt?: string | null,
  startedAt?: string | null,
  rescheduledAt?: string | null
): DisplayCleaningStatus {
  if (dbStatus === "in_progress" && hasNotMet) return "changes_requested";
  if (dbStatus === "assigned" && !startedAt && scheduledAt && new Date(scheduledAt) < new Date()) {
    return "missed";
  }
  if (dbStatus === "assigned" && !startedAt && rescheduledAt) return "rescheduled";
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
