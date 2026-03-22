"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

const HERO_IMAGES = [
  { src: "/images/everdrop-gmbh-SqOMDOQb3ws-unsplash.jpg", alt: "Professional cleaning service" },
  { src: "/images/nastuh-abootalebi-yWwob8kwOCk-unsplash.jpg", alt: "Clean and tidy home" },
  { src: "/images/toon-lambrechts-0FTI9ceTUOc-unsplash.jpg", alt: "Spotless surfaces" },
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex min-h-screen items-center justify-center" id="hero">
      {HERO_IMAGES.map((img, i) => (
        <div
          key={img.src}
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            i === current ? "opacity-100" : "opacity-0"
          )}
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="100vw"
            priority={i === 0}
            className="object-cover"
          />
        </div>
      ))}
      <div className="absolute inset-0 bg-black/55" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <Badge className="mb-4 rounded-full px-4 py-1.5 text-sm font-semibold">
          Serving Kent &amp; Surrounding Areas
        </Badge>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
          Kent&apos;s Trusted{" "}
          <span style={{ color: "#86efac" }}>Cleaning Experts</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-200">
          Professional domestic, commercial, and specialist cleaning services
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
