"use client";

import { useCallback, useEffect, useState } from "react";
import type { EndOfTenancyInput, DeepCleaningInput, OfficeCleaningInput, QuoteServiceKey } from "@/lib/quote-calculations";
import type { TailoredServiceSlug } from "@/lib/quote-config";

export type ArrivalWindowKey = "morning" | "midday" | "afternoon";
export type AccessMethod = "present" | "key_safe" | "agent_keys";

export interface QuoteContact {
  name: string;
  email: string;
  phone: string;
}

/**
 * Everything the /quote journey needs to remember between its step
 * pages, persisted to sessionStorage (principle 4 of
 * quote-handoff/QUOTE_HANDOFF.md) so Back/refresh/a shared link never
 * lose an answer -- cleared only once a request is actually submitted.
 * Photo File objects can't be JSON-serialized, so they live in local
 * component state on the tailored "About the job" step only and are
 * NOT part of this persisted blob (a refresh there loses added photos,
 * same as it would lose an in-progress native file picker selection).
 */
export interface QuoteState {
  postcode: string;
  coverage: { checked: boolean; covered: boolean; area: string | null } | null;
  location: { multiplier: number; label: string } | null;
  service: QuoteServiceKey | null;
  tailoredService: TailoredServiceSlug | null;
  eot: EndOfTenancyInput;
  deep: DeepCleaningInput;
  office: OfficeCleaningInput;
  tailoredAnswers: Record<string, string>;
  tailoredNotes: string;
  /** Already-uploaded storage paths (quote-request-photos bucket, under
   *  pending/{tailoredPhotoGroupId}/...) -- small enough to persist in
   *  sessionStorage, unlike the File objects themselves. */
  tailoredPhotos: { storagePath: string; name: string }[];
  tailoredPhotoGroupId: string;
  date: string | null;
  window: ArrivalWindowKey | null;
  flexible: boolean;
  contact: QuoteContact;
  addressLine: string;
  accessMethod: AccessMethod | null;
  accessNotes: string;
  trackOnline: boolean;
  marketingConsent: boolean;
}

export const DEFAULT_QUOTE_STATE: QuoteState = {
  postcode: "",
  coverage: null,
  location: null,
  service: null,
  tailoredService: null,
  eot: { propertySize: "bed2", bathrooms: 1, addons: {} },
  deep: { bedrooms: 1, toilets: 1, wcs: 1, kitchens: 1, lounges: 1, addons: {} },
  office: { method: "hourly", hours: 2, sqm: 20, frequency: "weekly" },
  tailoredAnswers: {},
  tailoredNotes: "",
  tailoredPhotos: [],
  tailoredPhotoGroupId: "",
  date: null,
  window: null,
  flexible: false,
  contact: { name: "", email: "", phone: "" },
  addressLine: "",
  accessMethod: null,
  accessNotes: "",
  trackOnline: true,
  marketingConsent: false,
};

const STORAGE_KEY = "swc:quote:v1";

function readStoredState(): QuoteState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_QUOTE_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_QUOTE_STATE, ...parsed };
  } catch {
    return DEFAULT_QUOTE_STATE;
  }
}

function writeStoredState(state: QuoteState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing / storage disabled -- the journey still works
    // within a single page, it just won't survive a refresh.
  }
}

/**
 * Reads/writes the shared QuoteState to sessionStorage. `hydrated` is
 * false for one tick after mount (server-rendered HTML has no access
 * to sessionStorage) -- callers should hold off deciding whether a
 * required earlier step is missing until hydrated is true.
 */
export function useQuoteState() {
  const [state, setState] = useState<QuoteState>(DEFAULT_QUOTE_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // sessionStorage doesn't exist during SSR, so the real value can only
    // be read once mounted on the client -- this is the standard
    // hydration-safe "read an external store on mount" pattern, not a
    // derivable value the lint rule's dead-code case would apply to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStoredState());
    setHydrated(true);
  }, []);

  const update = useCallback(
    (patch: Partial<QuoteState> | ((prev: QuoteState) => Partial<QuoteState>)) => {
      setState((prev) => {
        const resolved = typeof patch === "function" ? patch(prev) : patch;
        const next = { ...prev, ...resolved };
        writeStoredState(next);
        return next;
      });
    },
    []
  );

  const clear = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore -- see writeStoredState.
    }
    setState(DEFAULT_QUOTE_STATE);
  }, []);

  return { state, update, clear, hydrated };
}
