import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A white KPI card: label, big value, coloured sub-line. The whole
 * tile links to the relevant filtered list (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> KpiTile).
 */
export function KpiTile({
  href,
  label,
  value,
  sub,
  subTone = "muted",
}: {
  href: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  subTone?: "muted" | "good" | "waiting";
}) {
  const subClassName =
    subTone === "good"
      ? "text-[13px] font-semibold text-[#155B33]"
      : subTone === "waiting"
        ? "text-[13px] font-semibold text-[#1C4F8F]"
        : "text-[13px] text-dash-muted";

  return (
    <Link
      href={href}
      className="flex flex-col gap-1.5 rounded-2xl border border-dash-border bg-dash-surface p-5 text-dash-ink"
    >
      <span className="text-[13px] font-semibold text-dash-muted">{label}</span>
      <span className="text-[34px] leading-none font-extrabold tracking-tight">{value}</span>
      {sub && <span className={subClassName}>{sub}</span>}
    </Link>
  );
}
