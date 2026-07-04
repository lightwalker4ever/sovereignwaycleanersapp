import Image from "next/image";
import Link from "next/link";
import { Award, Users, Heart, Leaf } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

interface Highlight {
  icon: LucideIcon;
  label: string;
  text: string;
}

const highlights: Highlight[] = [
  {
    icon: Award,
    label: "Professional Standards",
    text: "Delivering the highest standards in every job, every time.",
  },
  {
    icon: Users,
    label: "Empowering People",
    text: "Training and growing the next generation of cleaning professionals.",
  },
  {
    icon: Heart,
    label: "Community Focused",
    text: "Actively engaging with and giving back to local communities.",
  },
  {
    icon: Leaf,
    label: "Sustainable Future",
    text: "Eco-friendly products for healthier homes and a cleaner planet.",
  },
];

export default function Vision() {
  return (
    <section id="vision" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[2fr_3fr_2fr] lg:items-stretch">

          {/* Left: Staff photo */}
          <div className="relative min-h-80 overflow-hidden rounded-2xl shadow-lg lg:min-h-0">
            <Image
              src="/images/Sovereign%20Way%20Cleaners%20-%20Staff%201.png"
              alt="Sovereign Way Cleaners professional"
              fill
              sizes="(max-width: 1024px) 100vw, 28vw"
              className="object-cover"
            />
          </div>

          {/* Centre: Vision text + CTA */}
          <div className="flex flex-col justify-center lg:px-8">
            <p
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-brand)" }}
            >
              Our Vision
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Excellence in Every Clean
            </h2>
            <p className="mt-6 text-base leading-7 text-gray-600">
              To become a trusted leader in delivering high-quality, professional
              cleaning services across the UK — while creating meaningful impact by
              offering training and internship opportunities in the cleaning industry,
              empowering others with skills, and actively giving back through community
              engagement and local initiatives.
            </p>
            <div className="mt-8">
              <Link
                href="#contact"
                className={cn(
                  buttonVariants({ variant: "default", size: "lg" }),
                  "rounded-full px-8"
                )}
              >
                Book a Clean Today
              </Link>
            </div>
          </div>

          {/* Right: Highlights card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400">
              What We Stand For
            </p>
            <ul className="space-y-5">
              {highlights.map(({ icon: Icon, label, text }) => (
                <li key={label} className="flex items-start gap-3">
                  <div
                    className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full p-2"
                    style={{ backgroundColor: "var(--color-brand-light)" }}
                  >
                    <Icon size={16} style={{ color: "var(--color-brand)" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-gray-500">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </section>
  );
}
