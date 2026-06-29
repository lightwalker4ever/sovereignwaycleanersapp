import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Vision from "@/components/Vision";
import CoreValues from "@/components/CoreValues";
import Gallery from "@/components/Gallery";
import Testimonials from "@/components/Testimonials";
import Affiliations from "@/components/Affiliations";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
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
        <Testimonials />
        <Affiliations />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
