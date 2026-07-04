"use client";

import { useState } from "react";
import { ChevronDown, Users, Star, ShieldCheck, Clock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

interface Affiliation {
  name: string;
  full: string;
  description: string;
}

const stats: Stat[] = [
  { icon: Users, value: "500+", label: "Happy Clients" },
  { icon: Star, value: "5-Star", label: "Rated" },
  { icon: ShieldCheck, value: "100%", label: "Insured" },
  { icon: Clock, value: "10+", label: "Years Experience" },
];

const affiliations: Affiliation[] = [
  {
    name: "BICSc",
    full: "British Institute of Cleaning Science",
    description:
      "Member of the UK's leading professional body for the cleaning industry. BICSc sets the standard for professional cleaning and our membership reflects our commitment to excellence.",
  },
  {
    name: "HISCOX",
    full: "Hiscox Insurance",
    description:
      "Fully insured with Hiscox, one of the UK's leading specialist insurers. Our comprehensive coverage gives clients complete peace of mind on every job.",
  },
  {
    name: "DBS Checked",
    full: "Disclosure & Barring Service",
    description:
      "All staff hold valid DBS checks — safe and trusted in your home or workplace. We take safeguarding seriously so you don't have to.",
  },
  {
    name: "CSCS",
    full: "Construction Skills Certification Scheme",
    description:
      "CSCS-certified for safe and compliant work on construction sites. Our after-build cleaning team is trained and certified to work in active construction environments.",
  },
];

export default function Affiliations() {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <section id="affiliations" style={{ backgroundColor: "var(--color-brand-dark)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-start">

          {/* Left: Header + Stats grid */}
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-white/60">
              Our Credentials
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Affiliations &amp; Credentials
            </h2>
            <p className="mt-4 text-base leading-7 text-white/70">
              We hold recognised industry accreditations so you can hire with confidence.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-4">
              {stats.map(({ icon: Icon, value, label }) => (
                <div key={label} className="rounded-xl bg-white/10 p-5 text-center">
                  <Icon size={24} className="mx-auto mb-2 text-white/60" />
                  <p className="text-2xl font-extrabold text-white">{value}</p>
                  <p className="mt-1 text-sm text-white/60">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Accordion */}
          <div className="space-y-3">
            {affiliations.map((aff, i) => (
              <div key={aff.name} className="overflow-hidden rounded-xl border border-white/20">
                <button
                  className="flex w-full items-center justify-between px-5 py-4 text-left text-white transition-colors hover:bg-white/5"
                  onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                  aria-expanded={openIndex === i}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                    <span className="text-base font-bold">{aff.name}</span>
                    <span className="text-sm text-white/50">{aff.full}</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={cn(
                      "ml-4 shrink-0 text-white/50 transition-transform duration-200",
                      openIndex === i && "rotate-180"
                    )}
                  />
                </button>
                {openIndex === i && (
                  <div className="border-t border-white/10 px-5 py-4">
                    <p className="text-sm leading-6 text-white/70">{aff.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}
