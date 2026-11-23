"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { EditableTextCell } from "@/components/admin/EditableTextCell";
import { StandardRowActions } from "@/components/admin/StandardRowActions";
import { StandardPicker } from "@/components/admin/StandardPicker";
import {
  updateAreaTemplateField,
  updateCatalogStandardField,
  setCatalogStandardPhotoRequired,
  duplicateAreaTemplate,
  type AreaTemplateDetail,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

export function AreaTemplatePanel({
  areaTemplate,
  autoFocusStandardPicker,
}: {
  areaTemplate: AreaTemplateDetail;
  autoFocusStandardPicker?: boolean;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(areaTemplate.name);
  const [isSavingName, startSavingName] = useTransition();
  const [isDuplicating, startDuplicating] = useTransition();
  const sectionRef = useRef<HTMLElement>(null);

  // Picking an area from the list to its left is a real navigation
  // (new ?area= query param), which Next.js's <Link> would otherwise
  // scroll to the top of the page for -- harmless on desktop's 3-column
  // layout, but on a stacked mobile layout this panel is the third
  // section down, so that default left the admin looking at the bucket
  // list instead of the standards they just asked for. The link itself
  // passes scroll={false}; this effect scrolls the panel into view
  // instead, remounting (via the parent's `key`) each time a different
  // area is picked. A no-op on desktop, where it's already in view.
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
      ref={sectionRef}
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
            key={standard.attachmentId}
            className="flex flex-wrap items-center gap-3.5 border-b border-dash-border-soft px-6 py-3.5"
          >
            <StandardRowActions
              attachmentId={standard.attachmentId}
              isFirst={index === 0}
              isLast={index === areaTemplate.standards.length - 1}
            />
            <div className="min-w-0 flex-1 basis-60">
              <EditableTextCell
                value={standard.title}
                onSave={updateCatalogStandardField.bind(null, standard.standardId, "title")}
              />
              <div className="text-sm text-dash-muted">
                <EditableTextCell
                  value={standard.description}
                  placeholder="Add a description"
                  onSave={updateCatalogStandardField.bind(null, standard.standardId, "description")}
                />
              </div>
            </div>
            {standard.usageCount > 1 && (
              <span className="shrink-0 rounded-full bg-dash-border-soft px-2.5 py-1 text-xs font-semibold text-dash-ink-2">
                Used in {standard.usageCount} areas
              </span>
            )}
            <label className="flex shrink-0 items-center gap-2 text-[13px] whitespace-nowrap text-dash-ink-2">
              <input
                type="checkbox"
                checked={standard.photoRequired}
                onChange={(e) => {
                  setCatalogStandardPhotoRequired(standard.standardId, e.target.checked).catch(() => {
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
        <StandardPicker areaTemplateId={areaTemplate.id} autoFocus={autoFocusStandardPicker} />
      </div>

      <div className="mx-6 mb-6 rounded-[10px] bg-dash-bg px-3.5 py-3 text-[13px] text-dash-ink-2">
        Changes apply to cleanings scheduled from now on. Cleanings already in progress keep the
        checklist they started with.
      </div>
    </section>
  );
}
