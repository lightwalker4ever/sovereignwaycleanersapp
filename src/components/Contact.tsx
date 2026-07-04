"use client";

import { useActionState, useEffect, useState } from "react";
import { Phone, Mail, MapPin, Clock, AlertCircle, ShieldCheck, CheckCircle, Users, Star, Leaf } from "lucide-react";
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
import { cn } from "@/lib/utils";

// ── Validation ────────────────────────────────────────────────────────────────

function validateName(v: string): string | null {
  if (!v.trim() || !/^[A-Za-z]+(?:[ '][A-Za-z]+)*$/.test(v.trim())) {
    return "Invalid name provided. Please make sure your name doesn't contain special characters";
  }
  return null;
}

function validatePhone(v: string): string | null {
  if (!v.trim()) return null;
  const n = v.replace(/[\s\-().]/g, "");
  const msg = "Invalid phone number. Please provide a valid UK phone number";
  if (!/^0\d{10}$/.test(n)) return msg;
  if (!/^0[123789]/.test(n)) return msg;
  if (/^0770[0-9]/.test(n)) return msg;
  if (/(\d)\1{4,}/.test(n)) return msg;
  if (/01234567/.test(n)) return msg;
  return null;
}

function validateEmail(v: string): string | null {
  if (!v.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) {
    return "Invalid email provided. The email should be provided in a valid email format.";
  }
  return null;
}

function validateMessage(v: string): string | null {
  if (v.trim().length < 50) {
    return "Please provide a description of the service being requested.";
  }
  return null;
}

function validateService(v: string): string | null {
  if (!v) return "Please select one service.";
  return null;
}

// ── Error display ─────────────────────────────────────────────────────────────

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-1.5 mt-1.5" role="alert" aria-live="polite">
      <AlertCircle size={13} className="shrink-0 mt-px text-red-500" />
      <p className="text-xs leading-tight text-red-600">{message}</p>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Fields = {
  name: string;
  email: string;
  phone: string;
  service: string;
  propertyType: string;
  preferredDate: string;
  preferredTime: string;
  message: string;
};
type Touched = Record<keyof Fields, boolean>;

const emptyValues: Fields = {
  name: "", email: "", phone: "", service: "",
  propertyType: "", preferredDate: "", preferredTime: "", message: "",
};
const noTouched: Touched = {
  name: false, email: false, phone: false, service: false,
  propertyType: false, preferredDate: false, preferredTime: false, message: false,
};
const allTouched: Touched = {
  name: true, email: true, phone: true, service: true,
  propertyType: true, preferredDate: true, preferredTime: true, message: true,
};

const initialState = { success: false, error: undefined };

const STATS = [
  { icon: Users, value: "500+", label: "Happy Clients" },
  { icon: ShieldCheck, value: "100%", label: "Fully Insured" },
  { icon: Star, value: "5-Star", label: "Rated" },
  { icon: Leaf, value: "Eco", label: "Friendly Products" },
];

const FORM_TRUST = [
  { icon: ShieldCheck, text: "Secure & Confidential" },
  { icon: Clock, text: "Response within 24h" },
  { icon: CheckCircle, text: "No obligation" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Contact() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const [values, setValues] = useState<Fields>(emptyValues);
  const [touched, setTouched] = useState<Touched>(noTouched);

  const errors: Record<keyof Fields, string | null> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    service: validateService(values.service),
    propertyType: null,
    preferredDate: null,
    preferredTime: null,
    message: validateMessage(values.message),
  };

  const show = (f: keyof Fields) => (touched[f] ? errors[f] : null);
  const isInvalid = (f: keyof Fields) => touched[f] && errors[f] !== null;

  const set = (f: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [f]: e.target.value }));

  const setSelect = (f: keyof Fields) => (v: string | null) =>
    setValues((prev) => ({ ...prev, [f]: v ?? "" }));

  const touch = (f: keyof Fields) => () =>
    setTouched((prev) => ({ ...prev, [f]: true }));

  useEffect(() => {
    if (state?.success) {
      setValues(emptyValues);
      setTouched(noTouched);
    }
  }, [state?.success]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setTouched(allTouched);
    if (Object.values(errors).some(Boolean)) {
      e.preventDefault();
    }
  }

  const inputClass = (f: keyof Fields) =>
    cn("h-10", isInvalid(f) && "border-red-400 focus-visible:ring-red-300");

  return (
    <section id="contact" style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">

        {/* Header */}
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

        {/* Two-card layout */}
        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">

          {/* Left card: contact info */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">Let&apos;s Talk</h3>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Prefer to speak to someone? Reach us directly below.
            </p>

            <div id="contact-info" className="mt-8 space-y-6">
              {[
                { icon: Phone, label: "Phone", value: "01732 711856 / 07445 109813", href: "tel:+447445109813" },
                { icon: Mail, label: "Email", value: "info@sovereignwaycleaners.co.uk", href: "mailto:info@sovereignwaycleaners.co.uk" },
                { icon: MapPin, label: "Location", value: "Kent, United Kingdom", href: undefined },
                { icon: Clock, label: "Hours", value: "Mon–Fri 8am–6pm · Sat 9am–4pm", href: undefined },
              ].map(({ icon: Icon, label, value, href }) => (
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

            {/* Trust badge */}
            <div
              className="mt-8 flex items-center gap-3 rounded-xl p-4"
              style={{ backgroundColor: "var(--color-accent)" }}
            >
              <ShieldCheck size={22} style={{ color: "var(--color-brand)" }} className="shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">Fully Insured &amp; Reliable</p>
                <p className="text-xs text-gray-500">All staff are DBS checked and insured</p>
              </div>
            </div>
          </div>

          {/* Right card: form */}
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <form action={formAction} onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Row 1: Name + Email */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-0">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name" name="name" type="text" placeholder="Jane Smith"
                    value={values.name} onChange={set("name")} onBlur={touch("name")}
                    className={inputClass("name")} aria-invalid={isInvalid("name")}
                  />
                  <FieldError message={show("name")} />
                </div>
                <div className="space-y-0">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email" name="email" type="email" placeholder="jane@example.com"
                    value={values.email} onChange={set("email")} onBlur={touch("email")}
                    className={inputClass("email")} aria-invalid={isInvalid("email")}
                  />
                  <FieldError message={show("email")} />
                </div>
              </div>

              {/* Row 2: Phone + Service */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="space-y-0">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone" name="phone" type="tel" placeholder="07123 456789"
                    value={values.phone} onChange={set("phone")} onBlur={touch("phone")}
                    className={inputClass("phone")} aria-invalid={isInvalid("phone")}
                  />
                  <FieldError message={show("phone")} />
                </div>
                <div className="space-y-0">
                  <Label htmlFor="service">Service Required *</Label>
                  <Select
                    name="service" value={values.service}
                    onValueChange={(v) => { setSelect("service")(v); touch("service")(); }}
                  >
                    <SelectTrigger
                      id="service"
                      className={cn("h-10 w-full", isInvalid("service") && "border-red-400 focus:ring-red-300")}
                      aria-invalid={isInvalid("service")}
                    >
                      <SelectValue placeholder="Select a service…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Domestic Cleaning">Domestic Cleaning</SelectItem>
                      <SelectItem value="Commercial Cleaning">Commercial Cleaning</SelectItem>
                      <SelectItem value="End of Tenancy">End of Tenancy</SelectItem>
                      <SelectItem value="Deep Cleaning">Deep Cleaning</SelectItem>
                      <SelectItem value="Carpet Cleaning">Carpet Cleaning</SelectItem>
                      <SelectItem value="After Build Clean">After Build Clean</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError message={show("service")} />
                </div>
              </div>

              {/* Row 3: Property Type + Preferred Date + Preferred Time */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <div className="space-y-0">
                  <Label htmlFor="propertyType">Property Type <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Select name="propertyType" value={values.propertyType} onValueChange={setSelect("propertyType")}>
                    <SelectTrigger id="propertyType" className="h-10 w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="House / Bungalow">House / Bungalow</SelectItem>
                      <SelectItem value="Flat / Apartment">Flat / Apartment</SelectItem>
                      <SelectItem value="Office">Office</SelectItem>
                      <SelectItem value="Retail / Commercial">Retail / Commercial</SelectItem>
                      <SelectItem value="Construction Site">Construction Site</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0">
                  <Label htmlFor="preferredDate">Preferred Date <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Input
                    id="preferredDate" name="preferredDate" type="date"
                    value={values.preferredDate} onChange={set("preferredDate")}
                    className="h-10"
                  />
                </div>
                <div className="space-y-0">
                  <Label htmlFor="preferredTime">Preferred Time <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Select name="preferredTime" value={values.preferredTime} onValueChange={setSelect("preferredTime")}>
                    <SelectTrigger id="preferredTime" className="h-10 w-full">
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Morning (8am–12pm)">Morning (8am–12pm)</SelectItem>
                      <SelectItem value="Afternoon (12pm–5pm)">Afternoon (12pm–5pm)</SelectItem>
                      <SelectItem value="Evening (5pm–8pm)">Evening (5pm–8pm)</SelectItem>
                      <SelectItem value="Flexible">Flexible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 4: Message */}
              <div className="space-y-0">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="message">Message *</Label>
                  <span className={cn("text-xs tabular-nums", values.message.trim().length >= 50 ? "text-green-600" : "text-gray-400")}>
                    {values.message.trim().length} / 50 min
                  </span>
                </div>
                <Textarea
                  id="message" name="message" rows={4}
                  placeholder="Tell us about your cleaning requirements…"
                  value={values.message} onChange={set("message")} onBlur={touch("message")}
                  className={cn("resize-none", isInvalid("message") && "border-red-400 focus-visible:ring-red-300")}
                  aria-invalid={isInvalid("message")}
                />
                <FieldError message={show("message")} />
              </div>

              {/* Trust strip */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
                {FORM_TRUST.map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon size={13} style={{ color: "var(--color-brand)" }} />
                    {text}
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {state?.error && (
                <div className="flex items-start gap-1.5" role="alert">
                  <AlertCircle size={14} className="shrink-0 mt-px text-red-500" />
                  <p className="text-sm text-red-600">{state.error}</p>
                </div>
              )}
              {state?.success && (
                <p className="text-sm font-medium" style={{ color: "var(--color-brand)" }}>
                  Thank you! We&apos;ll be in touch within 24 hours.
                </p>
              )}

              <Button type="submit" disabled={pending} className="w-full rounded-full" size="lg">
                {pending ? "Sending…" : "Send Message"}
              </Button>

            </form>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 rounded-xl bg-white py-6 shadow-sm">
              <Icon size={22} style={{ color: "var(--color-brand)" }} />
              <p className="text-lg font-extrabold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
