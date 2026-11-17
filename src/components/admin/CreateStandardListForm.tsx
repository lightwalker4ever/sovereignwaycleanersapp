"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createBucket } from "@/app/(dashboard)/dashboard/admin/standards/actions";

const emptyValues = { name: "", description: "" };
const fieldClassName =
  "h-11 w-full rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700";

export function CreateStandardListForm({ onCreated }: { onCreated?: (bucketId: string) => void }) {
  const [values, setValues] = useState(emptyValues);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const bucketId = await createBucket(values.name, values.description || null);
        setValues(emptyValues);
        onCreated?.(bucketId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create bucket");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-dash-ink" htmlFor="list-name">
          Name
        </label>
        <input
          id="list-name"
          name="name"
          placeholder="Commercial Cleaning"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          required
          className={fieldClassName}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-dash-ink" htmlFor="list-description">
          Description
        </label>
        <input
          id="list-description"
          name="description"
          placeholder="Optional"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className={fieldClassName}
        />
      </div>
      {error && <p className="text-sm text-dash-danger">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-dash-brand-700 px-5 text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Create bucket
      </button>
    </form>
  );
}
