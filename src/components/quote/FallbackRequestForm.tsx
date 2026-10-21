"use client";

import { useActionState, useState } from "react";
import { Loader2, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitContactForm } from "@/actions/contact";

const initialState = { success: false, error: undefined as string | undefined };

/**
 * The "no instant pricing yet" fallback shown inside the quote wizard
 * for any service without rate-card support -- reuses the exact same
 * submitContactForm() Server Action the old homepage contact form used
 * (same contact_requests row, same admin Sales/Enquiries visibility,
 * same notification + confirmation emails), just in a leaner form fit
 * for a modal. `service` is fixed (the card the visitor clicked), not
 * user-editable.
 */
export function FallbackRequestForm({
  service,
  contactFormEnabled,
}: {
  service: string;
  contactFormEnabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const [message, setMessage] = useState("");

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
      <div className="flex items-start gap-2 rounded-xl bg-accent p-3">
        <Clock className="mt-0.5 size-4 shrink-0" style={{ color: "var(--color-brand)" }} />
        <p className="text-sm text-gray-600">
          Instant pricing isn&apos;t available yet for <strong>{service}</strong>. Tell us a bit about the job and
          we&apos;ll come back to you with a quote within 24 hours.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="service" value={service} />

        <div className="space-y-1.5">
          <Label htmlFor="request-name">Full name</Label>
          <Input id="request-name" name="name" placeholder="Jane Smith" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="request-email">Email</Label>
          <Input id="request-email" name="email" type="email" placeholder="jane@example.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="request-phone">Phone</Label>
          <Input id="request-phone" name="phone" type="tel" placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="request-message">What do you need done?</Label>
            <span className={message.trim().length >= 50 ? "text-xs text-green-600" : "text-xs text-gray-400"}>
              {message.trim().length} / 50 min
            </span>
          </div>
          <Textarea
            id="request-message"
            name="message"
            rows={4}
            placeholder="Tell us about the property and what you'd like cleaned…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={50}
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full gap-2 rounded-full" size="lg">
          {pending && <Loader2 className="size-4 animate-spin" />}
          Send Request
        </Button>
      </form>
    </div>
  );
}
