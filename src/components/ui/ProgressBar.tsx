/**
 * A 6-8px progress track; fill is brand-700 at 100%, brand-500 below
 * 100%. Optional label below reads "X of Y standards" (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> ProgressBar).
 */
export function ProgressBar({
  done,
  total,
  label,
  height = 6,
}: {
  done: number;
  total: number;
  label?: string;
  height?: 6 | 8;
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div
        className="overflow-hidden rounded-full bg-dash-track"
        style={{ height }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? "var(--color-dash-brand-700)" : "var(--color-dash-brand-500)",
          }}
        />
      </div>
      {label !== undefined && <div className="mt-1 text-xs text-dash-muted">{label}</div>}
    </div>
  );
}
