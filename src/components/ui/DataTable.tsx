import type { ReactNode } from "react";

/**
 * A white card wrapping a <table>, with uppercase muted headers and
 * horizontal scroll on small screens (design-handoff DESIGN_HANDOFF.md's
 * "Shared components" -> DataTable). Deliberately not a config-driven
 * grid -- each page's columns differ too much to share that logic, so
 * this is just the card/scroll/header chrome; callers write their own
 * <thead>/<tbody>.
 */
export function DataTable({
  children,
  minWidth = 640,
  className,
}: {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-dash-border bg-dash-surface ${className ?? ""}`}>
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function DataTableHeadRow({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="text-left text-[12px] font-semibold tracking-wide text-dash-muted uppercase">
        {children}
      </tr>
    </thead>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={`border-t border-dash-border-soft ${className ?? ""}`}>{children}</tr>;
}
