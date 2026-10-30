"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerSection,
} from "@/components/ui/Drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getCleaningRequestDetail,
  confirmCleaningRequest,
  proposeAnotherDate,
  declineCleaningRequest,
  sendQuoteReminder,
  type CleaningRequestDetail,
  type AssignableStaff,
  type SupervisorWeeklyDuty,
  type SupervisorDutyException,
} from "@/app/(dashboard)/dashboard/admin/cleanings/actions";
import { ARRIVAL_WINDOWS } from "@/lib/quote-config";
import { formatPropertyAnswers, type QuoteServiceKey } from "@/lib/quote-calculations";
import { isSupervisorOnDuty } from "@/lib/supervisor-duty";

/**
 * "X is on duty that day" / "X isn't normally on duty that day" --
 * advisory only, same reasoning and shape as CreateCleaningForm.tsx's
 * own supervisorHint(): Confirm & schedule is where a supervisor is
 * durably assigned, but admin can still override if they know better.
 */
function supervisorHint(
  supervisorId: string,
  supervisorName: string | null | undefined,
  date: string,
  weekly: SupervisorWeeklyDuty[],
  exceptions: SupervisorDutyException[]
): { text: string; ok: boolean } | null {
  if (!supervisorId || !date || !supervisorName) return null;
  const onDuty = isSupervisorOnDuty(supervisorId, date, weekly, exceptions);
  return onDuty
    ? { text: `${supervisorName} is on duty that day`, ok: true }
    : { text: `${supervisorName} isn't normally on duty that day`, ok: false };
}

const fieldClassName =
  "h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700";
const selectTriggerClassName = "h-11 w-full rounded-[10px] border-dash-input-border";
const labelClassName = "text-sm font-semibold text-dash-ink";

type Mode = "view" | "confirm" | "propose" | "decline";

const INSTANT_SERVICE_KEYS: QuoteServiceKey[] = ["end_of_tenancy", "deep_cleaning", "office_cleaning"];

function accessLabel(method: string | null): string {
  if (method === "present") return "I'll be there";
  if (method === "key_safe") return "Key safe / lockbox";
  if (method === "agent_keys") return "Collect keys from agent";
  return "Not specified";
}

