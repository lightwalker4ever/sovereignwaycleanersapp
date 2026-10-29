/**
 * Config values the spec explicitly calls out as placeholders to make
 * configurable (quote-handoff/QUOTE_HANDOFF.md, step 3 and step 4).
 * All plain constants -- edit this file directly to change them, no
 * admin UI or migration needed.
 */

export type TailoredServiceSlug =
  | "domestic_cleaning"
  | "commercial_cleaning"
  | "carpet_cleaning"
  | "after_build_clean"
  | "builders_sparkle_clean"
  | "move_in_out";

export interface TailoredQuestion {
  key: string;
  question: string;
  options: string[];
}

/**
 * Step 2-equivalent "About the job" chip questions for each tailored
 * (non-instant-price) service -- quote-handoff QUOTE_HANDOFF.md:
 * "Adapt the questions per service. For example, commercial asks
 * premises type and size; carpet asks number of rooms and stairs."
 * Purely descriptive lead-qualification data (stored as free-form
 * answers on the quote_requests row), not fed into any pricing formula.
 */
export const TAILORED_QUESTIONS: Record<TailoredServiceSlug, TailoredQuestion[]> = {
  domestic_cleaning: [
    { key: "type", question: "Type of home", options: ["Flat", "House", "Other"] },
    { key: "bedrooms", question: "Bedrooms", options: ["1", "2", "3", "4", "5+"] },
    { key: "frequency", question: "How often?", options: ["One-off", "Weekly", "Fortnightly", "Monthly"] },
  ],
  commercial_cleaning: [
    { key: "premises", question: "Premises type", options: ["Office", "Retail", "Other"] },
    { key: "size", question: "Approximate size", options: ["Small", "Medium", "Large"] },
    { key: "frequency", question: "How often?", options: ["One-off", "Weekly", "Fortnightly", "Monthly"] },
  ],
  carpet_cleaning: [
    { key: "rooms", question: "Number of rooms", options: ["1", "2", "3", "4", "5+"] },
    { key: "stairs", question: "Stairs?", options: ["Yes", "No"] },
    { key: "stains", question: "Any stains or odours?", options: ["Yes", "No"] },
  ],
  after_build_clean: [
    { key: "size", question: "Property size", options: ["Small", "Medium", "Large"] },
    { key: "stage", question: "Stage of works", options: ["Mid-build", "Final clean"] },
  ],
  builders_sparkle_clean: [
    { key: "size", question: "Property size", options: ["Small", "Medium", "Large"] },
    { key: "type", question: "Type of job", options: ["New build", "Renovation"] },
  ],
  move_in_out: [
    { key: "size", question: "Property size", options: ["Studio / 1 bed", "2-3 bed", "4+ bed"] },
    { key: "direction", question: "Moving in or out?", options: ["Moving in", "Moving out"] },
  ],
};

export type ArrivalWindowKey = "morning" | "midday" | "afternoon";

export interface ArrivalWindowConfig {
  key: ArrivalWindowKey;
  label: string;
  time: string;
}

/** Step 3's 3 arrival-window cards. Placeholders per the spec -- edit freely. */
export const ARRIVAL_WINDOWS: ArrivalWindowConfig[] = [
  { key: "morning", label: "Morning", time: "08:00–10:00" },
  { key: "midday", label: "Midday", time: "11:00–13:00" },
  { key: "afternoon", label: "Afternoon", time: "14:00–16:00" },
];

export const WINDOW_ORDER: ArrivalWindowKey[] = ARRIVAL_WINDOWS.map((w) => w.key);

/**
 * The hour each window conceptually starts at -- used to bucket an
 * arbitrary scheduled_at time into one of the 3 windows for conflict
 * checking, since not every booking time is constrained to a window's
 * own start time (an admin manually creating a job via
 * CreateCleaningForm can pick any time). A time is bucketed into the
 * latest window whose start hour is <= its own hour, so e.g. 10:30
 * (between morning and midday) still counts as "morning" -- the gap
 * between windows is treated as a continuation of the one before it,
 * not free time. Pure/framework-agnostic so both server code
 * (src/lib/cleaner-availability.ts) and client code
 * (CreateCleaningForm.tsx) can share one implementation.
 */
const WINDOW_START_HOUR: Record<ArrivalWindowKey, number> = { morning: 8, midday: 11, afternoon: 14 };

export function windowForScheduledAt(scheduledAt: string): ArrivalWindowKey {
  // new Date(...).getHours() reads back in whichever local timezone a
  // scheduled_at was originally written in (every write site in this
  // app constructs it via `new Date(\`${date}T${time}\`)`, with no
  // "Z"/offset suffix) -- using getUTCHours() here instead would
  // silently re-introduce a timezone-offset bug on any runtime that
  // isn't already UTC.
  const hour = new Date(scheduledAt).getHours();
  let result: ArrivalWindowKey = WINDOW_ORDER[0];
  for (const key of WINDOW_ORDER) {
    if (hour >= WINDOW_START_HOUR[key]) result = key;
  }
  return result;
}

/**
 * Expands a list of job times into the set of windows they make a
 * cleaner busy for on their own day, applying the agreed buffer rule:
 * a job in window W also occupies the *next* window (no buffer after
 * the day's last window), covering a job that overruns.
 */
export function expandBusyWindowsWithBuffer(scheduledAtTimes: string[]): Set<ArrivalWindowKey> {
  const busy = new Set<ArrivalWindowKey>();
  for (const scheduledAt of scheduledAtTimes) {
    const window = windowForScheduledAt(scheduledAt);
    busy.add(window);
    const idx = WINDOW_ORDER.indexOf(window);
    if (idx < WINDOW_ORDER.length - 1) busy.add(WINDOW_ORDER[idx + 1]);
  }
  return busy;
}

/**
 * Dates step 3's calendar shows as fully booked/not offered, in
 * addition to every Sunday -- ISO yyyy-mm-dd. Empty until real
 * capacity data is plugged in; add specific dates here in the
 * meantime (e.g. bank holidays).
 *
 * TODO: replace this whole static rule with real capacity/availability
 * data once it exists. Today every day from tomorrow onward is
 * available except Sundays and the dates listed here -- see
 * isDateAvailable() below.
 */
export const BLOCKED_DATES: string[] = [];

/** Step 4's "We'll confirm your date within [X hours]" copy. */
export const CONFIRMATION_WINDOW_HOURS = 24;

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Step 3's calendar availability rule: every day from tomorrow
 * onward, except Sundays and BLOCKED_DATES. See the TODO above --
 * this is a placeholder until real capacity data exists.
 */
export function isDateAvailable(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d <= today) return false;
  if (d.getDay() === 0) return false;
  if (BLOCKED_DATES.includes(toIsoDate(d))) return false;
  return true;
}
