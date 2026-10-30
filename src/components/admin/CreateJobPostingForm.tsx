"use client";

import { useActionState, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { createJobPosting, type CreateJobPostingState } from "@/app/(dashboard)/dashboard/admin/job-postings/actions";

const emptyValues = { title: "", summary: "", description: "", location: "Kent & surrounding areas" };

export function CreateJobPostingForm() {
  const [state, formAction, isPending] = useActionState<CreateJobPostingState, FormData>(createJobPosting, null);
  const [values, setValues] = useState(emptyValues);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setValues(emptyValues);
    }
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-dashed border-gray-200 p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="jp-title">Title</Label>
          <Input
            id="jp-title"
            name="title"
            placeholder="e.g. Domestic Cleaner"
            value={values.title}
            onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="jp-location">Location</Label>
          <Input
            id="jp-location"
            name="location"
            value={values.location}
            onChange={(e) => setValues((p) => ({ ...p, location: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jp-summary">Summary</Label>
        <Input
          id="jp-summary"
          name="summary"
          placeholder="One line shown on the postings list"
          value={values.summary}
          onChange={(e) => setValues((p) => ({ ...p, summary: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="jp-description">Description</Label>
        <Textarea
          id="jp-description"
          name="description"
          rows={5}
          placeholder="Full posting body, shown on the role's own page"
          value={values.description}
          onChange={(e) => setValues((p) => ({ ...p, description: e.target.value }))}
          required
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending} size="sm" className="gap-2">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Add posting
      </Button>
    </form>
  );
}
