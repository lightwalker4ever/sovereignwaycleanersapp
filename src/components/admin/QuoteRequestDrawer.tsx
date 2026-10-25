"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  getQuoteRequestDetail,
  sendQuoteForRequest,
  declineQuoteRequest,
  sendTailoredDraftReminder,
  type QuoteRequestDetail,
} from "@/app/(dashboard)/dashboard/admin/quote-requests/actions";

type Mode = "view" | "quote" | "decline";

export function QuoteRequestDrawer({
  requestId,
  open,
  onOpenChange,
}: {
  requestId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<QuoteRequestDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();
  const [reminderSent, setReminderSent] = useState(false);
  const [sendingReminder, startSendingReminder] = useTransition();

  useEffect(() => {
    if (!open) return;
    // Genuine data fetch tied to the drawer opening, not a derivable
    // value -- same hydration-safe pattern used elsewhere in this flow.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode("view");
    setError(null);
    setReminderSent(false);
    setLoading(true);
    getQuoteRequestDetail(requestId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
  }, [open, requestId]);

  function handleSendReminder() {
    setError(null);
    startSendingReminder(async () => {
      const result = await sendTailoredDraftReminder(requestId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setReminderSent(true);
    });
  }

  function handleSendQuote() {
    setError(null);
    startPending(async () => {
      const result = await sendQuoteForRequest(requestId, Number(price));
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleDecline() {
    setError(null);
    startPending(async () => {
      const result = await declineQuoteRequest(requestId, reason);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <div className="flex flex-col gap-0.5">
            <DrawerTitle>{detail ? `${detail.serviceTitle} request` : "Quote request"}</DrawerTitle>
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
                  <span className="text-dash-muted">{detail.clientAddress || detail.postcode}</span>
                </div>
              </DrawerSection>

              <DrawerSection label="About the job">
                <div className="flex flex-col gap-1.5 text-sm">
                  {Object.entries(detail.answers).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-2">
                      <span className="text-dash-muted">{key}</span>
                      <span className="font-semibold">{String(value)}</span>
                    </div>
                  ))}
                  {detail.notes && <p className="mt-1 text-dash-ink-2">{detail.notes}</p>}
                </div>
              </DrawerSection>

              {detail.photos.length > 0 && (
                <DrawerSection label="Photos">
                  <div className="flex flex-wrap gap-2">
                    {detail.photos.map((p) =>
                      p.signedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={p.storagePath}
                          src={p.signedUrl}
                          alt=""
                          className="h-20 w-20 rounded-xl object-cover"
                        />
                      ) : (
                        <span key={p.storagePath} className="flex h-20 w-20 items-center justify-center rounded-xl bg-dash-photo text-[11px] text-dash-muted">
                          Unavailable
                        </span>
                      )
                    )}
                  </div>
                </DrawerSection>
              )}

              {detail.status === "declined" && detail.declineReason && (
                <DrawerSection label="Decline reason">
                  <p className="text-sm text-dash-danger">{detail.declineReason}</p>
                </DrawerSection>
              )}
              {(detail.status === "quoted" || detail.status === "converted") && detail.quotedPrice && (
                <DrawerSection label="Quoted price">
                  <p className="text-lg font-extrabold text-dash-ink">£{detail.quotedPrice.toFixed(2)}</p>
                </DrawerSection>
              )}

              {detail.status === "quoted" && (
                <p className="text-sm text-dash-ink-2">
                  Waiting on the customer to accept or decline (they got a link in the quote email).
                </p>
              )}

              {detail.status === "converted" && detail.cleaningId && (
                <Link
                  href={`/dashboard/admin/cleanings/${detail.cleaningId}`}
                  className="flex h-11 items-center justify-center rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white"
                >
                  View cleaning
                </Link>
              )}

              {detail.status === "draft" && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-dash-ink-2">
                    The customer started this request but hasn&apos;t sent it to us yet.
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

              {detail.status === "awaiting_quote" && mode === "view" && (
                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("quote")}
                    className="h-11 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white"
                  >
                    Send quote
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

              {mode === "quote" && (
                <DrawerSection label="Send quote">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-dash-ink" htmlFor="quote-price">
                      Price (£, inc. VAT)
                    </label>
                    <input
                      id="quote-price"
                      type="number"
                      min={0}
                      step="0.01"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm outline-none focus:border-dash-brand-700"
                    />
                  </div>
                  {error && <p className="text-sm text-dash-danger">{error}</p>}
                  <div className="flex gap-2.5">
                    <button type="button" onClick={() => setMode("view")} className="h-11 flex-1 rounded-[10px] border border-dash-input-border text-sm font-semibold text-dash-ink">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleSendQuote}
                      disabled={pending}
                      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {pending && <Loader2 className="size-4 animate-spin" />}
                      Send
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
