import { BadgeCheck } from "lucide-react";

const affiliations = [
  {
    name: "BICSc",
    full: "British Institute of Cleaning Science",
    description: "Member of the UK's leading professional body for the cleaning industry.",
  },
  {
    name: "HISCOX",
    full: "Hiscox Insurance",
    description: "Fully insured with Hiscox, giving clients complete peace of mind.",
  },
  {
    name: "DBS Checked",
    full: "Disclosure & Barring Service",
    description: "All staff hold valid DBS checks — safe and trusted in your home or workplace.",
  },
  {
    name: "CSCS",
    full: "Construction Skills Certification Scheme",
    description: "CSCS-certified for safe and compliant work on construction sites.",
  },
];

export default function Affiliations() {
  return (
    <section id="affiliations" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Credentials & Certifications
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Our Affiliations
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            We hold recognised industry accreditations so you can hire with confidence.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {affiliations.map((a) => (
            <div
              key={a.name}
              className="flex flex-col items-center rounded-2xl bg-white px-6 py-8 text-center shadow-sm"
            >
              <div
                className="mb-4 inline-flex items-center justify-center rounded-full p-3"
                style={{ backgroundColor: "var(--color-brand-light)" }}
              >
                <BadgeCheck size={28} style={{ color: "var(--color-brand)" }} />
              </div>
              <span className="text-xl font-extrabold text-gray-900">{a.name}</span>
              <span className="mt-1 text-xs font-medium text-gray-500">{a.full}</span>
              <p className="mt-3 text-sm leading-6 text-gray-600">{a.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
