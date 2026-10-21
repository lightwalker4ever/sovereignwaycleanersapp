import type { Metadata } from "next";
import { ContactInfoCard } from "@/components/contact/ContactInfoCard";
import { ContactForm } from "@/components/contact/ContactForm";
import { getContactFormEnabled } from "@/lib/app-settings";

export const metadata: Metadata = {
  title: "Contact Us — Sovereign Way Cleaners",
  description:
    "Get in touch with Sovereign Way Cleaners for general enquiries, feedback, or complaints.",
};

export default async function ContactPage() {
  const contactFormEnabled = await getContactFormEnabled();

  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Get In Touch
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Contact Us
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            General enquiries, feedback, or complaints — fill in the form and we&apos;ll get back
            to you within 24 hours.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
          <ContactInfoCard />
          <ContactForm contactFormEnabled={contactFormEnabled} />
        </div>
      </div>
    </section>
  );
}
