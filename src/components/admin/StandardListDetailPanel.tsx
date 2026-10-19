"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { StandardRowActions } from "@/components/admin/StandardRowActions";
import { CreateStandardForm } from "@/components/admin/CreateStandardForm";
import {
  updateStandardListField,
  updateStandardField,
  setStandardPhotoRequired,
  duplicateStandardList,
  type StandardListDetail,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";
import { assignStandardList } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function StandardListDetailPanel({
  list,
  allClients,
}: {
  list: StandardListDetail;
  allClients: { id: string; fullName: string | null }[];
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(list.name);
  const [isSavingName, startSavingName] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();
  const [assigning, setAssigning] = useState(false);
  const [assignClientId, setAssignClientId] = useState("");
  const [isAssigning, startAssigning] = useTransition();

  const assignedIds = new Set(list.usedByClients.map((c) => c.id));
  const assignableClients = allClients.filter((c) => !assignedIds.has(c.id));

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === list.name) {
      setRenaming(false);
      return;
    }
    startSavingName(async () => {
      await updateStandardListField(list.id, "name", trimmed);
      setRenaming(false);
    });
  }

  function duplicate() {
    startDuplicating(async () => {
      const newId = await duplicateStandardList(list.id);
      router.push(`/dashboard/admin/standards?list=${newId}`);
    });
  }

  function assign() {
    if (!assignClientId) return;
    startAssigning(async () => {
      await assignStandardList(assignClientId, list.id);
      setAssignClientId("");
      setAssigning(false);
    });
  }

  return (
    <section
      aria-label={list.name}
      className="min-w-0 flex-[3_1_520px] overflow-hidden rounded-2xl border border-dash-border bg-dash-surface"
    >
      <div className="flex flex-col gap-3.5 border-b border-dash-border p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 basis-70">
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setName(list.name);
                      setRenaming(false);
                    }
                  }}
                  className="h-10 w-full rounded-[10px] border border-dash-input-border px-3 text-[22px] font-extrabold text-dash-ink outline-none focus:border-dash-brand-700"
                />
                {isSavingName && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dash-muted" />}
              </div>
            ) : (
              <h2 className="text-[22px] font-extrabold text-dash-ink">{list.name}</h2>
            )}
            <div className="mt-0.5 text-sm text-dash-muted">
              <EditableTextCell
                value={list.description}
                placeholder="Add a description"
                onSave={updateStandardListField.bind(null, list.id, "description")}
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
          {list.usedByClients.map((c) => (
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
        {list.standards.map((standard, index) => (
          <li
            key={standard.id}
            className="flex flex-wrap items-center gap-3.5 border-b border-dash-border-soft px-6 py-3.5"
          >
            <StandardRowActions
              standardId={standard.id}
              listId={list.id}
              isFirst={index === 0}
              isLast={index === list.standards.length - 1}
            />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dash-brand-100 text-[13px] font-extrabold text-[#155B33]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 basis-60">
              <EditableTextCell
                value={standard.title}
                onSave={updateStandardField.bind(null, standard.id, list.id, "title")}
              />
              <div className="text-sm text-dash-muted">
                <EditableTextCell
                  value={standard.description}
                  placeholder="Add a description"
                  onSave={updateStandardField.bind(null, standard.id, list.id, "description")}
                />
              </div>
            </div>
            <span className="shrink-0 rounded-lg border border-dash-border px-2 py-1 text-xs font-semibold text-dash-ink-2">
              <EditableTextCell
                value={standard.area}
                placeholder="Area"
                onSave={updateStandardField.bind(null, standard.id, list.id, "area")}
              />
            </span>
            <label className="flex shrink-0 items-center gap-2 text-[13px] whitespace-nowrap text-dash-ink-2">
              <input
                type="checkbox"
                checked={standard.photoRequired}
                onChange={(e) => {
                  setStandardPhotoRequired(standard.id, e.target.checked).catch(() => {
                    // revalidatePath on the server reflects the real state either way
                  });
                }}
                className="h-[18px] w-[18px] accent-dash-brand-700"
              />
              Photo required
            </label>
            <Pencil size={16} className="shrink-0 text-dash-muted" aria-hidden="true" />
          </li>
        ))}
        {list.standards.length === 0 && (
          <li className="px-6 py-6 text-center text-sm text-dash-muted">No standards yet.</li>
        )}
      </ol>

      <div className="p-6 pt-4">
        <CreateStandardForm listId={list.id} />
      </div>

      <div className="mx-6 mb-6 rounded-[10px] bg-dash-bg px-3.5 py-3 text-[13px] text-dash-ink-2">
        Changes apply to cleanings scheduled from now on. Cleanings already in progress keep the
        checklist they started with.
      </div>
    </section>
  );
}
