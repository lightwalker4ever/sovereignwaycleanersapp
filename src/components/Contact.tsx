"use client";

import { useActionState } from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";
import { submitContactForm } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Get In Touch
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {label}
                  </p>
                  {href ? (
                    <a
                      href={href}
                      className="text-sm transition-colors hover:underline"
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
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Jane Smith"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="jane@example.com"
                  className="h-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="01234 567 890"
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service">Service Required</Label>
                <Select name="service">
                  <SelectTrigger id="service" className="h-10 w-full">
                    <SelectValue placeholder="Select a service…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="domestic">Domestic Cleaning</SelectItem>
                    <SelectItem value="commercial">Commercial Cleaning</SelectItem>
                    <SelectItem value="tenancy">End of Tenancy</SelectItem>
                    <SelectItem value="deep">Deep Cleaning</SelectItem>
                    <SelectItem value="carpet">Carpet Cleaning</SelectItem>
                    <SelectItem value="build">After Build Clean</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="Tell us about your cleaning requirements…"
                className="resize-none"
              />
            </div>

            {state?.error && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}
            {state?.success && (
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-brand)" }}
              >
                Thank you! We&apos;ll be in touch within 24 hours.
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full rounded-full"
              size="lg"
            >
              {pending ? "Sending…" : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
