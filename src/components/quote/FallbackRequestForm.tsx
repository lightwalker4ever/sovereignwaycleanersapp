"use client";

import { useActionState, useState } from "react";
import { Loader2, Clock, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { submitContactForm } from "@/actions/contact";
import { nameSchema, emailSchema, phoneSchema, messageSchema, schemaFieldError } from "@/lib/validation";
import { cn } from "@/lib/utils";

const initialState = { success: false, error: undefined as string | undefined };

type Fields = { name: string; email: string; phone: string; message: string };
type Touched = Record<keyof Fields, boolean>;

const emptyValues: Fields = { name: "", email: "", phone: "", message: "" };
const noTouched: Touched = { name: false, email: false, phone: false, message: false };
const allTouched: Touched = { name: true, email: true, phone: true, message: true };

/**
 * The "no instant pricing yet" fallback shown inside the quote wizard
 * for any service without rate-card support -- reuses the exact same
 * submitContactForm() Server Action the old homepage contact form used
 * (same contact_requests row, same admin Sales/Enquiries visibility,
 * same notification + confirmation emails), just in a leaner form fit
 * for a modal. `service` is fixed (the card the visitor clicked), not
 * user-editable.
 *
 * Fields are controlled and validated field-by-field (mirroring the
 * original homepage contact form) rather than relying on the server
 * action's single whole-form error message -- React resets a form's
 * uncontrolled fields once a `useActionState` action completes, which
 * was wiping every field but the (separately-controlled) message on a
 * server-side validation failure.
 */
export function FallbackRequestForm({
  service,
  contactFormEnabled,
}: {
  service: string;
  contactFormEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const [values, setValues] = useState<Fields>(emptyValues);
  const [touched, setTouched] = useState<Touched>(noTouched);

  const errors: Record<keyof Fields, string | null> = {
    name: schemaFieldError(nameSchema, values.name),
    email: schemaFieldError(emailSchema, values.email),
    phone: schemaFieldError(phoneSchema, values.phone),
    message: schemaFieldError(messageSchema, values.message),
  };
  const show = (f: keyof Fields) => (touched[f] ? errors[f] : null);
  const isInvalid = (f: keyof Fields) => touched[f] && errors[f] !== null;
  const set = (f: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [f]: e.target.value }));
  const touch = (f: keyof Fields) => () => setTouched((prev) => ({ ...prev, [f]: true }));

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setTouched(allTouched);
    if (Object.values(errors).some(Boolean)) {
      e.preventDefault();
    }
  }

  const inputClass = (f: keyof Fields) =>
    cn(isInvalid(f) && "border-red-400 focus-visible:ring-red-300");

  if (!contactFormEnabled) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Instant pricing isn&apos;t available yet for <strong>{service}</strong>.
        </p>
        <p className="text-sm text-gray-600">
          Our online request form is temporarily unavailable. Please call or WhatsApp us on{" "}
          <strong>01732 711856</strong> / <strong>07445 109813</strong>, or email{" "}
          <strong>info@sovereignwaycleaners.co.uk</strong>, and we&apos;ll get back to you.
        </p>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="space-y-2 py-6 text-center">
        <p className="text-lg font-semibold text-gray-900">Thank you!</p>
        <p className="text-sm text-gray-600">
          We&apos;ve received your request for <strong>{service}</strong> and will be in touch within 24 hours.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-white p-3">
        <Clock className="mt-0.5 size-4 shrink-0" style={{ color: "var(--color-brand)" }} />
        <p className="text-sm text-gray-600">
          Instant pricing isn&apos;t available yet for <strong>{service}</strong>. Tell us a bit about the job and
          we&apos;ll come back to you with a quote within 24 hours.
        </p>
      </div>

      <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-4">
        <input type="hidden" name="service" value={service} />

        <div className="space-y-1.5">
          <Label htmlFor="request-name">Full name</Label>
          <Input
            id="request-name"
            name="name"
            placeholder="Jane Smith"
            value={values.name}
            onChange={set("name")}
            onBlur={touch("name")}
            className={inputClass("name")}
            aria-invalid={isInvalid("name")}
          />
          <FieldError message={show("name")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="request-email">Email</Label>
          <Input
            id="request-email"
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
        <div className="space-y-1.5">
          <Label htmlFor="request-phone">Phone</Label>
          <Input
            id="request-phone"
            name="phone"
            type="tel"
            placeholder="Optional"
            value={values.phone}
            onChange={set("phone")}
            onBlur={touch("phone")}
            className={inputClass("phone")}
            aria-invalid={isInvalid("phone")}
          />
          <FieldError message={show("phone")} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="request-message">What do you need done?</Label>
            <span className={values.message.trim().length >= 50 ? "text-xs text-green-600" : "text-xs text-gray-400"}>
              {values.message.trim().length} / 50 min
            </span>
          </div>
          <Textarea
            id="request-message"
            name="message"
            rows={4}
            placeholder="Tell us about the property and what you'd like cleaned…"
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
            <AlertCircle size={14} className="mt-px shrink-0 text-red-500" />
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}

        <Button type="submit" disabled={pending} className="w-full gap-2 rounded-full" size="lg">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Send Request
        </Button>
      </form>
    </div>
  );
}
