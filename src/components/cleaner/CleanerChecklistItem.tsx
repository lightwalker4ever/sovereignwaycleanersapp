"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  uploadCleaningPhoto,
  deleteCleaningPhoto,
  type UploadPhotoState,
} from "@/app/(dashboard)/dashboard/cleaner/actions";
import type { CleaningChecklistItem, CleaningPhoto } from "@/lib/cleanings";

export function CleanerChecklistItem({
  item,
  editable,
}: {
  item: CleaningChecklistItem;
  editable: boolean;
}) {
  const [state, formAction, isPending] = useActionState<UploadPhotoState, FormData>(
    uploadCleaningPhoto,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);

  // File inputs can't be value-controlled, so resetting means calling
  // the native form.reset() once the upload succeeds -- a genuine
  // side effect (imperative DOM mutation via a ref), unlike the
  // pure-state "adjust during render" pattern used elsewhere in this
  // codebase, so this needs a real useEffect.
  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-gray-900">{item.title}</p>
          {item.description && <p className="text-sm text-gray-500">{item.description}</p>}
        </div>
        {item.photos.length === 0 && (
          <Badge variant="outline" className="shrink-0 text-amber-700">
            No photos yet
          </Badge>
        )}
      </div>

      {item.photos.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {item.photos.map((photo) => (
            <PhotoThumbnail key={photo.id} photo={photo} editable={editable} />
          ))}
        </div>
      )}

      {editable && (
        <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="cleaningStandardId" value={item.id} />
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Photo</label>
            <input
              type="file"
              name="file"
              accept="image/*"
              capture="environment"
              required
              className="block text-sm"
            />
          </div>
          <div className="w-48 space-y-1">
            <label className="text-xs text-gray-500" htmlFor={`comment-${item.id}`}>
              Comment
            </label>
            <Input id={`comment-${item.id}`} name="comment" placeholder="Optional" />
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
          {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
        </form>
      )}
    </div>
  );
}

function PhotoThumbnail({ photo, editable }: { photo: CleaningPhoto; editable: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);

  if (deleted) return null;

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteCleaningPhoto(photo.id);
        setDeleted(true);
      } catch {
        // revalidatePath on the server reflects the real state either way
      }
    });
  }

  return (
    <div className="w-28 space-y-1">
      {photo.signedUrl ? (
        // Signed URLs are private, short-lived, and per-request --
        // not a fit for next/image's optimizer/domain allowlist.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.signedUrl}
          alt=""
          className="h-28 w-28 rounded-lg object-cover ring-1 ring-foreground/10"
        />
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400">
          Unavailable
        </div>
      )}
      {photo.comment && <p className="text-xs text-gray-500">{photo.comment}</p>}
      {editable && (
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
