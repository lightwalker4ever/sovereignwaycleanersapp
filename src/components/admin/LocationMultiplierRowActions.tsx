"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteLocationMultiplier } from "@/app/(dashboard)/dashboard/admin/location-pricing/actions";

export function LocationMultiplierRowActions({
  id,
  isDefault,
}: {
  id: string;
  isDefault: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteLocationMultiplier(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to delete");
      }
    });
  }

  if (isDefault) {
    return <span className="text-xs text-gray-400">Fallback rate</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        disabled={isPending}
        onClick={remove}
        title="Delete area"
      >
        {isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        )}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
