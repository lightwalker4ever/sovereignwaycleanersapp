"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { setStandardOverride } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function ClientStandardToggle({
  clientId,
  assignmentId,
  standardId,
  title,
  description,
  enabled: initialEnabled,
}: {
  clientId: string;
  assignmentId: string;
  standardId: string;
  title: string;
  description: string | null;
  enabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      try {
        await setStandardOverride(clientId, assignmentId, standardId, next);
      } catch {
        setEnabled(!next);
      }
    });
  }

  return (
    <label className="flex cursor-pointer items-start gap-3 p-3">
      <input
        type="checkbox"
        checked={enabled}
        onChange={toggle}
        disabled={isPending}
        className="mt-0.5 h-4 w-4 rounded border-gray-300"
      />
      <div className={enabled ? "" : "opacity-50"}>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      {isPending && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-gray-400" />}
    </label>
  );
}
