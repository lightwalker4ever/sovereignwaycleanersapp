import type { Metadata } from "next";
import About from "@/components/About";
import Vision from "@/components/Vision";
import CoreValues from "@/components/CoreValues";

export const metadata: Metadata = {
  title: "About Us — Sovereign Way Cleaners",
  description:
    "Kent's trusted cleaning company — our story, our vision, and the core values that guide every job we take on.",
};

export default function AboutPage() {
  return (
    <>
      <About />
      <Vision />
      <CoreValues />
    </>
  );
}
