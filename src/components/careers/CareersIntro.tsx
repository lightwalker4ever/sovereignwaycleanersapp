import Image from "next/image";

export function CareersIntro({ pipelineTeaser }: { pipelineTeaser: string }) {
  return (
    <section style={{ backgroundColor: "var(--color-accent)" }}>
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <p
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--color-brand)" }}
            >
              Careers
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Join Sovereign Way Cleaners
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-gray-600">
              Whether you&apos;re looking for a role with us directly, or you run your own
              cleaning business and want to join our approved contractor pool, we&apos;d love
              to hear from you.
            </p>
            <span
              className="mt-6 inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ backgroundColor: "var(--color-brand)", color: "white" }}
            >
              {pipelineTeaser}
            </span>
          </div>

          <div className="relative min-h-64 overflow-hidden rounded-2xl shadow-lg lg:min-h-80">
            <Image
              src="/images/Sovereign%20Way%20Cleaners%20-%20Staff%202.png"
              alt="A Sovereign Way Cleaners team member at work"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
