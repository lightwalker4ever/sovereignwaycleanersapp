"use client";

import { useActionState } from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { submitContactForm } from "@/actions/contact";

const initialState = { success: false, error: undefined };

export default function Contact() {
  const [state, formAction, pending] = useActionState(
    submitContactForm,
    initialState
  );

  return (
    <section id="contact" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-600 uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Get In Touch
          </p>
          <h2 className="mt-2 text-3xl font-800 tracking-tight text-gray-900 sm:text-4xl">
            Request a Free Quote
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Fill in the form and we&apos;ll get back to you within 24 hours.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Contact details */}
          <div id="contact-info" className="space-y-6">
            {[
              {
                icon: Phone,
                label: "Phone",
                value: "+44 1234 567 890",
                href: "tel:+441234567890",
              },
              {
                icon: Mail,
                label: "Email",
                value: "info@sovereignwaycleaners.co.uk",
                href: "mailto:info@sovereignwaycleaners.co.uk",
              },
              {
                icon: MapPin,
                label: "Location",
                value: "Kent, United Kingdom",
                href: undefined,
              },
              {
                icon: Clock,
                label: "Hours",
                value: "Mon–Fri 8am–6pm · Sat 9am–4pm",
                href: undefined,
              },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4">
                <div
                  className="inline-flex shrink-0 items-center justify-center rounded-full p-2.5"
                  style={{ backgroundColor: "var(--color-brand-light)" }}
                >
                  <Icon size={18} style={{ color: "var(--color-brand)" }} />
                </div>
                <div>
                  <p className="text-xs font-600 uppercase tracking-wider text-gray-500">
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm text-gray-800 transition-colors hover:underline"
                      style={{ color: "var(--color-brand)" }}
                    >
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-800">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-500 text-gray-700">
                  Full Name *
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2"
                  style={{ "--tw-ring-color": "var(--color-brand)" } as React.CSSProperties}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-500 text-gray-700">
                  Email Address *
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2"
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-500 text-gray-700">
                  Phone Number
                </label>
                <input
                  name="phone"
                  type="tel"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2"
                  placeholder="01234 567 890"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-500 text-gray-700">
                  Service Required
                </label>
                <select
                  name="service"
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2"
                >
                  <option value="">Select a service…</option>
                  <option>Domestic Cleaning</option>
                  <option>Commercial Cleaning</option>
                  <option>End of Tenancy</option>
                  <option>Deep Cleaning</option>
                  <option>Carpet Cleaning</option>
                  <option>After Build Clean</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-500 text-gray-700">
                Message *
              </label>
              <textarea
                name="message"
                required
                rows={5}
                className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2"
                placeholder="Tell us about your cleaning requirements…"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            {state?.success && (
              <p
                className="text-sm font-500"
                style={{ color: "var(--color-brand)" }}
              >
                Thank you! We&apos;ll be in touch within 24 hours.
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-full py-3 text-sm font-600 text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--color-brand)" }}
              onMouseEnter={(e) => {
                if (!pending)
                  e.currentTarget.style.backgroundColor =
                    "var(--color-brand-dark)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-brand)";
              }}
            >
              {pending ? "Sending…" : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
