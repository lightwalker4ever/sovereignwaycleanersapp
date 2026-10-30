export function CareersIntro({ pipelineTeaser }: { pipelineTeaser: string }) {
  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--color-brand)" }}>
          Careers
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
          Join Sovereign Way Cleaners
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-gray-600">
          Whether you&apos;re looking for a role with us directly, or you run your own cleaning
          business and want to join our approved contractor pool, we&apos;d love to hear from you.
        </p>
        <p className="mt-4 text-sm font-semibold" style={{ color: "var(--color-brand)" }}>
          {pipelineTeaser}
        </p>
      </div>
    </section>
  );
}
