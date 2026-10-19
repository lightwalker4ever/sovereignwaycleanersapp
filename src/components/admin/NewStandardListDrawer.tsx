"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/Drawer";
import { CreateStandardListForm } from "@/components/admin/CreateStandardListForm";

export function NewStandardListDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="mt-1.5 h-11 rounded-[10px] border border-dashed border-dash-muted/60 text-sm font-bold text-dash-brand-700">
        + New list
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New standard list</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-5 text-sm text-dash-muted">
            A named group of standards (e.g. &quot;Standard Residential Clean&quot;) you can
            assign to clients.
          </p>
          <CreateStandardListForm onSuccess={() => setOpen(false)} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
