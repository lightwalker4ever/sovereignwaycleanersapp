import { QuoteHeader } from "@/components/quote-flow/QuoteHeader";

/**
 * Chrome for the whole /quote journey -- intentionally separate from
 * (marketing)/layout.tsx (no Header/Footer/QuoteWizardLauncher) and
 * from the dashboard shell (no sidebar). Each step page renders its
 * own QuoteStepper, since only the page knows the current step and
 * the right "back" target.
 */
export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-dash-bg text-dash-ink">
      <QuoteHeader />
      {children}
    </div>
  );
}
