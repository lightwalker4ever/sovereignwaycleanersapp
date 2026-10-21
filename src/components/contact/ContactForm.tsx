"use client";

import { useActionState, useState } from "react";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitContactForm } from "@/actions/contact";
import { nameSchema, emailSchema, phoneSchema, messageSchema, schemaFieldError } from "@/lib/validation";
import { cn } from "@/lib/utils";

const TOPICS = ["General enquiries", "Feedback", "Complaints"] as const;
const topicSchema = z.string().min(1, "Please select a topic");

const initialState = { success: false, error: undefined as string | undefined };

type Fields = { name: string; email: string; phone: string; topic: string; message: string };
type Touched = Record<keyof Fields, boolean>;

const emptyValues: Fields = { name: "", email: "", phone: "", topic: "", message: "" };
const noTouched: Touched = { name: false, email: false, phone: false, topic: false, message: false };
const allTouched: Touched = { name: true, email: true, phone: true, topic: true, message: true };

/**
 * The dedicated Contact Us form -- for general enquiries, feedback, and
 * complaints that don't belong in the instant-quote wizard. Reuses the
 * same submitContactForm() action (same contact_requests row, same
 * Sales/Enquiries visibility) with `topic` sent through as the generic
 * `service` field. Same controlled-fields, field-by-field validation
 * pattern as the quote wizard's fallback request form.
 */
export function ContactForm({ contactFormEnabled }: { contactFormEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);
  const [values, setValues] = useState<Fields>(emptyValues);
  const [touched, setTouched] = useState<Touched>(noTouched);

  const errors: Record<keyof Fields, string | null> = {
    name: schemaFieldError(nameSchema, values.name),
    email: schemaFieldError(emailSchema, values.email),
    phone: schemaFieldError(phoneSchema, values.phone),
    topic: schemaFieldError(topicSchema, values.topic),
    message: schemaFieldError(messageSchema, values.message),
  };
  const show = (f: keyof Fields) => (touched[f] ? errors[f] : null);
  const isInvalid = (f: keyof Fields) => touched[f] && errors[f] !== null;
  const set = (f: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((prev) => ({ ...prev, [f]: e.target.value }));
  const setTopic = (v: string | null) => setValues((prev) => ({ ...prev, topic: v ?? "" }));
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
      <div className="flex items-center rounded-2xl bg-white p-8 shadow-sm">
        <p className="text-sm leading-6 text-gray-600">
          Our online form is temporarily unavailable. Please call, WhatsApp, or email us using
          the details to the left and we&apos;ll be happy to help.
        </p>
      </div>
    );
  }

  if (state?.success) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white p-8 shadow-sm">
        <div className="space-y-2 py-6 text-center">
          <p className="text-lg font-semibold text-gray-900">Thank you!</p>
          <p className="text-sm text-gray-600">
            We&apos;ve received your message and will be in touch within 24 hours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm">
      <form action={formAction} onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-name">Full Name *</Label>
            <Input
              id="contact-name"
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
            <Label htmlFor="contact-email">Email Address *</Label>
            <Input
              id="contact-email"
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
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Phone Number</Label>
            <Input
              id="contact-phone"
              name="phone"
              type="tel"
              placeholder="07123 456789"
              value={values.phone}
              onChange={set("phone")}
              onBlur={touch("phone")}
              className={inputClass("phone")}
              aria-invalid={isInvalid("phone")}
            />
            <FieldError message={show("phone")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-topic">Topic *</Label>
            <Select
              name="service"
              value={values.topic}
              onValueChange={(v) => {
                setTopic(v);
                touch("topic")();
              }}
            >
              <SelectTrigger
                id="contact-topic"
                className={cn("h-10 w-full", isInvalid("topic") && "border-red-400 focus:ring-red-300")}
                aria-invalid={isInvalid("topic")}
              >
                <SelectValue placeholder="Select a topic…" />
              </SelectTrigger>
              <SelectContent>
                {TOPICS.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={show("topic")} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="contact-message">Message *</Label>
            <span className={cn("text-xs tabular-nums", values.message.trim().length >= 50 ? "text-green-600" : "text-gray-400")}>
              {values.message.trim().length} / 50 min
            </span>
          </div>
          <Textarea
            id="contact-message"
            name="message"
            rows={4}
            placeholder="Tell us how we can help…"
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

        <Button type="submit" disabled={pending} className="w-full rounded-full" size="lg">
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Send Message
        </Button>
      </form>
    </div>
  );
}
