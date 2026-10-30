/**
 * Plain constants for the contractor-application form -- edit this file
 * directly to change them, no admin UI or migration needed. Same framing
 * as quote-config.ts's own "placeholders to make configurable" header.
 */

/**
 * "Areas of Experience" checklist -- the same 9 services the quote
 * system already knows about (the 3 instant-quote keys +
 * TailoredServiceSlug's 6), not a new taxonomy. The display titles here
 * are a small local copy, matching this codebase's existing convention
 * of each file keeping its own SERVICE_TITLE-style map (see
 * src/actions/quote.ts, src/app/quote/when/page.tsx) rather than a
 * single shared export.
 */
export const AREA_OF_EXPERIENCE_LABEL: Record<string, string> = {
  end_of_tenancy: "End of Tenancy",
  deep_cleaning: "Deep Cleaning",
  office_cleaning: "Office Cleaning",
  domestic_cleaning: "Domestic Cleaning",
  commercial_cleaning: "Commercial Cleaning",
  carpet_cleaning: "Carpet Cleaning",
  after_build_clean: "After Build Clean",
  builders_sparkle_clean: "Builders & Sparkle Clean",
  move_in_out: "Move In / Out Cleaning",
};

export const AREA_OF_EXPERIENCE_KEYS = Object.keys(AREA_OF_EXPERIENCE_LABEL);

export type BusinessStructure = "sole_trader" | "company";

export type RecruitmentPeriodKey = "early" | "day" | "evening";

export interface RecruitmentPeriodConfig {
  key: RecruitmentPeriodKey;
  label: string;
  time: string;
}

/** The contractor-application availability grid's 3 columns -- a
 *  distinct concept from ARRIVAL_WINDOWS (quote-config.ts), which are
 *  for booked jobs, not a prospective contractor's general availability. */
export const RECRUITMENT_PERIODS: RecruitmentPeriodConfig[] = [
  { key: "early", label: "Early", time: "05:00–09:00" },
  { key: "day", label: "Daytime", time: "09:00–17:00" },
  { key: "evening", label: "Evening", time: "17:00–22:00" },
];

export const RECRUITMENT_PERIOD_KEYS: RecruitmentPeriodKey[] = RECRUITMENT_PERIODS.map((p) => p.key);

/** Mon=1 .. Sat=6, matching JS Date.getDay() -- Sunday (0) is never offered. */
export const RECRUITMENT_DAYS = [1, 2, 3, 4, 5, 6] as const;

export const RECRUITMENT_DAY_LABEL: Record<number, string> = {
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};
