import Link from "next/link";
import { Home, Calendar, User, Plus, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyCleaningJobCards } from "./actions";
import { isSameDay } from "@/lib/client-jobs";
import { MobileShell } from "@/components/shell/MobileShell";
import { ClientJobHero } from "@/components/client/ClientJobHero";
import type { ShellNavItem } from "@/components/shell/types";

export const CLIENT_TABS: ShellNavItem[] = [
  { href: "/dashboard/client", label: "Home", icon: <Home size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/client/cleanings", label: "Cleanings", icon: <Calendar size={22} strokeWidth={1.9} aria-hidden="true" /> },
  { href: "/dashboard/client/account", label: "Account", icon: <User size={22} strokeWidth={1.9} aria-hidden="true" /> },
];

export default async function ClientHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
  const firstName = (profile?.full_name ?? user!.email ?? "").split(" ")[0] || "there";

  const cards = await listMyCleaningJobCards();
  const now = new Date();

  const today = cards.find((c) => isSameDay(c.scheduledAt, now) && c.displayStatus !== "completed") ?? null;
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

        <Link
          href="/?quote=open"
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
