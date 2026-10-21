import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { QuoteWizardLauncher } from "@/components/quote/QuoteWizardLauncher";
import { getContactFormEnabled } from "@/lib/app-settings";

// Every page under this layout is otherwise static (no dynamic APIs
// used), so without this, contactFormEnabled would be fetched once at
// build time and frozen until the next deploy -- an admin toggling it
// off in Settings wouldn't take effect on the live site. A short
// revalidate window keeps pages fast/static while still picking up
// the setting within a minute of being changed.
export const revalidate = 60;

/**
 * Shared chrome for every public marketing page (Home, Services,
 * Gallery, About) -- Header, Footer, and the quote-wizard launcher
 * (mounted once here rather than per-page, so ?quote=... deep links
 * work identically from any of these routes). Dashboard and auth
 * routes each own their own chrome and don't use this group.
 */
export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const contactFormEnabled = await getContactFormEnabled();

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <Suspense fallback={null}>
        <QuoteWizardLauncher contactFormEnabled={contactFormEnabled} />
      </Suspense>
    </>
  );
}
