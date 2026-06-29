import {
  Award,
  Clock,
  Shield,
  Heart,
  SlidersHorizontal,
  TrendingUp,
  Users,
  RefreshCw,
  Lightbulb,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface Value {
  icon: LucideIcon;
  title: string;
  description: string;
}

const values: Value[] = [
  {
    icon: Award,
    title: "Excellence in Service",
    description:
      "We are committed to delivering the highest standards of cleaning across all environments — from homes to commercial spaces.",
  },
  {
    icon: Clock,
    title: "Reliability & Accountability",
    description:
      "We understand the value of trust. That's why we show up on time, communicate clearly, and deliver what we promise.",
  },
  {
    icon: Shield,
    title: "Integrity in Action",
    description:
      "We operate with honesty and transparency in everything we do — from clear, upfront pricing to straightforward communication. Our word is our bond.",
  },
  {
    icon: Heart,
    title: "Respect for People and Spaces",
    description:
      "We treat every property with care and every person with dignity — whether it's a client's home, an office, or a construction site.",
  },
  {
    icon: SlidersHorizontal,
    title: "Adaptability",
    description:
      "We tailor our services to match individual client requirements, scheduling preferences, and specific environments.",
  },
  {
    icon: TrendingUp,
    title: "Growth-Minded",
    description:
      "We invest in our people, improve our systems, and embrace innovation to grow sustainably.",
  },
  {
    icon: Users,
    title: "Community Commitment",
    description:
      "We strive to become a positive force through local engagement and partnerships within the communities we serve.",
  },
  {
    icon: RefreshCw,
    title: "Continuous Improvement",
    description:
      "We embrace learning, feedback, and innovation. Whether it's adopting safer products, smarter systems, or more efficient methods, we're always working to improve.",
  },
  {
    icon: Lightbulb,
    title: "Empowerment through Opportunity",
    description:
      "We believe in lifting others as we grow. Our long-term vision includes offering training and internship opportunities.",
  },
];

export default function CoreValues() {
  return (
    <section id="values" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            What We Stand For
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Our Core Values
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            These principles guide every job we take on and every relationship we build.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <Card
                key={value.title}
                className="rounded-2xl bg-gray-50 shadow-sm transition-shadow hover:shadow-md gap-2"
              >
                <CardHeader className="pb-0">
                  <div
                    className="mb-3 inline-flex w-fit items-center justify-center rounded-full p-3"
                    style={{ backgroundColor: "var(--color-brand-light)" }}
                  >
                    <Icon size={24} style={{ color: "var(--color-brand)" }} />
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {value.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-gray-600">
                    {value.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
