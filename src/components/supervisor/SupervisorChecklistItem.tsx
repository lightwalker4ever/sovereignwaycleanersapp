"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CircleX, Loader2, Trash2, Upload, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  uploadSupervisorPhoto,
  deleteSupervisorPhoto,
  setStandardReview,
  type UploadPhotoState,
} from "@/app/(dashboard)/dashboard/supervisor/actions";
import type { CleaningChecklistItem, CleaningPhoto } from "@/lib/cleanings";

const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  met: "Met",
  not_met: "Not met",
};

export function SupervisorChecklistItem({
  item,
  editable,
}: {
  item: CleaningChecklistItem;
  editable: boolean;
}) {
  const [reviewStatus, setReviewStatus] = useState(item.reviewStatus);
  const [comment, setComment] = useState(item.supervisorComment ?? "");
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isReviewPending, startReviewTransition] = useTransition();

  function mark(next: "met" | "not_met") {
    const previous = reviewStatus;
    setReviewStatus(next);
    setReviewError(null);
    startReviewTransition(async () => {
      try {
        await setStandardReview(item.id, next, comment.trim() || null);
      } catch (e) {
        setReviewStatus(previous);
        setReviewError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  const cleanerPhotos = item.photos.filter((p) => p.authorRole === "cleaner");
  const supervisorPhotos = item.photos.filter((p) => p.authorRole === "supervisor");

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
        </div>
        <Badge variant={reviewStatus === "met" ? "default" : reviewStatus === "not_met" ? "destructive" : "outline"}>
          {REVIEW_STATUS_LABEL[reviewStatus] ?? reviewStatus}
        </Badge>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
          Cleaner&apos;s photos
        </p>
        {cleanerPhotos.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {cleanerPhotos.map((photo) => (
              <PhotoThumbnail key={photo.id} photo={photo} onDelete={null} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No photos from the cleaner.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-500">
          Your photo
        </p>
        {supervisorPhotos.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-3">
            {supervisorPhotos.map((photo) => (
              <PhotoThumbnail
                key={photo.id}
                photo={photo}
                onDelete={editable ? deleteSupervisorPhoto : null}
              />
            ))}
          </div>
        )}
        {editable && <SupervisorPhotoUploadForm cleaningStandardId={item.id} />}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500" htmlFor={`review-comment-${item.id}`}>
          Review comment
        </label>
        <Input
          id={`review-comment-${item.id}`}
          placeholder="Optional -- shown to the cleaner"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!editable}
        />
      </div>

      {editable && (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={reviewStatus === "met" ? "default" : "outline"}
            disabled={isReviewPending}
            onClick={() => mark("met")}
            className="gap-1.5"
          >
            {isReviewPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleCheck className="h-3.5 w-3.5" />}
            Met
          </Button>
          <Button
            type="button"
            size="sm"
            variant={reviewStatus === "not_met" ? "destructive" : "outline"}
            disabled={isReviewPending}
            onClick={() => mark("not_met")}
            className="gap-1.5"
          >
            {isReviewPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CircleX className="h-3.5 w-3.5" />}
            Not met
          </Button>
          {reviewError && <p className="text-sm text-red-600">{reviewError}</p>}
        </div>
      )}
    </div>
  );
}

function SupervisorPhotoUploadForm({ cleaningStandardId }: { cleaningStandardId: string }) {
  const [state, formAction, isPending] = useActionState<UploadPhotoState, FormData>(
    uploadSupervisorPhoto,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="cleaningStandardId" value={cleaningStandardId} />
      <div className="space-y-1">
        <label className="text-xs text-gray-500">Photo</label>
        <input type="file" name="file" accept="image/*" required className="block text-sm" />
      </div>
      <div className="w-48 space-y-1">
        <label className="text-xs text-gray-500" htmlFor={`supervisor-comment-${cleaningStandardId}`}>
          Comment
        </label>
        <Input id={`supervisor-comment-${cleaningStandardId}`} name="comment" placeholder="Optional" />
      </div>
      <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Upload
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function PhotoThumbnail({
  photo,
  onDelete,
}: {
  photo: CleaningPhoto;
  onDelete: ((photoId: string) => Promise<void>) | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleDelete() {
    if (!onDelete) return;
    startTransition(async () => {
      try {
        await onDelete(photo.id);
        setDeleted(true);
      } catch {
        // revalidatePath on the server reflects the real state either way
      }
    });
  }

  return (
    <div className="w-24 space-y-1">
      {photo.signedUrl ? (
        // Signed URLs are private, short-lived, and per-request -- not
        // a fit for next/image's optimizer/domain allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.signedUrl}
          alt=""
          className="h-24 w-24 rounded-lg object-cover ring-1 ring-foreground/10"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
          Unavailable
        </div>
      )}
      {photo.comment && <p className="text-xs text-gray-500">{photo.comment}</p>}
      {onDelete && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={isPending}
          onClick={handleDelete}
          className="w-full gap-1 text-red-600"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Delete
        </Button>
      )}
    </div>
  );
}
