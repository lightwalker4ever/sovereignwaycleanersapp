import Link from "next/link";

/**
 * The /quote journey's own minimal header -- logo, Services, Gallery,
 * no app sidebar, no mobile hamburger -- per quote-handoff/
 * QUOTE_HANDOFF.md's "Layout shell (desktop)". Deliberately not the
 * full marketing Header (which carries extra nav + the Get a Quote CTA
 * that would be redundant on the quote page itself). No "Sign in"
 * link, per the user's feedback -- this is a self-serve quote flow,
 * not a place to prompt an existing customer to log in.
 */
export function QuoteHeader() {
  return (
    <header className="flex min-h-[68px] flex-wrap items-center gap-5 border-b border-dash-border bg-dash-surface px-4 sm:px-8">
      <Link href="/" className="flex items-center gap-2.5 text-dash-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-dash-brand-900 text-[12px] font-extrabold text-dash-gold sm:h-9 sm:w-9 sm:text-[13px]">
          SW
        </span>
        <span className="text-[15px] font-extrabold sm:text-base">Sovereign Way Cleaners</span>
      </Link>
      <span className="flex-1" />
      <Link href="/services" className="hidden text-sm font-semibold text-dash-ink-2 sm:block">
        Services
      </Link>
      <Link href="/gallery" className="hidden text-sm font-semibold text-dash-ink-2 sm:block">
        Gallery
      </Link>
    </header>
  );
}
