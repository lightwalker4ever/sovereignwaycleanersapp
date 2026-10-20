import { notFound } from "next/navigation";
import Link from "next/link";
import { ClipboardCheck, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { PageContainer } from "@/components/shell/PageContainer";
import { StatusPill } from "@/components/ui/StatusPill";
import { toDisplayCleaningStatus } from "@/lib/cleaning-status";
import { capitalize } from "@/lib/utils";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getMyReviewDetail } from "../actions";
import { ReviewWorkspace } from "@/components/supervisor/ReviewWorkspace";
import type { ShellNavItem } from "@/components/shell/types";

export default async function SupervisorReviewDetailPage({
  params,
}: {
  params: Promise<{ cleaningId: string }>;
}) {
  const { cleaningId } = await params;
  const cleaning = await getMyReviewDetail(cleaningId);
  if (!cleaning) notFound();

  if (cleaning.status === "in_review") {
    return <ReviewWorkspace cleaning={cleaning} />;
  }

  const user = await getCurrentUser();
  const fullName = user?.fullName ?? user?.email ?? "";
  const initials = fullName
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navItems: ShellNavItem[] = [
    { href: "/dashboard/supervisor", label: "Review queue", icon: <ClipboardCheck size={20} strokeWidth={1.8} aria-hidden="true" /> },
    { href: "/dashboard/supervisor/cleanings", label: "Cleanings", icon: <CalendarDays size={20} strokeWidth={1.8} aria-hidden="true" /> },
  ];

  const hasNotMet = cleaning.checklist.some((i) => i.reviewStatus === "not_met");
  const displayStatus = toDisplayCleaningStatus(cleaning.status, hasNotMet);

  return (
    <AppShell
      navItems={navItems}
      user={{ initials: initials || "?", name: fullName, roleLabel: capitalize(user?.role ?? "supervisor") }}
    >
      <PageContainer>
        <div>
          <Link href="/dashboard/supervisor/cleanings" className="text-sm text-dash-muted hover:underline">
            ← Your cleanings
          </Link>
          <div className="mt-1 flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold text-dash-ink">{cleaning.clientName || "Unnamed client"}</h1>
            <StatusPill status={displayStatus} />
          </div>
          <p className="mt-1 text-sm text-dash-muted">Cleaned by {cleaning.cleanerName || "Unassigned"}</p>
          {cleaning.notes && <p className="mt-2 text-sm text-dash-muted">{cleaning.notes}</p>}
        </div>

        <div className="rounded-2xl border border-dash-border bg-dash-surface p-5">
          <h2 className="mb-1 text-lg font-bold text-dash-ink">Checklist</h2>
          <p className="mb-4 text-sm text-dash-muted">
            {cleaning.status === "completed"
              ? "This job is complete -- read-only."
              : "This job isn't currently awaiting your review -- read-only."}
          </p>
          <div className="divide-y divide-dash-border-soft rounded-lg border border-dash-border">
            {cleaning.checklist.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-dash-ink">{item.title}</p>
                  {item.description && <p className="text-sm text-dash-muted">{item.description}</p>}
                </div>
                <StatusPill
                  status={item.reviewStatus === "met" ? "completed" : item.reviewStatus === "not_met" ? "changes_requested" : "scheduled"}
                />
              </div>
            ))}
            {cleaning.checklist.length === 0 && (
              <p className="p-4 text-center text-sm text-dash-muted">No checklist items.</p>
            )}
          </div>
        </div>

        {cleaning.comments.length > 0 && (
          <div className="rounded-2xl border border-dash-border bg-dash-surface p-5">
            <h2 className="mb-3 text-lg font-bold text-dash-ink">Client feedback</h2>
            <div className="space-y-3">
              {cleaning.comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-dash-bg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-dash-ink">{c.authorName || "Client"}</p>
                    <p className="text-xs text-dash-muted">{new Date(c.createdAt).toLocaleDateString("en-GB")}</p>
                  </div>
                  <p className="mt-1 text-sm whitespace-pre-wrap text-dash-ink-2">{c.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}

