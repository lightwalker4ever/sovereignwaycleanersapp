/**
 * Pure, DB-free resolution rule -- exception for the exact date wins,
 * otherwise falls back to the weekly template. Deliberately kept out of
 * supervisor-availability.ts (which imports "server-only") so admin's
 * manual-assignment forms (CreateCleaningForm/RequestDrawer, both "use
 * client") can import it directly: they prefetch a small window of
 * weekly+exception rows once and resolve client-side rather than
 * round-tripping per date/supervisor change -- same reasoning as
 * windowForScheduledAt()/expandBusyWindowsWithBuffer() living in
 * quote-config.ts instead of the "server-only" cleaner-availability.ts.
 */
export function isSupervisorOnDuty(
  supervisorId: string,
  dateIso: string,
  weekly: { supervisorId: string; dayOfWeek: number }[],
  exceptions: { supervisorId: string; date: string; type: "available" | "unavailable" }[]
): boolean {
  const exception = exceptions.find((e) => e.supervisorId === supervisorId && e.date === dateIso);
  if (exception) return exception.type === "available";

  const dayOfWeek = new Date(`${dateIso}T00:00:00`).getDay();
  return weekly.some((w) => w.supervisorId === supervisorId && w.dayOfWeek === dayOfWeek);
}
