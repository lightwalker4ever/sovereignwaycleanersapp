const GOOGLE_PROFILE_URL = "https://share.google/6G2kXF5KSqg9jWF64";

const testimonials = [
  {
    quote:
      "I have been using Sovereign Way cleaners for quite a few months now and what a find. I have recommended them to many friends as I am really happy with the top quality service. Thank you.",
    name: "Suzi Crabb",
    location: "Kent, UK",
    stars: 5,
  },
  {
    quote:
      "We booked Sovereign Way Cleaners for an end-of-tenancy deep cleaning, and they did an outstanding job. They covered everything, including carpets, windows, fridge, oven, dishwasher, washing machine, kitchen, and bathroom. The cleaning was carried out to a very high standard in a professional manner, and the price was very reasonable.\n\nEven the independent inspection report arranged by the estate agent confirmed that the property was cleaned to a professional standard. I'm very pleased with their service and would highly recommend them.",
    name: "Iasantha Bandara",
    location: "Kent, UK",
    stars: 5,
  },
  {
    quote:
      "Forget and the team come to us every three weeks and are absolutely phenomenal, best cleaners we've had. The whole team is extremely thorough, hard-working and professional. I would recommended them to anyone!",
    name: "Cameron Allan",
    location: "Kent, UK",
    stars: 5,
  },
];

function StarIcon() {
  return (
    <svg className="h-4 w-4 fill-amber-400" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0][0];
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ backgroundColor: "var(--color-brand)" }}
      aria-hidden="true"
    >
      {initials.toUpperCase()}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section id="testimonials" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Happy Clients
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            What Our Customers Say
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="flex flex-col rounded-2xl bg-white p-6 shadow-sm"
            >
              {/* Stars */}
              <div className="flex gap-0.5">
                {[...Array(t.stars)].map((_, i) => (
                  <StarIcon key={i} />
                ))}
              </div>

              {/* Quote */}
              <p className="mt-4 flex-1 text-sm leading-7 text-gray-700 whitespace-pre-line">
                {t.quote}
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <Initials name={t.name} />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>

              <a
                href={GOOGLE_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 text-xs font-medium transition-opacity hover:opacity-70"
                style={{ color: "var(--color-brand)" }}
              >
                Read on Google ↗
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
