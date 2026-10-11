"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function EditableTextCell({
  value,
  placeholder,
  type = "text",
  onSave,
}: {
  value: string | null;
  placeholder?: string;
  type?: "text" | "email";
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setDraft(value ?? "");
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  function save() {
    const next = draft.trim();
    if (next === (value ?? "")) {
      setEditing(false);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await onSave(next);
        setEditing(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEdit}
        className="group flex items-center gap-1.5 text-left text-gray-900 hover:text-gray-900"
      >
        <span className={value ? "" : "text-gray-400"}>{value || placeholder || "—"}</span>
        <Pencil className="h-3.5 w-3.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          type={type}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={isPending}
          className="h-7 w-40"
        />
        <Button type="button" size="icon-sm" variant="ghost" onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" onClick={cancel} disabled={isPending}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
