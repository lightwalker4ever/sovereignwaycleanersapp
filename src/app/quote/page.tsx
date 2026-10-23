import { redirect } from "next/navigation";

/**
 * `/quote` itself is just an entry point -- forwards straight to step 1,
 * preserving any ?service=&postcode= deep-link params (quote-handoff
 * QUOTE_HANDOFF.md principle 1), which /quote/service reads once on
 * mount to seed sessionStorage state.
 */
export default async function QuoteEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") qs.set(key, value);
  }
  const suffix = qs.toString();
  redirect(`/quote/service${suffix ? `?${suffix}` : ""}`);
}
