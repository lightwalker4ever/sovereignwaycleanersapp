import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import SocialSidebar from "@/components/SocialSidebar";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sovereign Way Cleaners — Kent's Trusted Cleaning Experts",
  description:
    "Professional domestic, commercial, end of tenancy, and deep cleaning services across Kent. Fully insured, eco-friendly, and locally based.",
  keywords: [
    "cleaning services Kent",
    "domestic cleaning",
    "commercial cleaning",
    "end of tenancy cleaning",
    "deep cleaning Kent",
  ],
  openGraph: {
    title: "Sovereign Way Cleaners — Kent's Trusted Cleaning Experts",
    description:
      "Professional cleaning services across Kent. Fully insured, eco-friendly, locally based.",
    url: "https://sovereignwaycleaners.co.uk",
    siteName: "Sovereign Way Cleaners",
    locale: "en_GB",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={cn(jakarta.variable)}>
      <body className="antialiased">
        <SocialSidebar />
        {children}
      </body>
    </html>
  );
}
