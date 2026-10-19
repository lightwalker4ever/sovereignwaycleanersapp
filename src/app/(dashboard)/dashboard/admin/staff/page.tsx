import { listUsers, countCleanersOnJobNow } from "../actions";
import { AddStaffDrawer } from "@/components/admin/AddStaffDrawer";
import { StaffDirectory } from "@/components/admin/StaffDirectory";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function AdminStaffPage() {
  const [users, cleanersOnJobNow] = await Promise.all([listUsers(), countCleanersOnJobNow()]);

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center gap-3">
        <div className="flex-1 basis-75">
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Staff</h1>
          <p className="mt-1 text-sm text-dash-muted">
            Cleaners, supervisors, managers and admins. Clients live under Clients.
          </p>
        </div>
        <AddStaffDrawer />
      </header>

      <StaffDirectory users={users} cleanersOnJobNow={cleanersOnJobNow} />
    </PageContainer>
  );
}
