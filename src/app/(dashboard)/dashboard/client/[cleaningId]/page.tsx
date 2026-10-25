import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, MapPin } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { toDisplayCleaningStatus } from "@/lib/cleaning-status";
import { googleMapsUrl } from "@/lib/maps";
import { getMyCleaningDetailAsClient } from "../actions";
import { ClientJobHero } from "@/components/client/ClientJobHero";
import { RateCleaningForm } from "@/components/client/RateCleaningForm";
import { AllPhotosToggle } from "@/components/client/AllPhotosToggle";

function formatTimeRange(scheduledAt: string, endsAt: string | null): string {
  const start = new Date(scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!endsAt) return start;
  const end = new Date(endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${start}–${end}`;
}

export default async function ClientCleaningDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyCleaningDetailAsClient(cleaningId);
  if (!cleaning) notFound();

  const hasNotMet = cleaning.checklist.some((i) => i.reviewStatus === "not_met");
  const displayStatus = toDisplayCleaningStatus(cleaning.status, hasNotMet, cleaning.scheduledAt, cleaning.startedAt);
  const isCompleted = cleaning.status === "completed";
  const done = cleaning.checklist.filter((i) => i.reviewStatus === "met").length;
  const myRating = cleaning.comments.find((c) => c.rating !== null)?.rating ?? null;
  const allPhotos = cleaning.checklist.flatMap((i) => i.photos);

  return (
    <div className="flex min-h-dvh flex-col bg-dash-bg font-sans text-dash-ink">
      <header className="flex items-center gap-1.5 border-b border-dash-border bg-dash-surface px-2 py-3.5">
        <Link href="/dashboard/client" aria-label="Back to Home" className="flex h-11 w-11 shrink-0 items-center justify-center text-dash-ink">
          <ArrowLeft size={22} aria-hidden="true" />
        </Link>
        <div className="flex flex-1 flex-col">
          <h1 className="text-lg font-extrabold">
            Cleaning on {new Date(cleaning.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </h1>
          <span className="text-[13px] text-dash-muted">
            {formatTimeRange(cleaning.scheduledAt, cleaning.endsAt)}
            {cleaning.cleanerName ? ` · ${cleaning.cleanerName}` : ""}
          </span>
        </div>
        <StatusPill status={displayStatus} className="shrink-0" />
      </header>

      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        {cleaning.clientAddress && (
          <section className="flex items-center justify-between gap-3 rounded-2xl border border-dash-border bg-dash-surface px-4 py-3.5">
            <span className="flex items-center gap-2 text-sm text-dash-ink-2">
              <MapPin size={16} className="shrink-0 text-dash-muted" aria-hidden="true" />
              {cleaning.clientAddress}
            </span>
            <a
              href={googleMapsUrl(cleaning.clientAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-[13px] font-bold text-dash-brand-700"
            >
              Directions
            </a>
          </section>
        )}

        {!isCompleted && (
          <ClientJobHero
            card={{
              id: cleaning.id,
              cleanerName: cleaning.cleanerName,
              supervisorName: cleaning.supervisorName,
              scheduledAt: cleaning.scheduledAt,
              endsAt: cleaning.endsAt,
              startedAt: cleaning.startedAt,
              submittedAt: cleaning.submittedAt,
              completedAt: cleaning.completedAt,
              displayStatus,
              done,
              total: cleaning.checklist.length,
              myRating,
            }}
          />
        )}

        {isCompleted && (
          <>
            <section className="flex items-center gap-3 rounded-2xl bg-dash-brand-100 px-4 py-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-dash-brand-700 text-white">
                <Check size={22} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-base font-extrabold text-dash-brand-900">
                  All {cleaning.checklist.length} standard{cleaning.checklist.length === 1 ? "" : "s"} met
                </span>
                <span className="text-[13px] text-[#155B33]">
                  Checked and signed off by {cleaning.supervisorName || "your supervisor"}
                  {cleaning.completedAt
                    ? ` at ${new Date(cleaning.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                    : ""}
                </span>
              </span>
            </section>

            <section aria-label="Checklist results" className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
              {cleaning.checklist.map((item) => (
                <div key={item.id} className="flex items-center gap-3 border-b border-dash-border-soft px-3.5 py-3 last:border-b-0">
                  <span className="h-16 w-16 shrink-0">
                    <PhotoTile signedUrl={item.photos[0]?.signedUrl} square />
                  </span>
                  <span className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">{item.title}</span>
                    <span className="text-xs text-dash-muted">
                      {item.area || "General"} &middot; {item.photos.length} photo{item.photos.length === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span className="text-xs font-bold text-[#155B33]">&#10003; Met</span>
                </div>
              ))}
              {cleaning.checklist.length === 0 && <p className="px-4 py-6 text-center text-sm text-dash-muted">No checklist items.</p>}
              <AllPhotosToggle photos={allPhotos} />
            </section>

            <RateCleaningForm cleaningId={cleaning.id} initialRating={myRating} />
          </>
        )}
      </div>
    </div>
  );
}
