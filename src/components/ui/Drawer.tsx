"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A right-hand side panel (min 380px), used for every admin "New …"
 * form instead of a form sitting above a list (design-handoff
 * DESIGN_HANDOFF.md's "Shared components" -> Drawer and "Lists first,
 * forms second"). Built on the same @base-ui/react/dialog primitive as
 * ui/dialog.tsx, just anchored right instead of centered.
 */
const Drawer = DialogPrimitive.Root;
const DrawerTrigger = DialogPrimitive.Trigger;

function DrawerPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerBackdrop({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="drawer-backdrop"
      className={cn(
        "fixed inset-0 z-50 bg-black/30 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  );
}

function DrawerContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DrawerPortal>
      <DrawerBackdrop />
      <DialogPrimitive.Viewport className="fixed inset-0 z-50 flex justify-end">
        <DialogPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "flex h-dvh w-full flex-col overflow-y-auto bg-dash-surface shadow-[-12px_0_32px_rgba(15,59,38,0.08)] sm:w-auto sm:min-w-[380px] sm:max-w-[420px]",
            "data-open:animate-in data-open:slide-in-from-right data-open:duration-300 data-closed:animate-out data-closed:slide-out-to-right data-closed:duration-200",
            className
          )}
          {...props}
        >
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Viewport>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex items-center justify-between gap-4 border-b border-dash-border px-6 py-[22px]",
        className
      )}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn(
        "flex justify-end gap-2.5 border-t border-dash-border bg-[#FAFBFA] px-6 py-4",
        className
      )}
      {...props}
    />
  );
}

function DrawerTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-[19px] font-extrabold text-dash-ink", className)}
      {...props}
    />
  );
}

function DrawerSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[12px] font-bold tracking-wide text-dash-muted uppercase">{label}</span>
      {children}
    </div>
  );
}

function DrawerClose({ className, children, ...props }: DialogPrimitive.Close.Props) {
  return (
    <DialogPrimitive.Close
      data-slot="drawer-close"
      aria-label="Close"
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-lg text-dash-muted hover:bg-dash-bg",
        className
      )}
      {...props}
    >
      {children ?? <XIcon className="size-5" />}
    </DialogPrimitive.Close>
  );
}

export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerBackdrop,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerSection,
  DrawerClose,
};
