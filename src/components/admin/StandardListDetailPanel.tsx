"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { AreaTemplateRowActions } from "@/components/admin/AreaTemplateRowActions";
import { CreateAreaTemplateForm } from "@/components/admin/CreateAreaTemplateForm";
import {
  updateBucketField,
  duplicateBucket,
  type BucketDetail,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";
import { assignStandardList } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function StandardListDetailPanel({
  bucket,
  selectedAreaTemplateId,
  allClients,
}: {
  bucket: BucketDetail;
  selectedAreaTemplateId: string | null;
  allClients: { id: string; fullName: string | null }[];
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(bucket.name);
  const [isSavingName, startSavingName] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();
  const [assigning, setAssigning] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [isAssigning, startAssigning] = useTransition();

  const assignedIds = new Set(bucket.usedByClients.map((c) => c.id));
  const assignableClients = allClients.filter((c) => !assignedIds.has(c.id));

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === bucket.name) {
      setRenaming(false);
      return;
    }
    startSavingName(async () => {
      await updateBucketField(bucket.id, "name", trimmed);
      setRenaming(false);
    });
  }

  function duplicate() {
    startDuplicating(async () => {
      const newId = await duplicateBucket(bucket.id);
      router.push(`/dashboard/admin/standards?bucket=${newId}`);
    });
  }

  function assign() {
    if (!assignClientId) return;
    startAssigning(async () => {
      await assignStandardList(assignClientId, bucket.id);
      setAssignClientId("");
      setAssigning(false);
    });
  }

  return (
    <section
      aria-label={bucket.name}
      className="min-w-0 flex-[1_1_320px] overflow-hidden rounded-2xl border border-dash-border bg-dash-surface"
    >
      <div className="flex flex-col gap-3.5 border-b border-dash-border p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 basis-60">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setName(bucket.name);
                      setRenaming(false);
                    }
                  }}
                  className="h-10 w-full rounded-[10px] border border-dash-input-border px-3 text-[20px] font-extrabold text-dash-ink outline-none focus:border-dash-brand-700"
                />
                {isSavingName && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dash-muted" />}
              </div>
            ) : (
              <h2 className="text-[20px] font-extrabold text-dash-ink">{bucket.name}</h2>
            )}
            <div className="mt-0.5 text-sm text-dash-muted">
              <EditableTextCell
                value={bucket.description}
                placeholder="Add a description"
                onSave={updateBucketField.bind(null, bucket.id, "description")}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="h-10 rounded-[10px] border border-dash-input-border bg-white px-3.5 text-sm font-semibold text-dash-ink"
          >
            Rename
          </button>
          <button
            type="button"
            onClick={duplicate}
            disabled={isDuplicating}
            className="flex h-10 items-center gap-1.5 rounded-[10px] border border-dash-input-border bg-white px-3.5 text-sm font-semibold text-dash-ink disabled:opacity-60"
          >
            {isDuplicating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Duplicate
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-dash-muted">Used by</span>
          {bucket.usedByClients.map((c) => (
            <span key={c.id} className="rounded-full bg-dash-border-soft px-3 py-1.5 text-[13px] font-semibold text-dash-ink">
              {c.name}
            </span>
          ))}
          {!assigning && assignableClients.length > 0 && (
            <button
              type="button"
              onClick={() => setAssigning(true)}
              className="h-8 rounded-full px-3 text-[13px] font-bold text-dash-brand-700"
            >
              + Assign to client
            </button>
          )}
          {assigning && (
            <div className="flex items-center gap-1.5">
              <select
                autoFocus
                value={assignClientId}
                onChange={(e) => setAssignClientId(e.target.value)}
                className="h-8 rounded-lg border border-dash-input-border bg-white px-2 text-[13px] text-dash-ink"
              >
                <option value="">Choose a client…</option>
                {assignableClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName || "Unnamed client"}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={assign}
                disabled={!assignClientId || isAssigning}
                className="h-8 rounded-lg bg-dash-brand-700 px-2.5 text-[13px] font-bold text-white disabled:opacity-60"
              >
                {isAssigning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Assign"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssigning(false);
                  setAssignClientId("");
                }}
                className="h-8 rounded-lg px-2 text-[13px] text-dash-muted"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <ol className="m-0 list-none p-0 py-2">
        {bucket.areaTemplates.map((area, index) => {
          const active = area.id === selectedAreaTemplateId;
          return (
            <li
              key={area.id}
              className={
                "flex items-center gap-2 border-b border-dash-border-soft px-4 py-2.5 " +
                (active ? "bg-dash-brand-100" : "")
              }
            >
              <a
                href={`/dashboard/admin/standards?bucket=${bucket.id}&area=${area.id}`}
                className="min-w-0 flex-1"
              >
                <span className="block truncate text-sm font-bold text-dash-ink">{area.name}</span>
                <span className="text-[13px] text-dash-muted">
                  {area.standardCount} standard{area.standardCount === 1 ? "" : "s"}
                </span>
              </a>
              <AreaTemplateRowActions
                areaTemplateId={area.id}
                isFirst={index === 0}
                isLast={index === bucket.areaTemplates.length - 1}
              />
            </li>
          );
        })}
        {bucket.areaTemplates.length === 0 && (
          <li className="px-6 py-6 text-center text-sm text-dash-muted">No areas yet.</li>
        )}
      </ol>

      <div className="p-6 pt-4">
        <CreateAreaTemplateForm bucketId={bucket.id} />
      </div>
    </section>
  );
}
