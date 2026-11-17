"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleCreated(bucketId: string) {
    setOpen(false);
    // Land straight on the new bucket with its "add area" input
    // focused, instead of back on the static bucket list -- creating
    // a bucket is only useful once it has at least one area.
    router.push(`/dashboard/admin/standards?bucket=${bucketId}&focus=area`);
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="mt-1.5 h-11 rounded-[10px] border border-dashed border-dash-muted/60 text-sm font-bold text-dash-brand-700">
        + New bucket
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New standards bucket</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="mb-5 text-sm text-dash-muted">
            A named category (e.g. &quot;Commercial Cleaning&quot;) made up of reusable areas --
            assign it to a client, then build their checklist by applying each area as many
            times as they need (e.g. 2x Office, 3x Toilet).
          </p>
          <CreateStandardListForm onCreated={handleCreated} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
