"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignStandardList } from "@/app/(dashboard)/dashboard/admin/clients/actions";

export function AssignStandardListForm({
  clientId,
  allStandardLists,
  currentStandardListId,
}: {
  clientId: string;
  allStandardLists: { id: string; name: string }[];
  currentStandardListId: string | null;
}) {
  const [value, setValue] = useState<string | null>(currentStandardListId);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string | null) {
    if (!next || next === value) return;
    const previous = value;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await assignStandardList(clientId, next);
      } catch (e) {
        setValue(previous);
        setError(e instanceof Error ? e.message : "Failed to assign standards");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={value ?? undefined} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger className="w-64">
          <SelectValue>
            {(val: string | null) =>
              allStandardLists.find((l) => l.id === val)?.name ?? "Choose a list"
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {allStandardLists.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
