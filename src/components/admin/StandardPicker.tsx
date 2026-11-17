"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import {
  attachExistingStandard,
  createAndAttachStandard,
  searchStandardsCatalog,
  type CatalogSearchResult,
} from "@/app/(dashboard)/dashboard/admin/standards/actions";

/**
 * Type-ahead "attach a standard" control: search the shared catalog
 * as you type, pick an existing match, or create a new catalog entry
 * if nothing fits -- the point being that "Empty bins" is typed once,
 * ever, and reused everywhere it applies instead of being duplicated
 * per area template.
 */
export function StandardPicker({
  areaTemplateId,
  autoFocus,
}: {
  areaTemplateId: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      searchStandardsCatalog(trimmed)
        .then((r) => setResults(r))
        .finally(() => setIsSearching(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pickExisting(standard: CatalogSearchResult) {
    setError(null);
    startTransition(async () => {
      try {
        await attachExistingStandard(areaTemplateId, standard.id);
        setQuery("");
        setResults([]);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to attach standard");
      }
    });
  }

  function createNew() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setError(null);
    startTransition(async () => {
      try {
        await createAndAttachStandard(areaTemplateId, trimmed);
        setQuery("");
        setResults([]);
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to create standard");
      }
    });
  }

  const exactMatch = results.some((r) => r.title.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-[10px] border border-dash-input-border px-3 focus-within:border-dash-brand-700">
        <Search className="h-4 w-4 shrink-0 text-dash-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(true);
            if (next.trim()) {
              setIsSearching(true);
            } else {
              setIsSearching(false);
              setResults([]);
            }
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search or add a standard, e.g. Empty bins"
          disabled={isPending}
          className="h-11 flex-1 bg-transparent text-sm text-dash-ink outline-none"
        />
        {(isSearching || isPending) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-dash-muted" />}
      </div>

      {open && query.trim() && (
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-y-auto rounded-[10px] border border-dash-border bg-dash-surface shadow-lg">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => pickExisting(r)}
              className="flex w-full flex-col items-start gap-0.5 px-3.5 py-2.5 text-left hover:bg-dash-bg"
            >
              <span className="text-sm font-semibold text-dash-ink">{r.title}</span>
              {r.description && <span className="text-xs text-dash-muted">{r.description}</span>}
            </button>
          ))}
          {!exactMatch && (
            <button
              type="button"
              onClick={createNew}
              className="flex w-full items-center gap-1.5 border-t border-dash-border-soft px-3.5 py-2.5 text-left text-sm font-semibold text-dash-brand-700 hover:bg-dash-bg"
            >
              + Create &quot;{query.trim()}&quot; as a new standard
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-1 text-sm text-dash-danger">{error}</p>}
    </div>
  );
}
