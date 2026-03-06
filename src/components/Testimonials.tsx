import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Sovereign Way transformed our office. The team was professional, thorough, and arrived exactly on time. Our workspace has never looked better.",
    name: "Sarah M.",
    location: "Maidstone, Kent",
  },
  {
    quote:
      "Used them for an end of tenancy clean and got my full deposit back. Absolutely worth every penny. Would recommend to anyone moving in Kent.",
    name: "James T.",
    location: "Canterbury, Kent",
  },
  {
    quote:
      "Regular domestic cleaning every fortnight and I couldn't be happier. The difference is always noticeable and the team are so friendly.",
    name: "Claire B.",
    location: "Tunbridge Wells, Kent",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-600 uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Happy Clients
          </p>
          <h2 className="mt-2 text-3xl font-800 tracking-tight text-gray-900 sm:text-4xl">
            What Our Customers Say
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl bg-gray-50 p-8 shadow-sm"
            >
              <Quote
                size={28}
                className="mb-4 shrink-0"
                style={{ color: "var(--color-brand)" }}
              />
              <p className="flex-1 text-sm leading-7 text-gray-700">{t.quote}</p>
              {/* Stars */}
              <div className="mt-6 flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 fill-amber-400"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mt-3 text-sm font-600 text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">{t.location}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
