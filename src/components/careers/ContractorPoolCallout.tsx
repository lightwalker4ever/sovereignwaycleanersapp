import Link from "next/link";
import Image from "next/image";
import { CalendarCheck, MapPin, ShieldCheck, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ContractorBenefit {
  icon: LucideIcon;
  title: string;
  text: string;
}

const benefits: ContractorBenefit[] = [
  {
    icon: CalendarCheck,
    title: "Flexible by design",
    text: "Tell us the days and periods you're available — we match work around your schedule, not the other way round.",
  },
  {
    icon: TrendingUp,
    title: "A growing pipeline of work",
    text: "We're actively expanding, with new contracts regularly joining the pipeline for our approved contractors.",
  },
  {
    icon: MapPin,
    title: "Local, Kent-based jobs",
    text: "Work across Kent & the surrounding areas, close to home.",
  },
  {
    icon: ShieldCheck,
    title: "A straightforward process",
    text: "Apply once, tell us what you have, and we'll guide you through onboarding step by step.",
  },
];

export function ContractorPoolCallout() {
  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[3fr_2fr]">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Run your own cleaning business?
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              We work with a strict, approved pool of contractors across Kent. If you&apos;re a
              sole trader or a company with the right insurance in place, we&apos;d like to hear
              about your experience and availability.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-2"
                    style={{ backgroundColor: "white" }}
                  >
                    <Icon size={18} style={{ color: "var(--color-brand)" }} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-gray-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/careers/apply"
              className="mt-10 inline-flex h-12 items-center rounded-full px-8 text-sm font-bold text-white"
              style={{ backgroundColor: "var(--color-brand)" }}
            >
              Apply to join our contractor pool
            </Link>
          </div>

          <div className="relative hidden min-h-80 overflow-hidden rounded-2xl shadow-lg lg:block">
            <Image
              src="/images/Sovereign%20Way%20Cleaners%20-%20Staff%201.png"
              alt="A Sovereign Way Cleaners contractor at work"
              fill
              sizes="(max-width: 1024px) 100vw, 35vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
