import { listStandardLists, getStandardList } from "./actions";
import { listClients } from "../clients/actions";
import { PageContainer } from "@/components/shell/PageContainer";
import { NewStandardListDrawer } from "@/components/admin/NewStandardListDrawer";
import { StandardListDetailPanel } from "@/components/admin/StandardListDetailPanel";

export default async function StandardsPage({
  searchParams,
}: {
  searchParams: Promise<{ list?: string }>;
}) {
  const { list: listId } = await searchParams;
  const [lists, clients] = await Promise.all([listStandardLists(), listClients()]);

  const selectedListId = listId && lists.some((l) => l.id === listId) ? listId : (lists[0]?.id ?? null);
  const selectedList = selectedListId ? await getStandardList(selectedListId) : null;

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Standards</h1>
          <p className="mt-1 text-sm text-dash-muted">
            Checklists that cleaners photograph and supervisors check. Pick a list to edit it.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-label="Standard lists"
          className="flex min-w-0 flex-[1_1_260px] flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface p-2.5"
        >
          {lists.map((l) => {
            const active = l.id === selectedListId;
            return (
              <a
                key={l.id}
                href={`/dashboard/admin/standards?list=${l.id}`}
                className={
                  "flex flex-col gap-0.5 rounded-[10px] px-3.5 py-3 " +
                  (active ? "bg-dash-brand-100 outline-2 outline-dash-brand-700 -outline-offset-2" : "")
                }
              >
                <span className="text-sm font-bold text-dash-ink">{l.name}</span>
                <span className="text-[13px] text-dash-muted">
                  {l.standardCount} standard{l.standardCount === 1 ? "" : "s"} · {l.clientCount} client
                  {l.clientCount === 1 ? "" : "s"}
                </span>
              </a>
            );
          })}
          {lists.length === 0 && (
            <p className="px-3.5 py-3 text-sm text-dash-muted">No standard lists yet.</p>
          )}
          <NewStandardListDrawer />
        </section>

        {selectedList ? (
          <StandardListDetailPanel
            list={selectedList}
            allClients={clients.map((c) => ({ id: c.id, fullName: c.fullName }))}
          />
        ) : (
          <section className="flex min-w-0 flex-[3_1_520px] items-center justify-center rounded-2xl border border-dash-border bg-dash-surface p-10 text-sm text-dash-muted">
            Create a standard list to get started.
          </section>
        )}
      </div>
    </PageContainer>
  );
}
