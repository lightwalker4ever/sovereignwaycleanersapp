"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { QuoteStepper } from "@/components/quote-flow/QuoteStepper";
import { useQuoteState } from "@/lib/quote-state";
import { uploadTailoredPhoto, deleteTailoredPhoto } from "@/actions/quote";
import { compressImage } from "@/lib/image-compress";
import { TAILORED_QUESTIONS } from "@/lib/quote-config";
import { services } from "@/components/Services";
import { cn } from "@/lib/utils";

export default function QuoteAboutJobPage() {
  const router = useRouter();
  const { state, update, hydrated } = useQuoteState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, startUploading] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !state.tailoredService) router.replace("/quote/service");
  }, [hydrated, state.tailoredService, router]);

  useEffect(() => {
    if (hydrated && !state.tailoredPhotoGroupId) {
      update({ tailoredPhotoGroupId: crypto.randomUUID() });
    }
  }, [hydrated, state.tailoredPhotoGroupId, update]);

  if (!state.tailoredService) return null;

  const service = services.find((s) => s.slug === state.tailoredService);
  const questions = TAILORED_QUESTIONS[state.tailoredService];

  function handleFilesChosen(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    const remaining = 6 - state.tailoredPhotos.length;
    const toUpload = Array.from(files).slice(0, remaining);
    startUploading(async () => {
      for (const file of toUpload) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.append("file", compressed);
        const result = await uploadTailoredPhoto(state.tailoredPhotoGroupId, formData);
        if (result.success) {
          update((prev) => ({ tailoredPhotos: [...prev.tailoredPhotos, { storagePath: result.storagePath, name: file.name }] }));
        } else {
          setUploadError(result.error);
        }
      }
    });
  }

  function handleRemovePhoto(storagePath: string) {
    update((prev) => ({ tailoredPhotos: prev.tailoredPhotos.filter((p) => p.storagePath !== storagePath) }));
    deleteTailoredPhoto(storagePath);
  }

  return (
    <>
      <QuoteStepper tailored mobileLeading={{ icon: "back", onClick: () => router.push("/quote/service") }} />

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5.5 p-4 pb-8 sm:p-8">
        <div>
          <button type="button" onClick={() => router.push("/quote/service")} className="text-sm font-semibold">
            ← Change service
          </button>
          <h1 className="mt-2 mb-0 text-[24px] font-extrabold tracking-tight sm:text-[30px]">{service?.name}</h1>
          <p className="mt-1.5 text-[15px] text-dash-muted">
            A few quick taps and we&apos;ll email a tailored price within 24 hours.
          </p>
        </div>

        <div className="flex flex-col gap-5.5 rounded-2xl border border-dash-border bg-dash-surface p-5.5">
          {questions.map((q) => (
            <fieldset key={q.key} className="m-0 flex flex-col gap-2.5 border-0 p-0">
              <legend className="mb-2.5 p-0 text-[15px] font-extrabold">{q.question}</legend>
              <div className="flex flex-wrap gap-2">
                {q.options.map((opt) => {
                  const on = state.tailoredAnswers[q.key] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({ tailoredAnswers: { ...state.tailoredAnswers, [q.key]: opt } })}
                      className={cn(
                        "h-11 rounded-full px-4 text-sm font-bold",
                        on
                          ? "border-2 border-dash-brand-700 bg-dash-brand-700 text-white"
                          : "border-[1.5px] border-dash-input-border bg-white text-dash-ink"
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="flex flex-col gap-2.5">
            <span className="text-[15px] font-extrabold">
              Photos <span className="font-medium text-dash-muted">Optional, helps us price accurately</span>
            </span>
            <div className="flex flex-wrap gap-2.5">
              {state.tailoredPhotos.map((p) => (
                <div key={p.storagePath} className="relative h-[72px] w-[72px] overflow-hidden rounded-xl bg-dash-photo">
                  <span className="flex h-full w-full items-center justify-center p-1 text-center text-[10px] font-bold text-dash-ink-2">
                    {p.name.length > 14 ? `${p.name.slice(0, 11)}…` : p.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(p.storagePath)}
                    aria-label={`Remove ${p.name}`}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {state.tailoredPhotos.length < 6 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex h-[72px] w-[72px] flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed border-dash-input-border bg-white text-[12px] font-bold text-dash-brand-700 disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Plus size={20} aria-hidden="true" />}
                  Add
                </button>
              )}
            </div>
            {uploadError && <p className="text-xs text-dash-danger">{uploadError}</p>}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFilesChosen(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <label className="flex flex-col gap-1.5 text-[15px] font-extrabold">
            Anything else? <span className="font-medium text-dash-muted">Optional</span>
            <textarea
              rows={2}
              placeholder="e.g. focus on the kitchen, we have a dog"
              value={state.tailoredNotes}
              onChange={(e) => update({ tailoredNotes: e.target.value })}
              className="resize-none rounded-[10px] border border-dash-input-border px-3.5 py-2.5 text-[15px] font-normal outline-none focus:border-dash-brand-700"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={() => router.push("/quote/details")}
          className="flex h-13.5 items-center justify-center rounded-xl bg-dash-brand-700 text-base font-extrabold text-white"
        >
          Continue to your details
        </button>
      </div>
    </>
  );
}
