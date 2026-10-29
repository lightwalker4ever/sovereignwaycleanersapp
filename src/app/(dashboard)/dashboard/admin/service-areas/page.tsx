import { listCleanersWithServiceAreas } from "./actions";
import { CleanerServiceAreaEditor } from "@/components/admin/CleanerServiceAreaEditor";
import { PageContainer } from "@/components/shell/PageContainer";

export default async function ServiceAreasPage() {
  const cleaners = await listCleanersWithServiceAreas();

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Service Areas</h1>
        <p className="mt-1 text-sm text-gray-600">
          Which areas each cleaner covers, used to match them to a customer&apos;s postcode in the
          instant-quote booking flow. A cleaner with no areas listed covers everywhere — add areas
          only to restrict a cleaner to specific districts, regions, or postcode prefixes. Enter
          District/Region values exactly as they appear on postcodes.io (e.g. &quot;Tonbridge and
          Malling&quot;, &quot;South East&quot;); Postcode area values should be the bare area
          letters only (e.g. &quot;TN&quot;, &quot;SE&quot;), not a full postcode or outcode. If a
          customer&apos;s postcode can&apos;t be resolved at all, this restriction is skipped and
          matching falls back to availability only.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {cleaners.map((cleaner) => (
          <CleanerServiceAreaEditor key={cleaner.id} cleanerId={cleaner.id} fullName={cleaner.fullName} initialAreas={cleaner.areas} />
        ))}
        {cleaners.length === 0 && (
          <p className="rounded-lg p-4 text-center text-sm text-gray-400 ring-1 ring-foreground/10">
            No cleaners yet.
          </p>
        )}
      </div>
    </PageContainer>
  );
}
