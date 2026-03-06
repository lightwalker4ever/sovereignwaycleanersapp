import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const usps = [
  "Fully insured and DBS-checked staff",
  "Flexible scheduling — evenings and weekends available",
  "Eco-friendly, child-safe cleaning products",
  "100% satisfaction guarantee on every clean",
  "Locally Kent-based team — supporting the community",
  "Transparent pricing with no hidden charges",
];

export default function About() {
  return (
    <section id="about" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
          {/* Image */}
          <div className="relative h-96 overflow-hidden rounded-2xl shadow-lg lg:h-[480px]">
            <Image
              src="https://picsum.photos/seed/cleaningteam/800/600"
              alt="Our cleaning team"
              fill
              className="object-cover"
            />
          </div>

          {/* Content */}
          <div>
            <p
              className="text-sm font-600 uppercase tracking-widest"
              style={{ color: "var(--color-brand)" }}
            >
              About Us
            </p>
            <h2 className="mt-2 text-3xl font-800 tracking-tight text-gray-900 sm:text-4xl">
              Why Choose Sovereign Way Cleaners?
            </h2>
            <p className="mt-4 text-base leading-7 text-gray-600">
              We&apos;re a Kent-based cleaning company built on trust, reliability, and
              exceptional results. Our trained professionals treat every property
              with care, using the best products and techniques for lasting
              cleanliness.
            </p>

            <ul className="mt-8 space-y-4">
              {usps.map((usp) => (
                <li key={usp} className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0"
                    style={{ color: "var(--color-brand)" }}
                  />
                  <span className="text-sm leading-6 text-gray-700">{usp}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
