"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuoteState } from "@/lib/quote-state";
import { resumeMyQuoteDraft } from "@/app/(dashboard)/dashboard/client/actions";
import type { EndOfTenancyInput, DeepCleaningInput, OfficeCleaningInput, QuoteServiceKey } from "@/lib/quote-calculations";
import type { TailoredServiceSlug } from "@/lib/quote-config";

/** "Continue my quote" on the dashboard's Your quotes section --
 *  authenticated equivalent of /quote/resume's magic-link flow, same
 *  sessionStorage-seeding logic, just backed by resumeMyQuoteDraft()
 *  (ownership-checked, no token/postcode needed) instead of
 *  resolveQuoteDraftByToken(). */
export function ResumeQuoteButton({ draftId, className }: { draftId: string; className?: string }) {
  const router = useRouter();
  const { update } = useQuoteState();
  const [pending, startPending] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startPending(async () => {
      const result = await resumeMyQuoteDraft(draftId);
      if (!result) {
        setError("We couldn't find that quote.");
        return;
      }
      if (result.instant) {
        const service = result.instant.service as QuoteServiceKey;
        update((prev) => ({
          ...prev,
          draftId,
          postcode: result.postcode,
          service,
          tailoredService: null,
          eot: service === "end_of_tenancy" ? (result.instant!.selectedInputs as unknown as EndOfTenancyInput) : prev.eot,
          deep: service === "deep_cleaning" ? (result.instant!.selectedInputs as unknown as DeepCleaningInput) : prev.deep,
          office: service === "office_cleaning" ? (result.instant!.selectedInputs as unknown as OfficeCleaningInput) : prev.office,
        }));
        router.push("/quote/property");
      } else if (result.tailored) {
        update((prev) => ({
          ...prev,
          draftId,
          postcode: result.postcode,
          tailoredService: result.tailored!.service as TailoredServiceSlug,
          service: null,
          tailoredAnswers: (result.tailored!.answers as unknown as Record<string, string>) ?? {},
        }));
        router.push("/quote/about-job");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={className ?? "flex h-10 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 px-4 text-sm font-bold text-white disabled:opacity-50"}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Continue my quote
      </button>
      {error && <p className="text-xs text-dash-danger">{error}</p>}
    </div>
  );
}
