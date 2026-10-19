"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Loader2, Plus, Undo2, X } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { Textarea } from "@/components/ui/textarea";
import {
  setStandardReview,
  uploadSupervisorPhoto,
  deleteSupervisorPhoto,
  finalizeCleaning,
  sendBackToCleaner,
} from "@/app/(dashboard)/dashboard/supervisor/actions";
import type { CleaningDetailForParty, CleaningChecklistItem } from "@/lib/cleanings";

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

export function ReviewWorkspace({ cleaning }: { cleaning: CleaningDetailForParty }) {
  const router = useRouter();
  const [items, setItems] = useState<CleaningChecklistItem[]>(cleaning.checklist);
  // router.refresh() (after a photo upload/delete) re-renders the parent
  // Server Component and hands us a new `cleaning` prop, but useState's
  // initial value only applies on first mount -- without this, newly
  // uploaded/deleted photos would never reach `items`. Comparing the
  // previous prop to the current one and resetting during render (rather
  // than in an effect) is safe here because it's this component updating
  // its own state from its own prop, not notifying a different component.
  const [syncedChecklist, setSyncedChecklist] = useState(cleaning.checklist);
  if (cleaning.checklist !== syncedChecklist) {
    setSyncedChecklist(cleaning.checklist);
    setItems(cleaning.checklist);
  }
  const [currentId, setCurrentId] = useState<string>(
    () => items.find((i) => i.reviewStatus === "pending")?.id ?? items[0]?.id ?? ""
  );
  const [draftComment, setDraftComment] = useState<string>(
    () => items.find((i) => i.id === currentId)?.supervisorComment ?? ""
  );
  const [commentWarning, setCommentWarning] = useState(false);
  const [markError, setMarkError] = useState<string | null>(null);
  const [isMarking, startMarking] = useTransition();
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPhotoBusy, startPhotoBusy] = useTransition();
  const [footerError, setFooterError] = useState<string | null>(null);
  const [isFooterBusy, startFooterBusy] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentIndex = Math.max(0, items.findIndex((i) => i.id === currentId));
  const current = items[currentIndex];

  const markedCount = items.filter((i) => i.reviewStatus !== "pending").length;
  const notMetCount = items.filter((i) => i.reviewStatus === "not_met").length;
  const leftCount = items.length - markedCount;
  const allMet = items.length > 0 && leftCount === 0 && notMetCount === 0;

  function selectItem(id: string) {
    setCurrentId(id);
    setCommentWarning(false);
    setMarkError(null);
    setPhotoError(null);
    setDraftComment(items.find((i) => i.id === id)?.supervisorComment ?? "");
  }

  function mark(next: "met" | "not_met") {
    if (!current || isMarking) return;
    if (next === "not_met" && !draftComment.trim()) {
      setCommentWarning(true);
      return;
    }
    setCommentWarning(false);
    setMarkError(null);

    const previousStatus = current.reviewStatus;
    const previousComment = current.supervisorComment;
    const comment = draftComment.trim() || null;
    const updated = items.map((i) => (i.id === current.id ? { ...i, reviewStatus: next, supervisorComment: comment } : i));
    setItems(updated);

    startMarking(async () => {
      try {
        await setStandardReview(current.id, next, comment);
        const nextPending = updated.find((i) => i.reviewStatus === "pending");
        if (nextPending) selectItem(nextPending.id);
      } catch (e) {
        setItems((list) =>
          list.map((i) => (i.id === current.id ? { ...i, reviewStatus: previousStatus, supervisorComment: previousComment } : i))
        );
        setMarkError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function handleAddPhoto(file: File) {
    if (!current) return;
    setPhotoError(null);
    const formData = new FormData();
    formData.append("cleaningStandardId", current.id);
    formData.append("file", file);
    startPhotoBusy(async () => {
      const result = await uploadSupervisorPhoto(null, formData);
      if (result?.success) {
        router.refresh();
      } else {
        setPhotoError(result?.error ?? "Failed to upload photo");
      }
    });
  }

  function handleDeletePhoto(photoId: string) {
    setPhotoError(null);
    startPhotoBusy(async () => {
      try {
        await deleteSupervisorPhoto(photoId);
        router.refresh();
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : "Failed to delete photo");
      }
    });
  }

  function handleSendBack() {
    setFooterError(null);
    startFooterBusy(async () => {
      try {
        await sendBackToCleaner(cleaning.id);
        router.push("/dashboard/supervisor");
      } catch (e) {
        setFooterError(e instanceof Error ? e.message : "Failed to send back");
      }
    });
  }

  function handleFinalize() {
    setFooterError(null);
    startFooterBusy(async () => {
      try {
        await finalizeCleaning(cleaning.id);
        router.push("/dashboard/supervisor");
      } catch (e) {
        setFooterError(e instanceof Error ? e.message : "Failed to finalise");
      }
    });
  }

  const cleanerFirstName = cleaning.cleanerName?.split(" ")[0] || "the cleaner";
  const footerMsg =
    leftCount > 0
      ? `${leftCount} standard${leftCount === 1 ? "" : "s"} left to check. Finalise unlocks when every standard is marked.`
      : notMetCount > 0
        ? `${notMetCount} not met: send it back so ${cleanerFirstName} can redo ${notMetCount === 1 ? "that standard." : "those standards."}`
        : `All ${items.length} standard${items.length === 1 ? "" : "s"} met. Finalising notifies the client with the results.`;

  const cleanerNote = current?.photos.find((p) => p.authorRole === "cleaner" && p.comment)?.comment ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-dash-bg font-sans text-dash-ink">
      <header className="flex flex-wrap items-center gap-4 border-b border-dash-border bg-dash-surface px-8 py-4">
        <Link
          href="/dashboard/supervisor"
          className="inline-flex h-11 items-center gap-1.5 text-sm font-semibold text-dash-ink-2 hover:text-dash-ink"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Review queue
        </Link>
        <div className="h-7 w-px bg-dash-border" />
        <div className="flex flex-1 flex-col gap-0.5" style={{ flexBasis: 320 }}>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-extrabold">{cleaning.clientName || "Unnamed client"}</h1>
            <StatusPill status="in_review" />
          </div>
          <span className="text-[13px] text-dash-muted">
            {formatScheduled(cleaning.scheduledAt)}
            {cleaning.clientAddress ? ` · ${cleaning.clientAddress}` : ""} · Cleaned by{" "}
            {cleaning.cleanerName || "Unassigned"} · Standard {currentIndex + 1}
          </span>
        </div>
        <div className="flex min-w-[180px] flex-col items-end gap-1.5">
          <span className="text-[13px] font-bold">
            {markedCount} of {items.length} checked
          </span>
          <div className="h-2 w-[180px] overflow-hidden rounded-full bg-dash-track">
            <div
              className="h-full bg-dash-brand-700"
              style={{ width: `${items.length > 0 ? Math.round((markedCount / items.length) * 100) : 0}%` }}
            />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-wrap items-start gap-6 px-8 py-6">
        <nav
          aria-label="Standards"
          className="flex flex-col gap-1 rounded-2xl border border-dash-border bg-dash-surface p-2.5"
          style={{ flex: "1 1 280px" }}
        >
          <span className="px-2.5 pt-2 pb-1 text-xs font-bold tracking-wide text-dash-muted uppercase">Checklist</span>
          {items.map((item, idx) => {
            const isCurrent = item.id === currentId;
            const badgeBg =
              item.reviewStatus === "met" ? "var(--color-dash-brand-700)" : item.reviewStatus === "not_met" ? "var(--color-dash-danger)" : "#fff";
            const badgeFg = item.reviewStatus === "pending" ? "var(--color-dash-muted)" : "#fff";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item.id)}
                aria-current={isCurrent ? "step" : undefined}
                className="flex min-h-14 w-full items-center gap-3 rounded-[10px] border-0 px-2.5 py-3 text-left font-inherit"
                style={{
                  background: isCurrent ? "var(--color-dash-border-soft)" : "transparent",
                  outline: isCurrent ? "2px solid var(--color-dash-brand-700)" : "none",
                  outlineOffset: -2,
                }}
              >
                <span
                  className="flex size-[30px] flex-none items-center justify-center rounded-full text-sm font-extrabold"
                  style={{
                    background: badgeBg,
                    color: badgeFg,
                    border: `1.5px solid ${item.reviewStatus === "pending" ? "var(--color-dash-input-border)" : badgeBg}`,
                  }}
                >
                  {item.reviewStatus === "met" ? <Check size={16} /> : item.reviewStatus === "not_met" ? <X size={16} /> : idx + 1}
                </span>
                <span className="flex flex-1 flex-col gap-0.5 text-left">
                  <span className="text-sm font-bold">{item.title}</span>
                  <span className="text-xs text-dash-muted">
                    {item.reviewStatus === "met" ? "Met" : item.reviewStatus === "not_met" ? "Not met" : "To check"}
                  </span>
                </span>
              </button>
            );
          })}
          {items.length === 0 && <p className="px-2.5 py-3 text-sm text-dash-muted">No checklist items.</p>}
        </nav>

        {current && (
          <section
            aria-label="Current standard"
            className="flex min-w-0 flex-col gap-5 rounded-2xl border border-dash-border bg-dash-surface p-6"
            style={{ flex: "3 1 560px" }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-semibold text-dash-muted">
                Standard {currentIndex + 1} of {items.length} · {current.area || "General"}
              </span>
              <h2 className="text-[22px] font-extrabold">{current.title}</h2>
              {current.description && <p className="text-sm text-dash-muted">{current.description}</p>}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold tracking-wide text-dash-muted uppercase">Cleaner&apos;s photos</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                {current.photos.map((photo) => (
                  <div key={photo.id} className="relative">
                    <PhotoTile signedUrl={photo.signedUrl} label={photo.authorRole === "supervisor" ? "Your photo" : undefined} />
                    {photo.authorRole === "supervisor" && (
                      <button
                        type="button"
                        disabled={isPhotoBusy}
                        onClick={() => handleDeletePhoto(photo.id)}
                        aria-label="Delete photo"
                        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  disabled={isPhotoBusy}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-4/3 flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-dash-input-border bg-dash-bg text-[13px] font-bold text-dash-brand-700"
                >
                  {isPhotoBusy ? <Loader2 size={24} className="animate-spin" /> : <Plus size={24} />}
                  Add your own photo
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAddPhoto(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {photoError && <p className="text-sm text-dash-danger">{photoError}</p>}
              {cleanerNote && (
                <div className="rounded-[10px] bg-dash-bg p-3 text-sm text-dash-ink-2">
                  <strong>{cleaning.cleanerName?.split(" ")[0] || "Cleaner"}&apos;s note:</strong> {cleanerNote}
                </div>
              )}
            </div>

            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              Comment for the cleaner{" "}
              <span className="text-[13px] font-normal text-dash-muted">Required if you mark this Not met</span>
              <Textarea
                rows={2}
                value={draftComment}
                onChange={(e) => {
                  setDraftComment(e.target.value);
                  if (e.target.value.trim()) setCommentWarning(false);
                }}
                className="resize-y rounded-[10px] border-dash-input-border"
              />
            </label>
            {commentWarning && (
              <p className="-mt-3 text-sm text-dash-danger">Add a comment so the cleaner knows what to fix.</p>
            )}
            {markError && <p className="text-sm text-dash-danger">{markError}</p>}

            <div role="group" aria-label="Verdict" className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isMarking}
                onClick={() => mark("met")}
                aria-pressed={current.reviewStatus === "met"}
                className="flex h-16 items-center justify-center gap-2.5 rounded-xl text-[17px] font-extrabold"
                style={
                  current.reviewStatus === "met"
                    ? { background: "var(--color-dash-brand-700)", color: "#fff", border: "2px solid var(--color-dash-brand-700)" }
                    : { background: "#fff", color: "#155B33", border: "2px solid #9CC3AC" }
                }
              >
                <Check size={22} strokeWidth={2.4} />
                Met
              </button>
              <button
                type="button"
                disabled={isMarking}
                onClick={() => mark("not_met")}
                aria-pressed={current.reviewStatus === "not_met"}
                className="flex h-16 items-center justify-center gap-2.5 rounded-xl text-[17px] font-extrabold"
                style={
                  current.reviewStatus === "not_met"
                    ? { background: "var(--color-dash-danger)", color: "#fff", border: "2px solid var(--color-dash-danger)" }
                    : { background: "#fff", color: "var(--color-dash-danger)", border: "2px solid #F0B8B0" }
                }
              >
                <X size={22} strokeWidth={2.4} />
                Not met
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-dash-border bg-dash-surface px-8 py-3.5 shadow-[0_-8px_24px_rgba(15,59,38,0.06)]">
        <span className="flex-1 text-sm text-dash-ink-2" style={{ flexBasis: 280 }}>
          {footerError ?? footerMsg}
        </span>
        <button
          type="button"
          disabled={isFooterBusy}
          onClick={handleSendBack}
          className="inline-flex h-12 items-center gap-2 rounded-[10px] px-5 text-[15px] font-bold"
          style={
            notMetCount > 0
              ? { background: "var(--color-dash-danger)", color: "#fff", border: 0 }
              : { background: "#fff", color: "var(--color-dash-ink)", border: "1px solid var(--color-dash-input-border)" }
          }
        >
          {isFooterBusy ? <Loader2 size={18} className="animate-spin" /> : <Undo2 size={18} />}
          Send back to cleaner
        </button>
        <button
          type="button"
          disabled={!allMet || isFooterBusy}
          onClick={handleFinalize}
          className="inline-flex h-12 items-center gap-2 rounded-[10px] px-5 text-[15px] font-bold"
          style={
            allMet
              ? { background: "var(--color-dash-brand-700)", color: "#fff", border: 0, cursor: "pointer" }
              : { background: "var(--color-dash-track)", color: "#6B7670", border: 0, cursor: "not-allowed" }
          }
        >
          {isFooterBusy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} strokeWidth={2.4} />}
          Finalise cleaning
        </button>
      </footer>
    </div>
  );
}
