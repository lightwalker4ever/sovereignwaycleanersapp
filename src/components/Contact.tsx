"use client";

import { useActionState, useEffect, useState } from "react";
import { Phone, Mail, MapPin, Clock, AlertCircle } from "lucide-react";
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
  // Letters and spaces only; apostrophe allowed strictly in the middle of a word
  if (!v.trim() || !/^[A-Za-z]+(?:[ '][A-Za-z]+)*$/.test(v.trim())) {
    return "Invalid name provided. Please make sure your name doesn't contain special characters";
  }
  return null;
}

function validatePhone(v: string): string | null {
  if (!v.trim()) return null; // optional field — only validate when provided
  const n = v.replace(/[\s\-().]/g, "");
  const msg = "Invalid phone number. Please provide a valid UK phone number";
  if (!/^0\d{10}$/.test(n)) return msg;               // must be 11 digits, start with 0
  if (!/^0[123789]/.test(n)) return msg;               // valid UK prefix
  if (/^0770[0-9]/.test(n)) return msg;                // Ofcom drama range 07700–07709
  if (/(\d)\1{4,}/.test(n)) return msg;                // 5+ repeated digits (e.g. 07111111111)
  if (/01234567/.test(n)) return msg;                  // obvious sequential
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

type Fields = { name: string; email: string; phone: string; service: string; message: string };
type Touched = Record<keyof Fields, boolean>;

const emptyValues: Fields = { name: "", email: "", phone: "", service: "", message: "" };
const noTouched: Touched = { name: false, email: false, phone: false, service: false, message: false };
const allTouched: Touched = { name: true, email: true, phone: true, service: true, message: true };

const initialState = { success: false, error: undefined };

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
    message: validateMessage(values.message),
  };

  const show = (f: keyof Fields) => (touched[f] ? errors[f] : null);
  const isInvalid = (f: keyof Fields) => touched[f] && errors[f] !== null;

  const set = (f: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [f]: e.target.value }));

  const touch = (f: keyof Fields) => () =>
    setTouched((prev) => ({ ...prev, [f]: true }));

  // Reset form after successful submission
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
              { icon: Phone, label: "Phone", value: "+44 1234 567 890", href: "tel:+441234567890" },
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
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm transition-colors hover:underline" style={{ color: "var(--color-brand)" }}>
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
          <form action={formAction} onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Full Name */}
              <div className="space-y-0">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Jane Smith"
                  value={values.name}
                  onChange={set("name")}
                  onBlur={touch("name")}
                  className={inputClass("name")}
                  aria-invalid={isInvalid("name")}
                />
                <FieldError message={show("name")} />
              </div>

              {/* Email */}
              <div className="space-y-0">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="jane@example.com"
                  value={values.email}
                  onChange={set("email")}
                  onBlur={touch("email")}
                  className={inputClass("email")}
                  aria-invalid={isInvalid("email")}
                />
                <FieldError message={show("email")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Phone */}
              <div className="space-y-0">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="01234 567 890"
                  value={values.phone}
                  onChange={set("phone")}
                  onBlur={touch("phone")}
                  className={inputClass("phone")}
                  aria-invalid={isInvalid("phone")}
                />
                <FieldError message={show("phone")} />
              </div>

              {/* Service */}
              <div className="space-y-0">
                <Label htmlFor="service">Service Required *</Label>
                <Select
                  name="service"
                  value={values.service}
                  onValueChange={(v) => {
                    setValues((prev) => ({ ...prev, service: v ?? "" }));
                    setTouched((prev) => ({ ...prev, service: true }));
                  }}
                >
                  <SelectTrigger
                    id="service"
                    className={cn("h-10 w-full", isInvalid("service") && "border-red-400 focus:ring-red-300")}
                    aria-invalid={isInvalid("service")}
                  >
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
                <FieldError message={show("service")} />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-0">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="message">Message *</Label>
                <span className={cn("text-xs tabular-nums", values.message.trim().length >= 50 ? "text-green-600" : "text-gray-400")}>
                  {values.message.trim().length} / 50 min
                </span>
              </div>
              <Textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Tell us about your cleaning requirements…"
                value={values.message}
                onChange={set("message")}
                onBlur={touch("message")}
                className={cn("resize-none", isInvalid("message") && "border-red-400 focus-visible:ring-red-300")}
                aria-invalid={isInvalid("message")}
              />
              <FieldError message={show("message")} />
            </div>

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
