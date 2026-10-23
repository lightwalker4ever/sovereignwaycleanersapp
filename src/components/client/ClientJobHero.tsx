import Link from "next/link";
import { StatusPill } from "@/components/ui/StatusPill";
import type { ClientJobCard } from "@/lib/client-jobs";

const STEPS: { key: "scheduled" | "in_progress" | "in_review" | "completed"; label: string }[] = [
  { key: "scheduled", label: "Scheduled" },
  { key: "in_progress", label: "In progress" },
  { key: "in_review", label: "In review" },
  { key: "completed", label: "Completed" },
];

function fmtTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function headline(card: ClientJobCard): string {
  const cleaner = card.cleanerName?.split(" ")[0] || "Your cleaner";
  const supervisor = card.supervisorName?.split(" ")[0] || "Your supervisor";
  switch (card.displayStatus) {
    case "awaiting_confirmation":
      return "We're confirming your date.";
    case "scheduled":
      return `${cleaner} is booked in for today.`;
    case "in_progress":
      return `${cleaner} is cleaning now.`;
    case "in_review":
      return `${cleaner} has finished. ${supervisor} is checking the photos now.`;
    case "changes_requested":
      return `${supervisor} asked for a couple of things to be redone -- ${cleaner} is sorting them now.`;
    case "declined":
      return "We weren't able to take this one on -- check your email for details.";
    default:
      return "Your cleaning is complete.";
  }
}

/**
 * The expanded "Today's cleaning" card: status pill, plain-English
 * headline, a 4-step progress bar, and who's doing the work -- design-
 * handoff ClientHome.html's hero section. Used on Home for whichever
 * job is active today, and reused on the cleaning-detail page for a
 * not-yet-completed job (same visual language throughout the app).
 */
export function ClientJobHero({ card, linkToDetail = false }: { card: ClientJobCard; linkToDetail?: boolean }) {
  // "changes_requested" is derived from in_progress -- the step bar
  // reflects the real underlying DB state; the pill/headline carry the
  // nuance instead.
  const effectiveStep = card.displayStatus === "changes_requested" ? "in_progress" : card.displayStatus;
  const currentIdx = STEPS.findIndex((s) => s.key === effectiveStep);

  const content = (
    <section
      aria-label="Today's cleaning"
      className="flex flex-col gap-4 rounded-[20px] border border-dash-border bg-dash-surface p-[18px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-dash-muted">
          {new Date(card.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          {" · "}
          {fmtTime(card.scheduledAt)}
        </span>
        <StatusPill status={card.displayStatus} />
      </div>
      <div className="text-[19px] leading-snug font-extrabold">{headline(card)}</div>
      <div className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, idx) => {
          const state = idx < currentIdx ? "done" : idx === currentIdx ? "now" : "todo";
          const time =
            s.key === "scheduled"
              ? fmtTime(card.scheduledAt)
              : s.key === "in_progress"
                ? fmtTime(card.startedAt) || (state === "now" ? "Now" : "")
                : s.key === "in_review"
                  ? fmtTime(card.submittedAt) || (state === "now" ? "Now" : "")
                  : fmtTime(card.completedAt);
          return (
            <div key={s.key} className="flex flex-col gap-1.5">
              <div
                className="h-1.5 rounded-full"
                style={{
                  background:
                    state === "done"
                      ? "var(--color-dash-brand-700)"
                      : state === "now"
                        ? "#3B7BC8"
                        : "var(--color-dash-border)",
                }}
              />
              <span className="text-[11px] font-bold" style={{ color: state === "todo" ? "var(--color-dash-muted)" : "var(--color-dash-ink)" }}>
                {s.label}
              </span>
              <span className="text-[11px] text-dash-muted">{time}</span>
            </div>
          );
        })}
      </div>
      {card.cleanerName && (
        <div className="flex items-center gap-2.5 rounded-xl bg-dash-bg px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE9F7] text-[13px] font-bold">
            {card.cleanerName
              .split(" ")
              .map((w) => w[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <span className="flex-1 text-[13px] text-dash-ink-2">
            Cleaned by <strong>{card.cleanerName}</strong>
            {card.total > 0 ? ` · ${card.done} of ${card.total} standards photographed` : ""}
          </span>
        </div>
      )}
      <span className="text-[13px] text-dash-muted">We&apos;ll let you know as soon as it&apos;s signed off, with the photos.</span>
    </section>
  );

  return linkToDetail ? (
    <Link href={`/dashboard/client/${card.id}`} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