export function RequestDrawer({
  cleaningId,
  open,
  onOpenChange,
  cleaners,
  supervisors,
  supervisorAvailability,
  standardLists,
}: {
  cleaningId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cleaners: AssignableStaff[];
  supervisors: AssignableStaff[];
  supervisorAvailability: { weekly: SupervisorWeeklyDuty[]; exceptions: SupervisorDutyException[] };
  standardLists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<CleaningRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  const [cleanerId, setCleanerId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [standardListId, setStandardListId] = useState("");
  const [proposeDate, setProposeDate] = useState("");
  const [proposeWindow, setProposeWindow] = useState<string>("morning");
  const [reason, setReason] = useState("");
  const [reminderSent, setReminderSent] = useState(false);
  const [sendingReminder, startSendingReminder] = useTransition();

  const selectedSupervisor = supervisors.find((s) => s.id === supervisorId);
  const supervisorHintResult = supervisorHint(
    supervisorId,
    selectedSupervisor?.fullName ?? selectedSupervisor?.email,
    date,
    supervisorAvailability.weekly,
    supervisorAvailability.exceptions
  );

  useEffect(() => {
    if (!open) return;
    // Resetting the drawer's own state on open is a genuine side effect
    // tied to fetching fresh data from the server below, not a derivable
    // value -- not the lint rule's dead-code case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("view");
    setError(null);
    setReminderSent(false);
    setLoading(true);
    getCleaningRequestDetail(cleaningId).then((d) => {
      setDetail(d);
      setLoading(false);
      if (d?.requestedDate) {
        setDate(d.requestedDate);
        setProposeDate(d.requestedDate);
      }
      if (d?.requestedWindow) setProposeWindow(d.requestedWindow);
      setStandardListId(d?.currentStandardListId ?? "");
      setCleanerId(d?.currentCleanerId ?? "");
    });
  }, [open, cleaningId]);

  function refreshDetail() {
    getCleaningRequestDetail(cleaningId).then(setDetail);
  }

  function handleSendReminder() {
    setError(null);
    startSendingReminder(async () => {
      const result = await sendQuoteReminder(cleaningId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReminderSent(true);
    });
  }

  function handleConfirm() {
    setError(null);
    startPending(async () => {
      const result = await confirmCleaningRequest({
        cleaningId,
        cleanerId,
        supervisorId,
        date,
        time,
        standardListId: standardListId || undefined,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handlePropose() {
    setError(null);
    startPending(async () => {
      const result = await proposeAnotherDate({ cleaningId, date: proposeDate, window: proposeWindow });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setMode("view");
      refreshDetail();
      router.refresh();
    });
  }

  function handleDecline() {
    setError(null);
    startPending(async () => {
      const result = await declineCleaningRequest({ cleaningId, reason });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const windowLabel = (key: string | null) => ARRIVAL_WINDOWS.find((w) => w.key === key)?.label ?? "Not chosen";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex flex-col gap-0.5">
            <DrawerTitle>{detail ? `${detail.serviceTitle} request` : "Booking request"}</DrawerTitle>
            {detail && <span className="text-xs font-semibold text-dash-muted">{detail.reference}</span>}
          </div>
          <DrawerClose />
        </DrawerHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-dash-muted">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          )}

          {!loading && detail && (
            <>
              <DrawerSection label="Customer">
                <div className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-dash-ink">{detail.clientName ?? "Unnamed"}</span>
                  <span className="text-dash-muted">{detail.clientEmail}</span>
                  <span className="text-dash-muted">{detail.clientPhone}</span>
                  <span className="text-dash-muted">{detail.clientAddress}</span>
                </div>
              </DrawerSection>

              <DrawerSection label="Requested">
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dash-muted">Date</span>
                    <span className="font-semibold">
                      {detail.requestedDate
                        ? new Date(`${detail.requestedDate}T00:00:00`).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        : "Not chosen"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dash-muted">Arrival</span>
                    <span className="font-semibold">
                      {detail.isFlexible ? "Any time (flexible)" : windowLabel(detail.requestedWindow)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dash-muted">Access</span>
                    <span className="font-semibold">{accessLabel(detail.accessMethod)}</span>
                  </div>
                  {detail.accessNotes && <p className="text-dash-ink-2">{detail.accessNotes}</p>}
                </div>
              </DrawerSection>

              {detail.propertyAnswers && INSTANT_SERVICE_KEYS.includes(detail.service as QuoteServiceKey) && (
                <DrawerSection label="Property">
                  <div className="flex flex-col gap-1 text-sm text-dash-ink-2">
                    {formatPropertyAnswers(detail.service as QuoteServiceKey, detail.propertyAnswers).map((row) => (
                      <div key={row.label} className="flex justify-between gap-2">
                        <span className="text-dash-muted">{row.label}</span>
                        <span className="font-semibold">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </DrawerSection>
              )}

              {detail.priceBreakdown && (
                <DrawerSection label="Price">
                  <div className="flex flex-col gap-1.5 text-sm">
                    {detail.priceBreakdown.lineItems.map((l, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-dash-ink-2">{l.label}</span>
                        <span className="font-semibold">£{l.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-dash-border pt-1.5 font-bold">
                      <span>Total (inc. VAT)</span>
                      <span>£{detail.priceBreakdown.totalIncVat.toFixed(2)}</span>
                    </div>
                  </div>
                </DrawerSection>
              )}

              {detail.status === "declined" && detail.declineReason && (
                <DrawerSection label="Decline reason">
                  <p className="text-sm text-dash-danger">{detail.declineReason}</p>
                </DrawerSection>
              )}

              {detail.status === "quoted" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-dash-ink-2">
                    The customer saw this price but hasn&apos;t requested the booking yet.
                  </p>
                  {reminderSent ? (
                    <p className="text-sm font-semibold text-[#155B33]">Reminder sent.</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendReminder}
                      disabled={sendingReminder}
                      className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink disabled:opacity-60"
                    >
                      {sendingReminder && <Loader2 className="size-4 animate-spin" />}
                      Send reminder email
                    </button>
                  )}
                  {error && <p className="text-sm text-dash-danger">{error}</p>}
                </div>
              )}

              {detail.status === "awaiting_confirmation" && mode === "view" && (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("confirm")}
                    className="h-11 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white"
                  >
                    Confirm & schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("propose")}
                    className="h-11 rounded-[10px] border border-dash-input-border bg-white text-sm font-semibold text-dash-ink"
                  >
                    Propose another date
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("decline")}
                    className="h-11 rounded-[10px] border border-dash-danger text-sm font-semibold text-dash-danger"
                  >
                    Decline
                  </button>
                </div>
              )}

              {mode === "confirm" && (
                <DrawerSection label="Confirm & schedule">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className={labelClassName}>Cleaner</label>
                      <Select value={cleanerId} onValueChange={(v) => setCleanerId(v ?? "")}>
                        <SelectTrigger className={selectTriggerClassName}>
                          <SelectValue>{(val: string | null) => cleaners.find((c) => c.id === val)?.fullName ?? "Choose a cleaner"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {cleaners.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.fullName || c.email || "Unnamed"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClassName}>Supervisor</label>
                      <Select value={supervisorId} onValueChange={(v) => setSupervisorId(v ?? "")}>
                        <SelectTrigger className={selectTriggerClassName}>
                          <SelectValue>{(val: string | null) => supervisors.find((s) => s.id === val)?.fullName ?? "Choose a supervisor"}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {supervisors.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.fullName || s.email || "Unnamed"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {supervisorHintResult && (
                    <span className={`text-[13px] font-semibold ${supervisorHintResult.ok ? "text-[#155B33]" : "text-[#9A3A0B]"}`}>
                      {supervisorHintResult.ok ? "✓ " : ""}
                      {supervisorHintResult.text}
                    </span>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className={labelClassName} htmlFor="confirm-date">Date</label>
                      <input id="confirm-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={fieldClassName} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClassName} htmlFor="confirm-time">Start time</label>
                      <input id="confirm-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={fieldClassName} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className={labelClassName}>Standards list</label>
                    <Select
                      value={standardListId}
                      onValueChange={(v) => {
                        if (v === "__create_new__") {
                          window.open("/dashboard/admin/standards", "_blank", "noopener,noreferrer");
                          return;
                        }
                        setStandardListId(v ?? "");
                      }}
                    >
                      <SelectTrigger className={selectTriggerClassName}>
                        <SelectValue>{(val: string | null) => standardLists.find((l) => l.id === val)?.name ?? "Select a standard list"}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {standardLists.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__create_new__">+ Create new list…</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-dash-muted">
                      {"Create new list… opens Standards in a new tab -- come back here once it's set up."}
                    </p>
                  </div>
                  {error && <p className="text-sm text-dash-danger">{error}</p>}
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => setMode("view")} className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirm}
                      disabled={pending || !standardListId}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {pending && <Loader2 className="size-4 animate-spin" />}
                      Confirm
                    </button>
                  </div>
                </DrawerSection>
              )}

              {mode === "propose" && (
                <DrawerSection label="Propose another date">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1.5">
                      <label className={labelClassName} htmlFor="propose-date">Date</label>
                      <input id="propose-date" type="date" value={proposeDate} onChange={(e) => setProposeDate(e.target.value)} className={fieldClassName} />
                    </div>
                    <div className="space-y-1.5">
                      <label className={labelClassName}>Window</label>
                      <Select value={proposeWindow} onValueChange={(v) => setProposeWindow(v ?? "morning")}>
                        <SelectTrigger className={selectTriggerClassName}>
                          <SelectValue>{(val: string | null) => windowLabel(val)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {ARRIVAL_WINDOWS.map((w) => (
                            <SelectItem key={w.key} value={w.key}>
                              {w.label} ({w.time})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {error && <p className="text-sm text-dash-danger">{error}</p>}
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => setMode("view")} className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handlePropose}
                      disabled={pending}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {pending && <Loader2 className="size-4 animate-spin" />}
                      Send proposal
                    </button>
                  </div>
                </DrawerSection>
              )}

              {mode === "decline" && (
                <DrawerSection label="Decline">
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason to share with the customer"
                    className="w-full resize-y rounded-[10px] border border-dash-input-border px-3 py-2.5 text-sm text-dash-ink outline-none focus:border-dash-brand-700"
                  />
                  {error && <p className="text-sm text-dash-danger">{error}</p>}
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => setMode("view")} className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleDecline}
                      disabled={pending}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-danger text-sm font-bold text-white disabled:opacity-60"
                    >
                      {pending && <Loader2 className="size-4 animate-spin" />}
                      Decline request
                    </button>
                  </div>
                </DrawerSection>
              )}
            </>
          )}
        </div>

        <DrawerFooter>
          <DrawerClose className="h-11 w-auto rounded-[10px] border border-dash-input-border bg-white px-[18px] text-sm font-semibold text-dash-ink">
            Close
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
