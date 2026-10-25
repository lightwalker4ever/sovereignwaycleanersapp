import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { toDisplayCleaningStatus, aggregateChecklistByCleaning, type DisplayCleaningStatus } from "@/lib/cleaning-status";

export interface ScheduleRow {
  id: string;
  scheduledAt: string;
  clientName: string | null;
  address: string | null;
  cleanerName: string | null;
  supervisorName: string | null;
  checklistDone: number;
  checklistTotal: number;
  displayStatus: DisplayCleaningStatus;
}

export interface DashboardAlert {
  key: string;
  title: string;
  body: string;
  href: string;
  dotColor: string;
}

export interface WeekBar {
  day: string;
  count: number;
}

export interface LatestFeedbackEntry {
  id: string;
  clientName: string | null;
  cleanerName: string | null;
  rating: number | null;
  body: string;
  createdAt: string;
}

export interface AdminDashboardData {
  todaySchedule: ScheduleRow[];
  todayCounts: { completed: number; inProgress: number; scheduled: number; total: number };
  waitingForReview: { count: number; oldestAgeHours: number | null };
  firstTimePassRate: { pct: number | null; deltaPts: number | null };
  clientRating: { avg: number | null; count: number };
  alerts: DashboardAlert[];
  week: WeekBar[];
  latestFeedback: LatestFeedbackEntry[];
}

