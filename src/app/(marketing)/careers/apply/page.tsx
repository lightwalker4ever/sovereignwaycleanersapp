import type { Metadata } from "next";
import { ContractorApplicationForm } from "@/components/careers/ContractorApplicationForm";

export const metadata: Metadata = {
  title: "Apply as a Contractor — Sovereign Way Cleaners",
  description: "Apply to join Sovereign Way Cleaners' approved contractor pool.",
};

export default function ContractorApplyPage() {
  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
            Contractor Application
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Join our approved contractor pool
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Tell us a bit about yourself and your business. We&apos;ll review your application and get back to
            you with next steps.
          </p>
        </div>

        <div className="mt-14">
          <ContractorApplicationForm />
        </div>
      </div>
    </section>
  );
}
