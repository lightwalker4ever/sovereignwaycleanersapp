"use client";

import { Fragment } from "react";
import { Menu } from "@base-ui/react/menu";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * An icon button that opens a row-actions menu (e.g. Edit details,
 * Change role, Send password reset email, Generate temporary password,
 * a divider, then Deactivate in red) -- design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> RowMenu. A divider is
 * drawn automatically before the first `danger` item.
 */
export function RowMenu({
  items,
  ariaLabel = "More actions",
}: {
  items: RowMenuItem[];
  ariaLabel?: string;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={ariaLabel}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-dash-ink-2 hover:bg-dash-border-soft"
      >
        <MoreVertical size={20} aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="flex w-[230px] flex-col gap-0.5 rounded-xl border border-dash-border bg-dash-surface p-1.5 text-left shadow-[0_12px_32px_rgba(15,59,38,0.16)]">
            {items.map((item, i) => (
              <Fragment key={item.label}>
                {item.danger && !items[i - 1]?.danger && (
                  <Menu.Separator className="my-1 h-px bg-dash-border" />
                )}
                <Menu.Item
                  disabled={item.disabled}
                  onClick={item.onClick}
                  className={cn(
                    "flex h-10 cursor-pointer items-center rounded-lg px-3 text-sm outline-none data-highlighted:bg-dash-bg data-disabled:cursor-not-allowed data-disabled:opacity-50",
                    item.danger ? "font-semibold text-dash-danger" : "text-dash-ink"
                  )}
                >
                  {item.label}
                </Menu.Item>
              </Fragment>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