function startOfDay(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function addDays(d: Date, n: number) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/**
 * Just the live counts the admin sidebar's nav badges need. Deliberately
 * separate from getAdminDashboardData() -- this runs on every admin page
 * load (admin/layout.tsx), so it only queries what a badge actually
 * needs rather than the full dashboard's data. Covers both the
 * redesign's own nav items and the pre-existing Quote-and-Book admin
 * pages (Enquiries), which the handoff's mockups don't show but which
 * still need to stay reachable from the sidebar.
 */
export async function getAdminNavBadges(): Promise<{
  cleaningsInReview: number;
  enquiriesNew: number;
  quoteRequestsAwaiting: number;
}> {
  const admin = createAdminClient();
  const [
    { count: cleaningsInReview, error: cleaningsError },
    { count: enquiriesNew, error: enquiriesError },
    { count: quoteRequestsAwaiting, error: quoteRequestsError },
  ] = await Promise.all([
    admin.from("cleanings").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    admin.from("contact_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "awaiting_quote"),
  ]);
  if (cleaningsError) throw new Error(cleaningsError.message);
  if (enquiriesError) throw new Error(enquiriesError.message);
  if (quoteRequestsError) throw new Error(quoteRequestsError.message);
  return {
    cleaningsInReview: cleaningsInReview ?? 0,
    enquiriesNew: enquiriesNew ?? 0,
    quoteRequestsAwaiting: quoteRequestsAwaiting ?? 0,
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const weekStart = addDays(todayStart, -6);
  const thirtyDaysAgo = addDays(todayStart, -30);
  const sixtyDaysAgo = addDays(todayStart, -60);

  const [
    { data: cleanings, error: cleaningsError },
    { data: clients, error: clientsError },
    { data: profiles, error: profilesError },
    { data: comments, error: commentsError },
    { data: assignments, error: assignmentsError },
    { data: quoteRequests, error: quoteRequestsError },
  ] = await Promise.all([
    admin
      .from("cleanings")
      .select(
        "id, client_id, cleaner_id, supervisor_id, status, scheduled_at, started_at, submitted_at, completed_at, redo_count, created_at"
      )
      .order("scheduled_at", { ascending: true }),
    admin.from("clients").select("id, full_name, address"),
    admin.from("profiles").select("id, full_name"),
    admin.from("cleaning_comments").select("id, cleaning_id, rating, body, created_at"),
    admin.from("client_standard_assignments").select("client_id"),
    admin.from("quote_requests").select("id, status, created_at").eq("status", "draft"),
  ]);
  if (cleaningsError) throw new Error(cleaningsError.message);
  if (clientsError) throw new Error(clientsError.message);
  if (quoteRequestsError) throw new Error(quoteRequestsError.message);
  if (profilesError) throw new Error(profilesError.message);
  if (commentsError) throw new Error(commentsError.message);
  if (assignmentsError) throw new Error(assignmentsError.message);

  const allCleanings = cleanings ?? [];
  const cleaningIds = allCleanings.map((c) => c.id);
  const { data: checklist, error: checklistError } = cleaningIds.length
    ? await admin
        .from("cleaning_standards")
        .select("cleaning_id, review_status")
        .in("cleaning_id", cleaningIds)
    : { data: [], error: null };
  if (checklistError) throw new Error(checklistError.message);

  const clientById = new Map((clients ?? []).map((c) => [c.id, c]));
  const profileNameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const checklistByCleaningId = aggregateChecklistByCleaning(checklist ?? []);

  function displayStatusFor(c: (typeof allCleanings)[number]) {
    const agg = checklistByCleaningId.get(c.id);
    return toDisplayCleaningStatus(c.status, agg?.hasNotMet ?? false, c.scheduled_at, c.started_at);
  }

  // Today's schedule -- quoted/awaiting-confirmation/declined requests
  // aren't committed jobs yet (and may have a placeholder scheduled_at),
  // so they're surfaced via the "new booking requests" alert below instead.
  const todayCleanings = allCleanings.filter((c) => {
    if (c.status === "quoted" || c.status === "awaiting_confirmation" || c.status === "declined") return false;
    const t = new Date(c.scheduled_at);
    return t >= todayStart && t < todayEnd;
  });
  const todaySchedule: ScheduleRow[] = todayCleanings.map((c) => {
    const agg = checklistByCleaningId.get(c.id);
    const client = clientById.get(c.client_id);
    return {
      id: c.id,
      scheduledAt: c.scheduled_at,
      clientName: client?.full_name ?? null,
      address: client?.address ?? null,
      cleanerName: c.cleaner_id ? (profileNameById.get(c.cleaner_id) ?? null) : null,
      supervisorName: c.supervisor_id ? (profileNameById.get(c.supervisor_id) ?? null) : null,
      checklistDone: agg?.done ?? 0,
      checklistTotal: agg?.total ?? 0,
      displayStatus: displayStatusFor(c),
    };
  });

  const todayCounts = todaySchedule.reduce(
    (acc, r) => {
      if (r.displayStatus === "completed") acc.completed += 1;
      else if (r.displayStatus === "scheduled") acc.scheduled += 1;
      else acc.inProgress += 1;
      return acc;
    },
    { completed: 0, inProgress: 0, scheduled: 0, total: todaySchedule.length }
  );

  // Waiting for review
  const inReview = allCleanings.filter((c) => c.status === "in_review");
  const oldestSubmitted = inReview
    .map((c) => (c.submitted_at ? new Date(c.submitted_at).getTime() : null))
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)[0];
  const oldestAgeHours = oldestSubmitted ? Math.round((now.getTime() - oldestSubmitted) / 3_600_000) : null;

  // First-time pass rate, last 30 days vs the 30 days before that
  function passRateFor(from: Date, to: Date) {
    const completed = allCleanings.filter((c) => {
      if (c.status !== "completed" || !c.completed_at) return false;
      const t = new Date(c.completed_at);
      return t >= from && t < to;
    });
    if (completed.length === 0) return null;
    const firstTime = completed.filter((c) => c.redo_count === 0).length;
    return Math.round((firstTime / completed.length) * 100);
  }
  const currentPassRate = passRateFor(thirtyDaysAgo, todayEnd);
  const previousPassRate = passRateFor(sixtyDaysAgo, thirtyDaysAgo);
  const deltaPts =
    currentPassRate !== null && previousPassRate !== null ? currentPassRate - previousPassRate : null;

  // Client rating
  const ratedComments = (comments ?? []).filter((c) => typeof c.rating === "number");
  const clientRating = {
    avg:
      ratedComments.length > 0
        ? Math.round((ratedComments.reduce((s, c) => s + (c.rating ?? 0), 0) / ratedComments.length) * 10) / 10
        : null,
    count: ratedComments.length,
  };

  // Needs your attention
  const alerts: DashboardAlert[] = [];
  const unassignedToday = todaySchedule.find((r) => !r.cleanerName);
  if (unassignedToday) {
    alerts.push({
      key: "unassigned",
      title: `${new Date(unassignedToday.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} cleaning has no cleaner`,
      body: `${unassignedToday.clientName ?? "Unnamed client"} · assign someone before it starts`,
      href: "/dashboard/admin/cleanings",
      dotColor: "#C2410C",
    });
  }
  if (inReview.length > 0) {
    const oldestInReview = inReview
      .slice()
      .sort(
        (a, b) =>
          new Date(a.submitted_at ?? a.scheduled_at).getTime() -
          new Date(b.submitted_at ?? b.scheduled_at).getTime()
      )[0];
    const supName = (oldestInReview.supervisor_id ? profileNameById.get(oldestInReview.supervisor_id) : null) ?? "Supervisor";
    const oldestTime = new Date(oldestInReview.submitted_at ?? oldestInReview.scheduled_at).toLocaleTimeString(
      "en-GB",
      { hour: "2-digit", minute: "2-digit" }
    );
    alerts.push({
      key: "waiting-review",
      title: `${inReview.length} cleaning${inReview.length === 1 ? "" : "s"} waiting for review`,
      body: `${supName} · oldest from ${oldestTime}`,
      href: "/dashboard/admin/cleanings",
      dotColor: "#1C4F8F",
    });
  }
  const changesRequested = allCleanings.filter((c) => displayStatusFor(c) === "changes_requested");
  if (changesRequested.length > 0) {
    const c = changesRequested[0];
    const client = clientById.get(c.client_id);
    const cleanerName = (c.cleaner_id ? profileNameById.get(c.cleaner_id) : null) ?? "the cleaner";
    alerts.push({
      key: "changes-requested",
      title: `${client?.full_name ?? "A client"}: standards not met`,
      body: `Sent back to ${cleanerName} for a redo`,
      href: "/dashboard/admin/cleanings",
      dotColor: "#B45309",
    });
  }
  const assignedClientIds = new Set((assignments ?? []).map((a) => a.client_id));
  const clientWithoutStandards = (clients ?? []).find((c) => !assignedClientIds.has(c.id));
  if (clientWithoutStandards) {
    alerts.push({
      key: "no-standards",
      title: `${clientWithoutStandards.full_name ?? "A client"} has no standards list`,
      body: "Assign one so future checklists are complete",
      href: "/dashboard/admin/standards",
      dotColor: "#55615A",
    });
  }
  const bookingRequests = allCleanings.filter((c) => c.status === "awaiting_confirmation");
  if (bookingRequests.length > 0) {
    alerts.push({
      key: "booking-requests",
      title: `${bookingRequests.length} new booking request${bookingRequests.length === 1 ? "" : "s"}`,
      body: "From the website -- confirm, propose another date, or decline",
      href: "/dashboard/admin/cleanings?status=awaiting_confirmation",
      dotColor: "#7A4B00",
    });
  }

  // Phase E of the persisted-quote work: a quote the customer saw but
  // never submitted (instant-price 'quoted') or a tailored request
  // they started but never sent ('draft'), both over 48h old -- worth
  // a proactive nudge rather than waiting on the customer to come
  // back. Only the pre-submission states count here, same reasoning
  // as listClientPendingQuotes's expiry: a submitted-but-unpriced or
  // already-priced tailored request is live business, not abandoned.
  const ABANDONED_THRESHOLD_MS = 48 * 3_600_000;
  const abandonedCutoff = now.getTime() - ABANDONED_THRESHOLD_MS;
  const abandonedQuotes = allCleanings.filter(
    (c) => c.status === "quoted" && new Date(c.created_at).getTime() < abandonedCutoff
  );
  const abandonedRequests = (quoteRequests ?? []).filter(
    (r) => new Date(r.created_at).getTime() < abandonedCutoff
  );
  const abandonedTotal = abandonedQuotes.length + abandonedRequests.length;
  if (abandonedTotal > 0) {
    alerts.push({
      key: "abandoned-quotes",
      title: `${abandonedTotal} quote${abandonedTotal === 1 ? "" : "s"} may need a follow-up`,
      body: "Seen a price but haven't booked yet -- send a reminder from the quote",
      href: "/dashboard/admin/cleanings?status=quoted",
      dotColor: "#1C4F8F",
    });
  }

  // Cleanings completed, last 7 days
  const week: WeekBar[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = addDays(weekStart, i);
    const dayEnd = addDays(dayStart, 1);
    const count = allCleanings.filter((c) => {
      if (c.status !== "completed" || !c.completed_at) return false;
      const t = new Date(c.completed_at);
      return t >= dayStart && t < dayEnd;
    }).length;
    week.push({ day: dayStart.toLocaleDateString("en-GB", { weekday: "short" }), count });
  }

  // Latest feedback
  const cleaningById = new Map(allCleanings.map((c) => [c.id, c]));
  const latestFeedback: LatestFeedbackEntry[] = (comments ?? [])
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
    .map((c) => {
      const cleaning = cleaningById.get(c.cleaning_id);
      const client = cleaning ? clientById.get(cleaning.client_id) : undefined;
      return {
        id: c.id,
        clientName: client?.full_name ?? null,
        cleanerName: cleaning?.cleaner_id ? (profileNameById.get(cleaning.cleaner_id) ?? null) : null,
        rating: c.rating,
        body: c.body,
        createdAt: c.created_at,
      };
    });

  return {
    todaySchedule,
    todayCounts,
    waitingForReview: { count: inReview.length, oldestAgeHours },
    firstTimePassRate: { pct: currentPassRate, deltaPts },
    clientRating,
    alerts: alerts.slice(0, 4),
    week,
    latestFeedback,
  };
}
