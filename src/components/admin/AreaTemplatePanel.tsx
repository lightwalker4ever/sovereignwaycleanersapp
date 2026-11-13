"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { StandardRowActions } from "@/components/admin/StandardRowActions";
import { CreateStandardForm } from "@/components/admin/CreateStandardForm";
import {
  updateAreaTemplateField,
  updateStandardField,
  setStandardPhotoRequired,
  duplicateAreaTemplate,
  type AreaTemplateDetail,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

export function AreaTemplatePanel({ areaTemplate }: { areaTemplate: AreaTemplateDetail }) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(areaTemplate.name);
  const [isSavingName, startSavingName] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();

  function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === areaTemplate.name) {
      setRenaming(false);
      return;
    }
    startSavingName(async () => {
      await updateAreaTemplateField(areaTemplate.id, "name", trimmed);
      setRenaming(false);
    });
  }

  function duplicate() {
    startDuplicating(async () => {
      const newId = await duplicateAreaTemplate(areaTemplate.id);
      router.push(`/dashboard/admin/standards?bucket=${areaTemplate.bucketId}&area=${newId}`);
    });
  }

  return (
    <section
      aria-label={areaTemplate.name}
      className="min-w-0 flex-[2_1_420px] overflow-hidden rounded-2xl border border-dash-border bg-dash-surface"
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
                      setName(areaTemplate.name);
                      setRenaming(false);
                    }
                  }}
                  className="h-10 w-full rounded-[10px] border border-dash-input-border px-3 text-[22px] font-extrabold text-dash-ink outline-none focus:border-dash-brand-700"
                />
                {isSavingName && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dash-muted" />}
              </div>
            ) : (
              <h2 className="text-[22px] font-extrabold text-dash-ink">{areaTemplate.name}</h2>
            )}
            <div className="mt-0.5 text-sm text-dash-muted">
              <EditableTextCell
                value={areaTemplate.description}
                placeholder="Add a description"
                onSave={updateAreaTemplateField.bind(null, areaTemplate.id, "description")}
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
      </div>

      <ol className="m-0 list-none p-0 py-2">
        {areaTemplate.standards.map((standard, index) => (
          <li
            key={standard.id}
            className="flex flex-wrap items-center gap-3.5 border-b border-dash-border-soft px-6 py-3.5"
          >
            <StandardRowActions
              standardId={standard.id}
              isFirst={index === 0}
              isLast={index === areaTemplate.standards.length - 1}
            />
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dash-brand-100 text-[13px] font-extrabold text-[#155B33]">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 basis-60">
              <EditableTextCell
                value={standard.title}
                onSave={updateStandardField.bind(null, standard.id, "title")}
              />
              <div className="text-sm text-dash-muted">
                <EditableTextCell
                  value={standard.description}
                  placeholder="Add a description"
                  onSave={updateStandardField.bind(null, standard.id, "description")}
                />
              </div>
            </div>
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
        {areaTemplate.standards.length === 0 && (
          <li className="px-6 py-6 text-center text-sm text-dash-muted">No standards yet.</li>
        )}
      </ol>

      <div className="p-6 pt-4">
        <CreateStandardForm areaTemplateId={areaTemplate.id} />
      </div>

      <div className="mx-6 mb-6 rounded-[10px] bg-dash-bg px-3.5 py-3 text-[13px] text-dash-ink-2">
        Changes apply to cleanings scheduled from now on. Cleanings already in progress keep the
        checklist they started with.
      </div>
    </section>
  );
}
