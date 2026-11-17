"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { createAreaTemplate } from "@/app/(dashboard)/dashboard/admin/standards/actions";

export function CreateAreaTemplateForm({
  bucketId,
  autoFocus,
}: {
  bucketId: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const areaId = await createAreaTemplate(bucketId, name);
        setName("");
        // Land on the new area with its "add a standard" picker
        // focused -- an area with no standards isn't useful yet.
        router.push(`/dashboard/admin/standards?bucket=${bucketId}&area=${areaId}&focus=standard`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create area");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2.5">
      <input
        name="name"
        placeholder="Add an area, e.g. Toilet / Washroom"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        autoFocus={autoFocus}
        className="h-11 flex-1 rounded-[10px] border border-dash-input-border px-3 text-sm text-dash-ink outline-none focus:border-dash-brand-700"
      />
      <button
        type="submit"
        disabled={isPending}
        className="flex h-11 items-center gap-2 rounded-[10px] bg-dash-brand-700 px-[18px] text-sm font-bold text-white disabled:opacity-60"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Add
      </button>
      {error && <p className="w-full text-sm text-dash-danger">{error}</p>}
    </form>
  );
}
