"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitJobApplication } from "@/actions/recruitment";

export function JobApplicationForm({ jobPostingId }: { jobPostingId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await submitJobApplication(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-2xl bg-gray-50 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 size-10" style={{ color: "var(--color-brand)" }} />
        <p className="text-lg font-semibold text-gray-900">Application received</p>
        <p className="mt-2 text-sm text-gray-600">Thanks for applying -- we&apos;ll be in touch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-gray-50 p-6">
      <input type="hidden" name="jobPostingId" value={jobPostingId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ja-name">Full Name *</Label>
          <Input id="ja-name" name="fullName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ja-email">Email *</Label>
          <Input id="ja-email" name="email" type="email" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ja-phone">Phone Number *</Label>
        <Input id="ja-phone" name="phone" type="tel" placeholder="07123 456789" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ja-message">Message (optional)</Label>
        <Textarea id="ja-message" name="message" rows={3} className="resize-none" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="ja-cv">CV (optional)</Label>
        <input
          id="ja-cv"
          name="cv"
          type="file"
          accept=".pdf,.doc,.docx"
          className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-semibold file:shadow-sm"
        />
      </div>

      {error && (
        <div className="flex items-start gap-1.5" role="alert">
          <AlertCircle size={14} className="mt-px shrink-0 text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full rounded-full" size="lg">
        {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
        Submit application
      </Button>
    </form>
  );
}
