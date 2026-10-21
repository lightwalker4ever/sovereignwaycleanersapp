"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QuoteWizard } from "@/components/quote/QuoteWizard";
import { services } from "@/components/Services";
import type { QuoteServiceKey } from "@/lib/quote-calculations";

const SERVICE_KEYS: QuoteServiceKey[] = ["end_of_tenancy", "deep_cleaning", "office_cleaning"];

// Every service without rate-card support, keyed by its stable slug --
// resolves a ?quote=<slug> deep link straight into the fallback
// "request a quote" form for that service.
const REQUEST_SERVICE_NAME_BY_SLUG = new Map(
  services.filter((s) => !s.quoteService).map((s) => [s.slug, s.name])
);

export function QuoteWizardLauncher({ contactFormEnabled }: { contactFormEnabled: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const quoteParam = searchParams.get("quote");
  const isOpen = quoteParam !== null;
  const initialService = SERVICE_KEYS.includes(quoteParam as QuoteServiceKey)
    ? (quoteParam as QuoteServiceKey)
    : null;
  const initialRequestService = quoteParam ? (REQUEST_SERVICE_NAME_BY_SLUG.get(quoteParam) ?? null) : null;

  function handleClose() {
    router.replace(pathname, { scroll: false });
  }

  return (
    <QuoteWizard
      open={isOpen}
      initialService={initialService}
      initialRequestService={initialRequestService}
      contactFormEnabled={contactFormEnabled}
      onClose={handleClose}
    />
  );
}
