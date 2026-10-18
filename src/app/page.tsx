import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Vision from "@/components/Vision";
import CoreValues from "@/components/CoreValues";
import Gallery from "@/components/Gallery";
import TrustedBy from "@/components/TrustedBy";
import Affiliations from "@/components/Affiliations";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getContactFormEnabled } from "@/lib/app-settings";

export default async function Home() {
  const contactFormEnabled = await getContactFormEnabled();

  return (
    <>
      <Header />
      <main>
        <Hero />
        <Services />
        <About />
        <Vision />
        <CoreValues />
        <Gallery />
        <TrustedBy />
        <Affiliations />
        <Contact contactFormEnabled={contactFormEnabled} />
      </main>
      <Footer />
    </>
  );
}
