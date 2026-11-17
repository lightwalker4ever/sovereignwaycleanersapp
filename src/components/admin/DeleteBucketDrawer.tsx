"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/Drawer";
import { deleteBucket, listBuckets, type BucketSummary } from "@/app/(dashboard)/dashboard/admin/standards/actions";
import { assignStandardList } from "@/app/(dashboard)/dashboard/admin/clients/actions";

/**
 * Deleting a bucket is blocked while any client is still assigned to
 * it (see deleteBucket()'s own doc comment) -- this drawer surfaces
 * exactly that: if clients are using the bucket, it lists each one
 * with a "reassign to another bucket" picker instead of letting the
 * admin hit an opaque foreign-key error. Once every client has been
 * moved elsewhere, the delete button enables itself.
 */
export function DeleteBucketDrawer({
  bucket,
}: {
  bucket: { id: string; name: string; usedByClients: { id: string; name: string }[] };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [otherBuckets, setOtherBuckets] = useState<BucketSummary[] | null>(null);
  const [reassignChoice, setReassignChoice] = useState<Record<string, string>>({});
  const [reassigningClientId, setReassigningClientId] = useState<string | null>(null);
  const [isReassigning, startReassigning] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blocked = bucket.usedByClients.length > 0;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    setError(null);
    if (next && otherBuckets === null) {
      listBuckets()
        .then((all) => setOtherBuckets(all.filter((b) => b.id !== bucket.id)))
        .catch(() => setOtherBuckets([]));
    }
  }

  function reassign(clientId: string) {
    const target = reassignChoice[clientId];
    if (!target) return;
    setError(null);
    setReassigningClientId(clientId);
    startReassigning(async () => {
      try {
        await assignStandardList(clientId, target);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to reassign");
      }
    });
  }

  function handleDelete() {
    setError(null);
    startDeleting(async () => {
      try {
        await deleteBucket(bucket.id);
        setOpen(false);
        router.push("/dashboard/admin/standards");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete bucket");
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger className="flex h-10 items-center gap-1.5 rounded-[10px] border border-dash-input-border bg-white px-3.5 text-sm font-semibold text-dash-danger">
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Delete &quot;{bucket.name}&quot;</DrawerTitle>
          <DrawerClose />
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto p-6">
          {blocked ? (
            <>
              <p className="mb-4 text-sm text-dash-muted">
                {bucket.usedByClients.length} client{bucket.usedByClients.length === 1 ? " is" : "s are"} still
                assigned to this bucket. Reassign {bucket.usedByClients.length === 1 ? "it" : "each"} to another
                bucket before deleting -- this replaces{" "}
                {bucket.usedByClients.length === 1 ? "their" : "that client's"} areas and standards with the new
                bucket&apos;s defaults.
              </p>
              <div className="space-y-2.5">
                {bucket.usedByClients.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 rounded-[10px] border border-dash-border p-2.5">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-dash-ink">{c.name}</span>
                    <select
                      value={reassignChoice[c.id] ?? ""}
                      onChange={(e) => setReassignChoice((r) => ({ ...r, [c.id]: e.target.value }))}
                      disabled={otherBuckets === null || (isReassigning && reassigningClientId === c.id)}
                      className="h-9 rounded-lg border border-dash-input-border bg-white px-2 text-[13px] text-dash-ink"
                    >
                      <option value="">Reassign to…</option>
                      {(otherBuckets ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => reassign(c.id)}
                      disabled={!reassignChoice[c.id] || (isReassigning && reassigningClientId === c.id)}
                      className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-dash-brand-700 px-2.5 text-[13px] font-bold text-white disabled:opacity-60"
                    >
                      {isReassigning && reassigningClientId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Reassign"
                      )}
                    </button>
                  </div>
                ))}
                {(otherBuckets ?? []).length === 0 && otherBuckets !== null && (
                  <p className="text-xs text-dash-muted">
                    There&apos;s no other bucket to reassign to yet -- create one first.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="mb-5 text-sm text-dash-muted">
              This permanently deletes the bucket, its areas, and their standards. This can&apos;t be undone.
            </p>
          )}
          {error && <p className="mt-3 text-sm text-dash-danger">{error}</p>}
          <button
            type="button"
            onClick={handleDelete}
            disabled={blocked || isDeleting}
            className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-dash-danger text-sm font-bold text-white disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete bucket
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
