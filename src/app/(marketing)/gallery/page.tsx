import type { Metadata } from "next";
import Gallery from "@/components/Gallery";

export const metadata: Metadata = {
  title: "Gallery — Sovereign Way Cleaners",
  description: "See the difference our team makes across homes and businesses in Kent.",
};

export default function GalleryPage() {
  return <Gallery />;
}
