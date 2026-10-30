import Link from "next/link";

export function ContractorPoolCallout() {
  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-5xl px-6 py-20 text-center lg:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Run your own cleaning business?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
          We work with a strict, approved pool of contractors across Kent. If you&apos;re a sole
          trader or a company with the right insurance in place, we&apos;d like to hear about your
          experience and availability.
        </p>
        <Link
          href="/careers/apply"
          className="mt-8 inline-flex h-12 items-center rounded-full px-8 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          Apply to join our contractor pool
        </Link>
      </div>
    </section>
  );
}
