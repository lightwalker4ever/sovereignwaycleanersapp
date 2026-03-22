import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center" id="hero">
      <Image
        src="https://picsum.photos/seed/cleaninghero/1920/1080"
        alt="Professional cleaning service"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-semibold">
          Serving Kent &amp; Surrounding Areas
        </Badge>
        <h1 className="text-4xl font-normal leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Kent's Trusted{" "}
          <span style={{ color: "#86efac" }}>Cleaners</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-200">
          Providing professional domestic, commercial, and specialist cleaning services
          delivered by fully insured, local experts. Satisfaction guaranteed.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="#contact"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "rounded-full px-8 py-3.5 text-base font-semibold"
            )}
          >
            Get a Free Quote
          </Link>
          <Link
            href="#services"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "rounded-full border-white/70 bg-transparent px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 hover:text-white"
            )}
          >
            Our Services
          </Link>
        </div>
      </div>
    </section>
  );
}
