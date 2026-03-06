import Image from "next/image";
import Link from "next/link";


export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center" id="hero">
      {/* Background image */}
      <Image
        src="https://picsum.photos/seed/cleaninghero/1920/1080"
        alt="Professional cleaning service"
        fill
        priority
        className="object-cover"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <p
          className="mb-4 inline-block rounded-full px-4 py-1.5 text-sm font-600 text-white"
          style={{ backgroundColor: "var(--color-brand)" }}
        >
          Serving Kent &amp; Surrounding Areas
        </p>
        <h1 className="text-4xl font-800 leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Kent&apos;s Trusted{" "}
          <span style={{ color: "#86efac" }}>Cleaning Experts</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg font-400 leading-8 text-gray-200">
          Professional domestic, commercial, and specialist cleaning services
          delivered by fully insured, local experts. Satisfaction guaranteed.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="#contact"
            className="btn-brand rounded-full px-8 py-3.5 text-base font-600 text-white transition-colors"
          >
            Get a Free Quote
          </Link>
          <Link
            href="#services"
            className="rounded-full border border-white/70 px-8 py-3.5 text-base font-600 text-white transition-colors hover:bg-white/10"
          >
            Our Services
          </Link>
        </div>
      </div>
    </section>
  );
}
