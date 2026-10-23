import type { ArrivalWindowKey } from "@/lib/quote-state";

/**
 * The small summary stashed in sessionStorage when step 4 submits
 * successfully, read once by step 5 (/quote/confirmed) -- kept
 * separate from the main in-progress QuoteState blob, which is cleared
 * immediately on submit per quote-handoff QUOTE_HANDOFF.md principle 4.
 */
export interface QuoteConfirmationData {
  isTailored: boolean;
  reference: string;
  cleaningId: string;
  firstName: string;
  email: string;
  serviceName: string;
  totalIncVat: number;
  postcode: string;
  dateIso: string | null;
  windowKey: ArrivalWindowKey | null;
  isFlexible: boolean;
}

const KEY = "swc:quote:confirmation:v1";

export function readQuoteConfirmation(): QuoteConfirmationData | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QuoteConfirmationData) : null;
  } catch {
    return null;
  }
}

export function writeQuoteConfirmation(data: QuoteConfirmationData) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Private browsing / storage disabled -- confirmation page falls back to generic copy.
  }
}

export function clearQuoteConfirmation() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Ignore.
  }
}
