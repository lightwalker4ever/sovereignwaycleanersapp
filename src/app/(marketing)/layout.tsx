import Header from "@/components/Header";
import Footer from "@/components/Footer";

// /contact reads getContactFormEnabled() -- without this, that fetch
// would happen once at build time and freeze until the next deploy, so
// toggling the contact form off in Settings wouldn't take effect on the
// live site. A short revalidate window keeps pages fast/static while
// still picking up the setting within a minute of being changed.
export const revalidate = 60;

/**
 * Shared chrome for every public marketing page (Home, Services,
 * Gallery, About, Contact) -- just Header and Footer. The quote journey
 * lives at its own /quote route with its own chrome
 * (src/app/quote/layout.tsx), not mounted here as a modal anymore.
 */
export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
