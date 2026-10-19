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
import { CreateGhostClientForm } from "@/components/admin/CreateGhostClientForm";

export function AddClientDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white hover:bg-dash-brand-900">
        <Plus size={18} aria-hidden="true" />
        Add client
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add a client</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-5 text-sm text-dash-muted">
            For clients who don&apos;t want to sign up themselves. No login is created for them.
          </p>
          <CreateGhostClientForm onSuccess={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
