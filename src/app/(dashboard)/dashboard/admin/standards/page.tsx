import { listBuckets, getBucket, getAreaTemplate } from "./actions";
import { listClients } from "../clients/actions";
import { PageContainer } from "@/components/shell/PageContainer";
import { NewStandardListDrawer } from "@/components/admin/NewStandardListDrawer";
import { StandardListDetailPanel } from "@/components/admin/StandardListDetailPanel";
import { AreaTemplatePanel } from "@/components/admin/AreaTemplatePanel";

export default async function StandardsPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; area?: string }>;
}) {
  const { bucket: bucketId, area: areaTemplateId } = await searchParams;
  const [buckets, clients] = await Promise.all([listBuckets(), listClients()]);

  const selectedBucketId = bucketId && buckets.some((b) => b.id === bucketId) ? bucketId : (buckets[0]?.id ?? null);
  const selectedBucket = selectedBucketId ? await getBucket(selectedBucketId) : null;

  const selectedAreaTemplateId =
    areaTemplateId && selectedBucket?.areaTemplates.some((a) => a.id === areaTemplateId) ? areaTemplateId : null;
  const selectedAreaTemplate = selectedAreaTemplateId ? await getAreaTemplate(selectedAreaTemplateId) : null;

  return (
    <PageContainer>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-dash-ink">Standards</h1>
          <p className="mt-1 text-sm text-dash-muted">
            A bucket (e.g. &quot;Commercial Cleaning&quot;) holds reusable areas (e.g. &quot;Office&quot;,
            &quot;Toilet&quot;), each with its own checklist. Assign a bucket to a client, then build their
            checklist from the client&apos;s page by applying each area as many times as they need.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-5">
        <section
          aria-label="Standard buckets"
          className="flex min-w-0 flex-[1_1_220px] flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface p-2.5"
        >
          {buckets.map((b) => {
            const active = b.id === selectedBucketId;
            return (
              <a
                key={b.id}
                href={`/dashboard/admin/standards?bucket=${b.id}`}
                className={
                  "flex flex-col gap-0.5 rounded-[10px] px-3.5 py-3 " +
                  (active ? "bg-dash-brand-100 outline-2 outline-dash-brand-700 -outline-offset-2" : "")
                }
              >
                <span className="text-sm font-bold text-dash-ink">{b.name}</span>
                <span className="text-[13px] text-dash-muted">
                  {b.areaCount} area{b.areaCount === 1 ? "" : "s"} · {b.clientCount} client
                  {b.clientCount === 1 ? "" : "s"}
                </span>
              </a>
            );
          })}
          {buckets.length === 0 && <p className="px-3.5 py-3 text-sm text-dash-muted">No buckets yet.</p>}
          <NewStandardListDrawer />
        </section>

        {selectedBucket ? (
          <StandardListDetailPanel
            bucket={selectedBucket}
            selectedAreaTemplateId={selectedAreaTemplateId}
            allClients={clients.map((c) => ({ id: c.id, fullName: c.fullName }))}
          />
        ) : (
          <section className="flex min-w-0 flex-[1_1_320px] items-center justify-center rounded-2xl border border-dash-border bg-dash-surface p-10 text-sm text-dash-muted">
            Create a bucket to get started.
          </section>
        )}

        {selectedAreaTemplate ? (
          <AreaTemplatePanel areaTemplate={selectedAreaTemplate} />
        ) : (
          selectedBucket && (
            <section className="flex min-w-0 flex-[2_1_420px] items-center justify-center rounded-2xl border border-dash-border bg-dash-surface p-10 text-sm text-dash-muted">
              {selectedBucket.areaTemplates.length === 0
                ? "Add an area to this bucket to start building its checklist."
                : "Pick an area to see and edit its standards."}
            </section>
          )
        )}
      </div>
    </PageContainer>
  );
}
