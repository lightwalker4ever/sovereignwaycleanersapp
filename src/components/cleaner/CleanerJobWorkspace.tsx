"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, Loader2, MessageSquarePlus, PlayCircle, Send } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { PhotoTile } from "@/components/ui/PhotoTile";
import { Textarea } from "@/components/ui/textarea";
import { toDisplayCleaningStatus } from "@/lib/cleaning-status";
import {
  startCleaning,
  uploadCleaningPhoto,
  submitForReview,
} from "@/app/(dashboard)/dashboard/cleaner/actions";
import type { CleaningDetailForParty, CleaningChecklistItem } from "@/lib/cleanings";

function formatTimeRange(scheduledAt: string, endsAt: string | null): string {
  const start = new Date(scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!endsAt) return start;
  const end = new Date(endsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${start}–${end}`;
}

export function CleanerJobWorkspace({ cleaning }: { cleaning: CleaningDetailForParty }) {
  const router = useRouter();
  const [items, setItems] = useState<CleaningChecklistItem[]>(cleaning.checklist);
  const [status, setStatus] = useState(cleaning.status);
  // Re-sync local state after router.refresh() (start job / photo upload /
  // submit) hands us a new `cleaning` prop -- see ReviewWorkspace for why
  // this must happen during render, not in an effect.
  const [synced, setSynced] = useState(cleaning);
  if (cleaning !== synced) {
    setSynced(cleaning);
    setItems(cleaning.checklist);
    setStatus(cleaning.status);
  }

  const [noteOpenId, setNoteOpenId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, startUploading] = useTransition();
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, startStarting] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editable = status === "in_progress";
  const notStarted = status === "assigned";
  const hasNotMet = items.some((i) => i.reviewStatus === "not_met");
  const displayStatus = toDisplayCleaningStatus(status, hasNotMet);

  const isPhotographed = (item: CleaningChecklistItem) => item.photos.some((p) => p.authorRole === "cleaner");
  const doneCount = items.filter(isPhotographed).length;
  const ready = items.length > 0 && doneCount === items.length;
  const openId = editable ? (items.find((i) => !isPhotographed(i))?.id ?? null) : null;

  function handleTakePhoto() {
    fileInputRef.current?.click();
  }

  function handleFileChosen(file: File) {
    // Only the currently-open item's "Take photo" button is ever visible,
    // so the open item is unambiguously the target -- no need to track
    // which button was clicked.
    const standardId = openId;
    if (!standardId) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append("cleaningStandardId", standardId);
    formData.append("file", file);
    if (noteOpenId === standardId && noteDraft.trim()) {
      formData.append("comment", noteDraft.trim());
    }
    startUploading(async () => {
      const result = await uploadCleaningPhoto(null, formData);
      if (result?.success) {
        setNoteOpenId(null);
        setNoteDraft("");
        router.refresh();
      } else {
        setUploadError(result?.error ?? "Failed to upload photo");
      }
    });
  }

  function handleStart() {
    setStartError(null);
    startStarting(async () => {
      try {
        await startCleaning(cleaning.id);
        router.refresh();
      } catch (e) {
        setStartError(e instanceof Error ? e.message : "Failed to start job");
      }
    });
  }

  function handleSubmit() {
    setSubmitError(null);
    startSubmitting(async () => {
      try {
        await submitForReview(cleaning.id);
        router.push("/dashboard/cleaner");
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "Failed to submit");
      }
    });
  }

  const left = items.length - doneCount;

  return (
    <div className="flex min-h-dvh flex-col bg-dash-bg font-sans text-dash-ink">
      <header className="flex flex-col gap-2.5 border-b border-dash-border bg-dash-surface px-2 py-3.5">
        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard/cleaner"
            aria-label="Back to Today"
            className="flex h-11 w-11 shrink-0 items-center justify-center text-dash-ink"
          >
            <ArrowLeft size={22} aria-hidden="true" />
          </Link>
          <div className="flex flex-1 flex-col">
            <h1 className="text-lg font-extrabold">{cleaning.clientName || "Unnamed client"}</h1>
            <span className="text-[13px] text-dash-muted">
              {cleaning.clientAddress || "No address on file"} &middot; {formatTimeRange(cleaning.scheduledAt, cleaning.endsAt)}
            </span>
          </div>
          <StatusPill status={displayStatus} className="shrink-0" />
        </div>
        <div className="px-1.5">
          <div className="h-2 overflow-hidden rounded-full bg-dash-track">
            <div
              className="h-full bg-dash-brand-700"
              style={{ width: `${items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0}%` }}
            />
          </div>
          <div className="mt-1.5 text-[13px] font-semibold text-dash-ink-2">
            {doneCount} of {items.length} standards photographed
          </div>
        </div>
      </header>

      {cleaning.notes && (
        <div className="mx-4 mt-3 rounded-xl border border-[#F3DC9E] bg-[#FFF8E6] px-3 py-2.5 text-[13px] text-[#5C4300]">
          <strong>Note from the office:</strong> {cleaning.notes}
        </div>
      )}

      {notStarted && (
        <div className="mx-4 mt-3 rounded-xl border border-dash-border bg-dash-surface px-3 py-2.5 text-[13px] text-dash-ink-2">
          Start this job when you arrive to begin photographing each standard.
        </div>
      )}

      <ol className="flex flex-1 list-none flex-col gap-2.5 px-4 py-3">
        {items.map((item, idx) => {
          const done = isPhotographed(item);
          const isOpen = item.id === openId;
          const firstPhoto = item.photos.find((p) => p.authorRole === "cleaner");
          return (
            <li
              key={item.id}
              className="rounded-2xl bg-dash-surface p-3.5"
              style={
                isOpen
                  ? { border: "2px solid var(--color-dash-brand-700)", boxShadow: "0 6px 18px rgba(15,59,38,0.10)" }
                  : { border: "1px solid var(--color-dash-border)" }
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex size-[30px] flex-none items-center justify-center rounded-full text-sm font-extrabold"
                  style={
                    done
                      ? { background: "var(--color-dash-brand-700)", color: "#fff" }
                      : isOpen
                        ? { background: "var(--color-dash-ink)", color: "#fff" }
                        : { background: "#fff", color: "var(--color-dash-muted)", border: "1.5px solid var(--color-dash-input-border)" }
                  }
                >
                  {done ? <Check size={16} /> : idx + 1}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{item.title}</span>
                  <span className="text-xs text-dash-muted">
                    {done ? "Photographed" : isOpen ? `${item.area || "General"} · up next` : item.area || "General"}
                  </span>
                </span>
                {done && (
                  <span className="h-12 w-12 shrink-0">
                    <PhotoTile signedUrl={firstPhoto?.signedUrl} square />
                  </span>
                )}
              </div>

              {isOpen && (
                <div className="mt-3 flex flex-col gap-2.5">
                  {item.description && <p className="text-sm text-dash-ink-2">{item.description}</p>}
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleTakePhoto}
                    className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-dash-brand-700 text-base font-extrabold text-white"
                  >
                    {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Camera size={22} aria-hidden="true" />}
                    Take photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setNoteOpenId(noteOpenId === item.id ? null : item.id)}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-dash-input-border bg-white text-sm font-semibold"
                  >
                    <MessageSquarePlus size={16} aria-hidden="true" />
                    {noteOpenId === item.id ? "Note added to next photo" : "Add a note"}
                  </button>
                  {noteOpenId === item.id && (
                    <Textarea
                      rows={2}
                      value={noteDraft}
                      onChange={(e) => setNoteDraft(e.target.value)}
                      placeholder="e.g. Couldn't move the wardrobe, cleaned around it."
                      className="resize-y rounded-[10px] border-dash-input-border"
                    />
                  )}
                  {uploadError && <p className="text-sm text-dash-danger">{uploadError}</p>}
                </div>
              )}
            </li>
          );
        })}
        {items.length === 0 && <p className="py-6 text-center text-sm text-dash-muted">No checklist items.</p>}
      </ol>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileChosen(file);
          e.target.value = "";
        }}
      />

      <footer className="flex flex-col gap-1.5 border-t border-dash-border bg-dash-surface px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+14px)]">
        {notStarted ? (
          <>
            <button
              type="button"
              disabled={isStarting}
              onClick={handleStart}
              className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] bg-dash-brand-700 text-base font-extrabold text-white"
            >
              {isStarting ? <Loader2 size={20} className="animate-spin" /> : <PlayCircle size={20} aria-hidden="true" />}
              Start job
            </button>
            {startError && <p className="text-center text-sm text-dash-danger">{startError}</p>}
          </>
        ) : editable ? (
          <>
            <button
              type="button"
              disabled={!ready || isSubmitting}
              onClick={handleSubmit}
              className="flex h-[54px] items-center justify-center gap-2 rounded-[14px] text-base font-extrabold"
              style={
                ready
                  ? { background: "var(--color-dash-brand-700)", color: "#fff", border: 0, cursor: "pointer" }
                  : { background: "var(--color-dash-track)", color: "#6B7670", border: 0, cursor: "not-allowed" }
              }
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} aria-hidden="true" />}
              Submit for review
            </button>
            <span className="text-center text-xs text-dash-muted">
              {submitError ?? (ready
                ? `${cleaning.supervisorName || "Your supervisor"} will be notified`
                : `${left} photo${left === 1 ? "" : "s"} to go before you can submit`)}
            </span>
          </>
        ) : (
          <span className="text-center text-sm text-dash-muted">
            {status === "in_review" ? "Submitted — waiting for review." : "This job is complete."}
          </span>
        )}
      </footer>
    </div>
  );
}
