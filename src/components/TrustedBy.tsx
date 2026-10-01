import Image from "next/image";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const GOOGLE_PROFILE_URL = "https://share.google/6G2kXF5KSqg9jWF64";

interface Partner {
  name: string;
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
}

// Logos share a common display height; width is derived from each
// source image's own aspect ratio so nothing looks stretched.
const partners: Partner[] = [
  { name: "Leaders", logoSrc: "/images/leaders-logo-transparent.png", logoWidth: 96, logoHeight: 64 },
  { name: "The Salvation Army", logoSrc: "/images/The_Salvation_Army.svg.webp", logoWidth: 54, logoHeight: 64 },
  { name: "Methodist Church", logoSrc: "/images/methodist.jpg", logoWidth: 64, logoHeight: 61 },
  { name: "Waghorn & Company", logoSrc: "/images/waghorn.png", logoWidth: 102, logoHeight: 64 },
  { name: "Chelvaa Homes", logoSrc: "/images/chelvaa-logo-transparent.png", logoWidth: 64, logoHeight: 64 },
];

export default function TrustedBy() {
  return (
    <section id="testimonials" className="bg-white">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p
            className="text-sm font-semibold uppercase tracking-widest"
            style={{ color: "var(--color-brand)" }}
          >
            Trusted By
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Organisations We Work With
          </h2>
          <p className="mt-4 text-base leading-7 text-gray-600">
            We&apos;re proud to be trusted by local businesses and organisations across Kent.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {partners.map((partner) => (
            <div
              key={partner.name}
              className="flex h-28 items-center justify-center rounded-2xl bg-gray-50 p-6 shadow-sm"
            >
              <Image
                src={partner.logoSrc}
                alt={partner.name}
                width={partner.logoWidth}
                height={partner.logoHeight}
                className="object-contain"
              />
            </div>
          ))}
        </div>

        <div className="mt-14 text-center">
          <p className="text-base leading-7 text-gray-600">
            See what our clients are saying about us.
          </p>
          <a
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "mt-6 rounded-full px-8 py-3.5 text-base font-semibold"
            )}
          >
            Read Our Reviews on Google ↗
          </a>
        </div>
      </div>
    </section>
  );
}
