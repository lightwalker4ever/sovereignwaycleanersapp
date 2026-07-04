import Image from "next/image";
import {
  Home,
  Building2,
  KeyRound,
  Sparkles,
  Layers,
  HardHat,
  ShieldCheck,
  Users,
  Calendar,
  Leaf,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Service {
  icon: LucideIcon;
  name: string;
  description: string;
  image: string;
}

const services: Service[] = [
  {
    icon: Home,
    name: "Domestic Cleaning",
    description:
      "Regular home cleaning tailored to your schedule. We keep your living spaces spotless so you can focus on what matters.",
    image: "/images/Domestic%20Cleaning.png",
  },
  {
    icon: Building2,
    name: "Commercial Cleaning",
    description:
      "Professional cleaning for offices, retail spaces, and commercial premises. First impressions count.",
    image: "/images/Commercial%20Cleaning.png",
  },
  {
    icon: KeyRound,
    name: "End of Tenancy",
    description:
      "Thorough move-out cleans to meet landlord and letting agency standards. Helping you secure your deposit.",
    image: "/images/End%20of%20Tenancy.png",
  },
  {
    icon: Sparkles,
    name: "Deep Cleaning",
    description:
      "Top-to-bottom intensive cleans for kitchens, bathrooms, and entire properties that need extra attention.",
    image: "/images/Deep%20Cleaning.png",
  },
  {
    icon: Layers,
    name: "Carpet Cleaning",
    description:
      "Steam and dry cleaning methods to lift stains and refresh carpets. Restoring colour and freshness.",
    image: "/images/Carpet%20Cleaning.png",
  },
  {
    icon: HardHat,
    name: "After Build Clean",
    description:
      "Post-construction cleaning removing dust, debris, and residue — leaving new spaces ready to use.",
    image: "/images/After%20Build%20Clean.png",
  },
];

const USP_ITEMS = [
  { icon: ShieldCheck, label: "Fully Insured" },
  { icon: Users, label: "Trusted Local Team" },
  { icon: Calendar, label: "Flexible Scheduling" },
  { icon: Leaf, label: "Eco-Friendly Products" },
  { icon: Star, label: "5-Star Rated" },
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
              <div
                key={service.name}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative h-52 w-full overflow-hidden">
                  <Image
                    src={service.image}
                    alt={service.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-6">
                  <div
                    className="mb-3 inline-flex items-center justify-center rounded-full p-2.5"
                    style={{ backgroundColor: "var(--color-brand-light)" }}
                  >
                    <Icon size={20} style={{ color: "var(--color-brand)" }} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {service.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 border-t border-gray-200 pt-12">
          <ul className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {USP_ITEMS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex flex-col items-center gap-3 text-center">
                <div
                  className="inline-flex items-center justify-center rounded-full p-3"
                  style={{ backgroundColor: "var(--color-brand-light)" }}
                >
                  <Icon size={22} style={{ color: "var(--color-brand)" }} />
                </div>
                <span className="text-sm font-semibold text-gray-800">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
