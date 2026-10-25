import Link from "next/link";
import { Home, Calendar, User, Plus, Bell, Phone, MessageCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { listMyCleaningJobCards, listMyPendingQuotes } from "./actions";
import { isSameDay } from "@/lib/client-jobs";
import { MobileShell } from "@/components/shell/MobileShell";
import { SignOutButton } from "@/components/shell/SignOutButton";
import { ClientJobHero } from "@/components/client/ClientJobHero";
import { ResumeQuoteButton } from "@/components/client/ResumeQuoteButton";
import type { ShellNavItem } from "@/components/shell/types";
import type { ClientQuoteCard } from "@/lib/client-quotes";

export const CLIENT_TABS: ShellNavItem[] = [
  { href: "/dashboard/client", label: "Home", icon: <Home size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/client/cleanings", label: "Cleanings", icon: <Calendar size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/client/account", label: "Account", icon: <User size={22} strokeWidth={1.9} aria-hidden="true" /> },
];

export default async function ClientHomePage() {
  const user = await getCurrentUser();
  const firstName = (user?.fullName ?? user?.email ?? "").split(" ")[0] || "there";

  const [cards, pendingQuotes] = await Promise.all([listMyCleaningJobCards(), listMyPendingQuotes()]);
  const now = new Date();

  // A request still awaiting confirmation has no real date yet (its
  // scheduledAt is just a placeholder), so it's shown in the live card
  // regardless of day -- the customer wants to see it right away, not
  // only once its placeholder date happens to be today.
  const today =
    cards.find((c) => c.displayStatus === "awaiting_confirmation") ??
    cards.find((c) => isSameDay(c.scheduledAt, now) && c.displayStatus !== "completed") ??
    null;
  const next =
    cards
      .filter((c) => c.displayStatus === "scheduled" && new Date(c.scheduledAt) > now && c.id !== today?.id)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0] ?? null;
  const past = cards.filter((c) => c.displayStatus === "completed").slice(0, 3);

  return (
    <MobileShell
      header={
        <header className="flex items-center gap-3 px-5 pt-6 pb-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-dash-brand-900 text-sm font-extrabold text-dash-gold">
            SW
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-dash-muted">Sovereign Way Cleaners</div>
            <h1 className="text-2xl font-extrabold">Hi {firstName}</h1>
          </div>
          <SignOutButton />
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-dash-border bg-dash-surface text-dash-muted"
          >
            <Bell size={20} strokeWidth={1.8} />
          </span>
        </header>
      }
      tabs={CLIENT_TABS}
    >
      <div className="flex flex-col gap-3.5 px-4 pb-6">
        {today && <ClientJobHero card={today} linkToDetail />}

        {next && (
          <section className="flex items-center gap-3.5 rounded-[20px] bg-dash-brand-900 px-[18px] py-4 text-white">
            <div className="flex h-14 w-13 shrink-0 flex-col items-center justify-center rounded-xl bg-white/10">
              <span className="text-[11px] font-bold text-dash-gold">
                {new Date(next.scheduledAt).toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase()}
              </span>
              <span className="text-xl font-extrabold">{new Date(next.scheduledAt).getDate()}</span>
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="text-xs font-bold tracking-wide text-dash-sidebar-muted uppercase">Next cleaning</span>
              <span className="text-base font-bold">
                {new Date(next.scheduledAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {next.cleanerName ? ` · ${next.cleanerName}` : ""}
              </span>
            </div>
          </section>
        )}

        {!today && !next && (
          <div className="rounded-[20px] border border-dash-border bg-dash-surface p-5 text-sm text-dash-muted">
            Nothing booked right now.
          </div>
        )}

        {pendingQuotes.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <h2 className="px-1 text-xs font-bold tracking-wide text-dash-muted uppercase">Your quotes</h2>
            {pendingQuotes.map((q) => (
              <PendingQuoteCard key={q.id} quote={q} />
            ))}
          </div>
        )}

        <Link
          href="/quote"
          className="flex h-13 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dash-brand-700 bg-white text-[15px] font-extrabold text-dash-brand-700"
        >
          <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
          Request another cleaning
        </Link>

        <div className="mt-1 flex items-baseline justify-between px-1">
          <h2 className="text-xs font-bold tracking-wide text-dash-muted uppercase">Past cleanings</h2>
          <Link href="/dashboard/client/cleanings" className="text-[13px] font-bold">
            See all
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-dash-border bg-dash-surface">
          {past.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/client/${c.id}`}
              className="flex items-center gap-3 border-b border-dash-border-soft px-4 py-3.5 text-dash-ink last:border-b-0"
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">
                  {new Date(c.scheduledAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span className="text-[13px] font-semibold text-[#155B33]">
                  {c.total} of {c.total} standards met
                </span>
              </span>
              {c.myRating ? (
                <span aria-label={`You rated ${c.myRating} out of 5`} className="text-sm tracking-widest text-[#9A6A00]">
                  {"★".repeat(c.myRating)}
                  {"☆".repeat(5 - c.myRating)}
                </span>
              ) : (
                <span className="rounded-full bg-dash-brand-100 px-3 py-1.5 text-[13px] font-bold text-dash-brand-700">Rate it</span>
              )}
            </Link>
          ))}
          {past.length === 0 && <p className="px-4 py-6 text-center text-sm text-dash-muted">No cleanings finished yet.</p>}
        </div>
      </div>
    </MobileShell>
  );
}

const STATUS_COPY: Record<ClientQuoteCard["status"], { label: string; bg: string; text: string }> = {
  quoted_draft: { label: "Not yet requested", bg: "#DFF1E5", text: "#155B33" },
  tailored_draft: { label: "Not yet sent", bg: "#DFF1E5", text: "#155B33" },
  awaiting_quote: { label: "We're pricing this", bg: "#FFF1D1", text: "#7A4B00" },
  tailored_quoted: { label: "Price ready", bg: "#E3EEFB", text: "#1C4F8F" },
};

/** One card per item from listMyPendingQuotes() -- a quote the client
 *  started but hasn't turned into a real booking yet (Phase D). The
 *  two pre-submission states get a "Continue my quote" button; a
 *  submitted tailored request either shows "we're pricing this"
 *  (nothing to do yet) or, once staff have priced it, the price plus
 *  a link into the same /quote/response accept/decline page the
 *  quote email itself links to -- Call/WhatsApp stay as a fallback. */
function PendingQuoteCard({ quote }: { quote: ClientQuoteCard }) {
  const info = STATUS_COPY[quote.status];
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-dash-border bg-dash-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{quote.serviceTitle}</span>
          <span className="text-[13px] text-dash-muted">{quote.reference}</span>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: info.bg, color: info.text }}
        >
          {info.label}
        </span>
      </div>

      {quote.totalIncVat !== null && (
        <span className="text-lg font-extrabold">£{quote.totalIncVat.toFixed(2)}</span>
      )}

      {quote.resumable && <ResumeQuoteButton draftId={quote.id} />}

      {quote.status === "tailored_quoted" && quote.resumeToken && (
        <div className="flex flex-col gap-2">
          <Link
            href={`/quote/response?token=${quote.resumeToken}`}
            className="flex h-10 items-center justify-center rounded-xl bg-dash-brand-700 text-sm font-bold text-white"
          >
            Respond to this quote
          </Link>
          <div className="flex gap-2">
            <a
              href="tel:01732711856"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-dash-brand-700 text-sm font-bold text-dash-brand-700"
            >
              <Phone size={15} aria-hidden="true" /> Call
            </a>
            <a
              href="https://wa.me/447445109813"
              className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-dash-brand-700 text-sm font-bold text-dash-brand-700"
            >
              <MessageCircle size={15} aria-hidden="true" /> WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
