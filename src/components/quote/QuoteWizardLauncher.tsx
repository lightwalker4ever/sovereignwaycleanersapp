"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { QuoteWizard, type QuoteServiceKey } from "@/components/quote/QuoteWizard";

const SERVICE_KEYS: QuoteServiceKey[] = ["end_of_tenancy", "deep_cleaning", "office_cleaning"];

export function QuoteWizardLauncher() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const quoteParam = searchParams.get("quote");
  const isOpen = quoteParam !== null;
  const initialService = SERVICE_KEYS.includes(quoteParam as QuoteServiceKey)
    ? (quoteParam as QuoteServiceKey)
    : null;

  function handleClose() {
    router.replace(pathname, { scroll: false });
  }

  return <QuoteWizard open={isOpen} initialService={initialService} onClose={handleClose} />;
}
