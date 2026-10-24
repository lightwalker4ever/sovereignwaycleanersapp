"use client";

import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useQuoteState } from "@/lib/quote-state";
import { resolveQuoteDraftByToken } from "@/actions/quote";
import type { EndOfTenancyInput, DeepCleaningInput, OfficeCleaningInput } from "@/lib/quote-calculations";

export default function QuoteResumePage() {
  return (
    <Suspense fallback={null}>
      <QuoteResumePageInner />
    </Suspense>
  );
}

function QuoteResumePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useQuoteState();
  const token = searchParams.get("token") ?? "";

  const [postcode, setPostcode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  function handleSubmit() {
    if (!token) {
      setError("That link looks incomplete. Please use the link from your email.");
      return;
    }
    if (!postcode.trim()) return;
    setError(null);
    startPending(async () => {
      const result = await resolveQuoteDraftByToken(token, postcode);
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.instant) {
        update((prev) => ({
          ...prev,
          draftId: result.draftId,
          postcode: result.postcode,
          contact: { ...prev.contact, email: result.email },
          service: result.instant!.service,
          tailoredService: null,
          eot: result.instant!.service === "end_of_tenancy" ? (result.instant!.selectedInputs as unknown as EndOfTenancyInput) : prev.eot,
          deep: result.instant!.service === "deep_cleaning" ? (result.instant!.selectedInputs as unknown as DeepCleaningInput) : prev.deep,
          office: result.instant!.service === "office_cleaning" ? (result.instant!.selectedInputs as unknown as OfficeCleaningInput) : prev.office,
        }));
        router.push("/quote/property");
      } else if (result.tailored) {
        update((prev) => ({
          ...prev,
          draftId: result.draftId,
          postcode: result.postcode,
          contact: { ...prev.contact, email: result.email },
          tailoredService: result.tailored!.service,
          service: null,
          tailoredAnswers: (result.tailored!.answers as unknown as Record<string, string>) ?? {},
        }));
        router.push("/quote/about-job");
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center gap-5 p-4 py-10 sm:p-8">
      <div>
        <h1 className="m-0 text-[24px] font-extrabold tracking-tight sm:text-[28px]">Continue your quote</h1>
        <p className="mt-1.5 text-[15px] text-dash-muted">
          Enter the postcode from your quote so we can confirm it&apos;s you.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-dash-border bg-dash-surface p-5">
        <label htmlFor="resume-postcode" className="text-sm font-bold">
          Postcode
        </label>
        <input
          id="resume-postcode"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. TN9 1AB"
          className="h-12 rounded-[10px] border border-dash-input-border px-3.5 text-base font-semibold uppercase outline-none focus:border-dash-brand-700"
        />
        {error && (
          <p className="flex items-start gap-1.5 text-sm text-dash-danger">
            <AlertCircle size={14} className="mt-px shrink-0" /> {error}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !postcode.trim()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-dash-brand-700 text-base font-extrabold text-white disabled:opacity-50"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Continue
        </button>
      </div>

      <p className="text-center text-sm text-dash-muted">
        Starting fresh instead?{" "}
        <a href="/quote" className="font-semibold text-dash-brand-700">
          Get a new quote
        </a>
      </p>
    </div>
  );
}
