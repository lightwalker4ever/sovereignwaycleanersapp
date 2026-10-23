"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepDef {
  key: string;
  label: string;
  path: string;
}

const INSTANT_STEPS: StepDef[] = [
  { key: "service", label: "Service", path: "/quote/service" },
  { key: "property", label: "Your property", path: "/quote/property" },
  { key: "when", label: "Date & time", path: "/quote/when" },
  { key: "details", label: "Your details", path: "/quote/details" },
];

const TAILORED_STEPS: StepDef[] = [
  { key: "service", label: "Service", path: "/quote/service" },
  { key: "about", label: "About the job", path: "/quote/about-job" },
  { key: "details", label: "Your details", path: "/quote/details" },
];

/**
 * The numbered-dot stepper bar (desktop) / "Step X of Y" progress bar
 * (phone), shown above every step 1-4 page -- quote-handoff
 * QUOTE_HANDOFF.md's "Layout shell (desktop)". Not shown on step 5
 * (confirmation), which has no stepper in any mockup.
 */
export function QuoteStepper({
  tailored,
  mobileLeading,
}: {
  tailored: boolean;
  /** Phone-only leading icon button -- step 1 shows a close "X" (leaves the
   *  quote entirely), every later step shows a back arrow (previous step). */
  mobileLeading: { icon: "close" | "back"; onClick: () => void };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const steps = tailored ? TAILORED_STEPS : INSTANT_STEPS;
  const currentIndex = Math.max(0, steps.findIndex((s) => pathname?.startsWith(s.path)));

  return (
    <>
      <nav
        aria-label="Quote steps"
        className="hidden border-b border-dash-border bg-dash-surface px-8 py-3.5 md:block"
      >
        <ol className="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 gap-y-2 p-0">
          {steps.map((s, i) => {
            const state = i < currentIndex ? "done" : i === currentIndex ? "cur" : "todo";
            const clickable = state === "done";
            return (
              <li key={s.key} className="flex items-center gap-2.5 text-sm">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && router.push(s.path)}
                  aria-current={state === "cur" ? "step" : undefined}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-extrabold",
                    state === "todo"
                      ? "border-[1.5px] border-dash-input-border bg-white text-dash-muted"
                      : "bg-dash-brand-700 text-white",
                    clickable ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  {state === "done" ? "✓" : i + 1}
                </button>
                <span
                  className={state === "cur" ? "font-extrabold text-dash-ink" : "font-semibold text-dash-muted"}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col gap-2.5 border-b border-dash-border bg-dash-surface px-4 py-3 md:hidden">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={mobileLeading.onClick}
            aria-label={mobileLeading.icon === "close" ? "Close quote" : "Back"}
            className="flex h-11 w-11 items-center justify-center text-dash-ink"
          >
            {mobileLeading.icon === "close" ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <ArrowLeft size={22} aria-hidden="true" />
            )}
          </button>
          <span className="flex-1 text-[13px] font-bold text-dash-muted">
            Step {currentIndex + 1} of {steps.length} · {steps[currentIndex]?.label}
          </span>
        </div>
        <div className="ml-11 h-1.5 overflow-hidden rounded-full bg-dash-track">
          <div
            className="h-full bg-dash-brand-700"
            style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </>
  );
}
