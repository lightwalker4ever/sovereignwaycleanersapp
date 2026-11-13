"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { ClientStandardToggle } from "@/components/admin/ClientStandardToggle";
import {
  renameClientArea,
  removeClientArea,
  type ClientAreaWithStandards,
} from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function ClientAreaCard({
  clientId,
  area,
}: {
  clientId: string;
  area: ClientAreaWithStandards;
}) {
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(area.label);
  const [isSaving, startSaving] = useTransition();
  const [isRemoving, startRemoving] = useTransition();

  function saveLabel() {
    const trimmed = label.trim();
    if (!trimmed || trimmed === area.label) {
      setLabel(area.label);
      setRenaming(false);
      return;
    }
    startSaving(async () => {
      await renameClientArea(clientId, area.id, trimmed);
      setRenaming(false);
    });
  }

  function remove() {
    startRemoving(async () => {
      await removeClientArea(clientId, area.id);
    });
  }

  return (
    <div className="overflow-hidden rounded-lg ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3.5 py-2.5">
        <div className="min-w-0">
          {renaming ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveLabel();
                  if (e.key === "Escape") {
                    setLabel(area.label);
                    setRenaming(false);
                  }
                }}
                onBlur={saveLabel}
                disabled={isSaving}
                className="h-8 rounded-md border border-gray-300 px-2 text-sm font-semibold text-gray-900"
              />
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setRenaming(true)}
              className="text-sm font-semibold text-gray-900 hover:underline"
            >
              {area.label}
            </button>
          )}
          <p className="text-xs text-gray-500">From {area.areaTemplateName}</p>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={isRemoving}
          title="Remove this area"
          className="shrink-0 rounded-md p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-60"
        >
          {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
      <div className="divide-y divide-gray-100">
        {area.standards.map((s) => (
          <ClientStandardToggle
            key={s.standardId}
            clientId={clientId}
            clientAreaId={area.id}
            standardId={s.standardId}
            title={s.title}
            description={s.description}
            enabled={s.enabled}
          />
        ))}
        {area.standards.length === 0 && (
          <p className="p-3 text-center text-xs text-gray-400">No standards in this area.</p>
        )}
      </div>
    </div>
  );
}
