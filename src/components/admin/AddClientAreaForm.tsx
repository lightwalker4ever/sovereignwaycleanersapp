"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { addClientAreas } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function AddClientAreaForm({
  clientId,
  areaTemplates,
}: {
  clientId: string;
  areaTemplates: { id: string; name: string }[];
}) {
  const [areaTemplateId, setAreaTemplateId] = useState(areaTemplates[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!areaTemplateId) return;
    setError(null);
    startTransition(async () => {
      try {
        await addClientAreas(clientId, areaTemplateId, quantity);
        setQuantity(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add area");
      }
    });
  }

  if (areaTemplates.length === 0) {
    return (
      <p className="text-xs text-gray-400">
        This bucket has no areas yet -- add some from the Standards page first.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={areaTemplateId}
        onChange={(e) => setAreaTemplateId(e.target.value)}
        disabled={isPending}
        className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
      >
        {areaTemplates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">×</span>
      <input
        type="number"
        min={1}
        max={50}
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
        disabled={isPending}
        className="h-9 w-16 rounded-lg border border-gray-300 px-2 text-sm text-gray-900"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Add area
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}
