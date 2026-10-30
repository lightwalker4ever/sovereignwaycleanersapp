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
import { CreateCleaningForm } from "@/components/admin/CreateCleaningForm";
import type {
  AssignableStaff,
  CleanerBooking,
  SupervisorWeeklyDuty,
  SupervisorDutyException,
} from "@/app/(dashboard)/dashboard/admin/cleanings/actions";
import type { ClientSummary } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function NewCleaningDrawer({
  clients,
  cleaners,
  supervisors,
  cleanerSchedule,
  supervisorAvailability,
  standardLists,
  initialClientId,
}: {
  clients: ClientSummary[];
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  cleanerSchedule: CleanerBooking[];
  supervisorAvailability: { weekly: SupervisorWeeklyDuty[]; exceptions: SupervisorDutyException[] };
  standardLists: { id: string; name: string }[];
  initialClientId?: string;
}) {
  // Auto-open when arriving with a clientId pre-selected -- otherwise
  // the admin has to notice and click the button themselves after
  // already being sent here.
  const [open, setOpen] = useState(!!initialClientId);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white hover:bg-dash-brand-900">
        <Plus size={18} aria-hidden="true" />
        New cleaning
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New cleaning</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <CreateCleaningForm
          clients={clients}
          cleaners={cleaners}
          supervisors={supervisors}
          cleanerSchedule={cleanerSchedule}
          supervisorAvailability={supervisorAvailability}
          standardLists={standardLists}
          initialClientId={initialClientId}
          onSuccess={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}
