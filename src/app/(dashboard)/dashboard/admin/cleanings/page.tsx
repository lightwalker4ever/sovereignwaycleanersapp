import { Suspense } from "react";
import { listCleanings, listAssignableStaff } from "./actions";
import { listClients } from "../clients/actions";
import { listStandardLists } from "../standards/actions";
import { NewCleaningDrawer } from "@/components/admin/NewCleaningDrawer";
import { CleaningsList } from "@/components/admin/CleaningsList";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function CleaningsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const [{ clientId }, rows, { cleaners, supervisors, cleanerSchedule, supervisorAvailability }, clients, standardLists] =
    await Promise.all([
      searchParams,
      listCleanings(),
      listAssignableStaff(),
      listClients(),
      listStandardLists(),
    ]);

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1 basis-65">
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Cleanings</h1>
          <p className="mt-1 text-sm text-dash-muted">Every job. Click a row to open it.</p>
        </div>
        <div role="group" aria-label="View" className="flex rounded-[10px] bg-dash-track p-[3px]">
          <button type="button" className="h-[38px] rounded-lg bg-white px-3.5 text-sm font-semibold shadow-sm">
            List
          </button>
          <button
            type="button"
            disabled
            title="Coming soon"
            className="h-[38px] cursor-not-allowed px-3.5 text-sm text-dash-muted"
          >
            Calendar
          </button>
        </div>
        <NewCleaningDrawer
          clients={clients}
          cleaners={cleaners}
          supervisors={supervisors}
          cleanerSchedule={cleanerSchedule}
          supervisorAvailability={supervisorAvailability}
          standardLists={standardLists}
          initialClientId={clientId}
        />
      </header>

      <Suspense fallback={null}>
        <CleaningsList
          rows={rows}
          cleaners={cleaners}
          supervisors={supervisors}
          supervisorAvailability={supervisorAvailability}
          standardLists={standardLists}
        />
      </Suspense>
    </PageContainer>
  );
}
