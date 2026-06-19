import {
  Home,
  Building2,
  KeyRound,
  Sparkles,
  Layers,
  HardHat,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface Service {
  icon: LucideIcon;
  name: string;
  description: string;
}

const services: Service[] = [
  {
    icon: Home,
    name: "Domestic Cleaning",
    description:
      "Regular home cleaning tailored to your schedule. We keep your living spaces spotless so you can focus on what matters.",
  },
  {
    icon: Building2,
    name: "Commercial Cleaning",
    description:
      "Professional cleaning for offices, retail spaces, and commercial premises. First impressions count.",
  },
  {
    icon: KeyRound,
    name: "End of Tenancy",
    description:
      "Thorough move-out cleans to meet landlord and letting agency standards. Helping you secure your deposit.",
  },
  {
    icon: Sparkles,
    name: "Deep Cleaning",
    description:
      "Top-to-bottom intensive cleans for kitchens, bathrooms, and entire properties that need extra attention.",
  },
  {
    icon: Layers,
    name: "Carpet Cleaning",
    description:
      "Steam and dry cleaning methods to lift stains and refresh carpets. Restoring colour and freshness.",
  },
  {
    icon: HardHat,
    name: "After Build Clean",
    description:
      "Post-construction cleaning removing dust, debris, and residue — leaving new spaces ready to use.",
  },
];

export default function Services() {
  return (
    <section id="services" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            What We Do
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Our Cleaning Services
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            From one-off deep cleans to regular scheduled visits, we cover every
            cleaning need across Kent.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <Card
                key={service.name}
                className="rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md gap-2"
              >
                <CardHeader className="pb-0">
                  <div
                    className="mb-3 inline-flex w-fit items-center justify-center rounded-full p-3"
                    style={{ backgroundColor: "var(--color-brand-light)" }}
                  >
                    <Icon size={24} style={{ color: "var(--color-brand)" }} />
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">
                    {service.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-6 text-gray-600">
                    {service.description}
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
