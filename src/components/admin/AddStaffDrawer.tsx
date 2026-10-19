"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/Drawer";
import { InviteUserForm } from "@/components/admin/InviteUserForm";

/**
 * Wraps the existing create-staff form in a drawer per design-handoff
 * DESIGN_HANDOFF.md's Staff screen ("Add staff member button opens a
 * drawer... with the current create form"). Deliberately doesn't
 * auto-close on success -- InviteUserForm shows the new account's
 * password inline, which is the only record of it (no email-invite
 * flow exists yet), so the admin needs to see and copy it first.
 */
export function AddStaffDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white hover:bg-dash-brand-900">
        <Plus size={18} aria-hidden="true" />
        Add staff member
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add a staff member</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-5 text-sm text-dash-muted">
            Creates their account with a temporary password you share with them directly (email
            invites are coming later).
          </p>
          <InviteUserForm />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
