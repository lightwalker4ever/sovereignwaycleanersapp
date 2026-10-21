import type { Metadata } from "next";
import Services from "@/components/Services";

export const metadata: Metadata = {
  title: "Our Cleaning Services — Sovereign Way Cleaners",
  description:
    "Domestic, commercial, end of tenancy, deep, carpet, after-build and office cleaning across Kent. Fully insured, eco-friendly, locally based.",
};

export default function ServicesPage() {
  return <Services />;
}
