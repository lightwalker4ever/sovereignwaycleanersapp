import { Phone, Mail, MapPin, Clock, ShieldCheck } from "lucide-react";

const DETAILS = [
  { icon: Phone, label: "Phone", value: "01732 711856 / 07445 109813", href: "tel:+447445109813" },
  { icon: Mail, label: "Email", value: "info@sovereignwaycleaners.co.uk", href: "mailto:info@sovereignwaycleaners.co.uk" },
  { icon: MapPin, label: "Location", value: "Kent, United Kingdom", href: undefined },
  { icon: Clock, label: "Hours", value: "Mon–Fri 8am–6pm · Sat 9am–4pm", href: undefined },
];

export function ContactInfoCard() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-gray-900">Let&apos;s Talk</h3>
      <p className="mt-2 text-sm leading-6 text-gray-500">
        Prefer to speak to someone? Reach us directly below.
      </p>

      <div className="mt-6 space-y-5">
        {DETAILS.map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="flex items-start gap-4">
            <div
              className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5"
              style={{ backgroundColor: "var(--color-brand-light)" }}
            >
              <Icon size={18} style={{ color: "var(--color-brand)" }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
              {href ? (
                <a href={href} className="text-sm transition-colors hover:underline" style={{ color: "var(--color-brand)" }}>
                  {value}
                </a>
              ) : (
                <p className="text-sm text-gray-700">{value}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-6 flex items-center gap-3 rounded-xl p-4"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        <ShieldCheck size={22} style={{ color: "var(--color-brand)" }} className="shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Fully Insured &amp; Reliable</p>
          <p className="text-xs text-gray-500">All staff are DBS checked and insured</p>
        </div>
      </div>
    </div>
  );
}
