import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Sovereign Way Cleaners",
  description: "How Sovereign Way Cleaners collects, uses and protects your personal data.",
};

const sections = [
  {
    title: "1. Who We Are",
    content: `Sovereign Way Cleaners is a professional cleaning company based in Kent, United Kingdom. We are the data controller responsible for your personal information collected through this website.

You can contact us at:
Email: info@sovereignwaycleaners.co.uk
Phone: 01732 711856 / 07445 109813`,
  },
  {
    title: "2. What Data We Collect",
    content: `When you submit a quote request via our contact form, we collect the following personal data:

- Full name
- Email address
- Phone number (optional)
- The service you are enquiring about
- The message or description you provide

We do not collect any special category data (e.g. health, financial, or biometric data).`,
  },
  {
    title: "3. Why We Collect It",
    content: `We collect your personal data solely to respond to your enquiry and provide you with a quote for our cleaning services. We do not use your data for marketing purposes without your explicit consent, and we do not sell your data to any third party.`,
  },
  {
    title: "4. Legal Basis for Processing",
    content: `Under the UK General Data Protection Regulation (UK GDPR), we process your data on the following legal bases:

- Legitimate interest: to respond to your enquiry and provide the service you have requested.
- Pre-contractual steps: processing is necessary to take steps at your request prior to entering into a contract.`,
  },
  {
    title: "5. Who We Share Your Data With",
    content: `Your data is processed by Resend (resend.com), our email delivery provider, solely for the purpose of sending your enquiry to us and delivering your confirmation email. Resend acts as a data processor on our behalf and is contractually obligated to protect your data in accordance with UK GDPR.

We do not share your data with any other third parties.`,
  },
  {
    title: "6. How Long We Keep Your Data",
    content: `We retain your personal data for a maximum of 12 months from the date of your enquiry, after which it is deleted. If you become a customer, we may retain relevant information for the duration of our business relationship and for up to 6 years thereafter for legal and accounting purposes.`,
  },
  {
    title: "7. Cookies",
    content: `This website does not use tracking, analytics, or marketing cookies. We may use strictly necessary functional cookies required for the website to operate correctly. These cookies do not identify you personally and do not require your consent under UK GDPR.`,
  },
  {
    title: "8. Your Rights",
    content: `Under UK GDPR, you have the following rights regarding your personal data:

- Right of access: you can request a copy of the personal data we hold about you.
- Right to rectification: you can ask us to correct inaccurate or incomplete data.
- Right to erasure: you can ask us to delete your personal data.
- Right to restrict processing: you can ask us to limit how we use your data.
- Right to object: you can object to our processing of your data.
- Right to data portability: you can request your data in a structured, machine-readable format.

To exercise any of these rights, please contact us at info@sovereignwaycleaners.co.uk. We will respond within 30 days.`,
  },
  {
    title: "9. How We Protect Your Data",
    content: `We take reasonable technical and organisational measures to protect your personal data against unauthorised access, loss, or misuse. All data is transmitted over HTTPS (encrypted connections).`,
  },
  {
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. Any changes will be published on this page with an updated effective date. We encourage you to review this page periodically.`,
  },
  {
    title: "11. Complaints",
    content: `If you are unhappy with how we handle your personal data, you have the right to lodge a complaint with the UK's data protection authority:

Information Commissioner's Office (ICO)
Website: ico.org.uk
Phone: 0303 123 1113`,
  },
];

export default function PrivacyPolicy() {
  return (
    <main className="bg-white min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-24 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm font-medium transition-colors hover:underline"
            style={{ color: "var(--color-brand)" }}
          >
            &larr; Back to Home
          </Link>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            Effective date: 22 June 2026 &nbsp;·&nbsp; Sovereign Way Cleaners, Kent, United Kingdom
          </p>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Your privacy matters to us. This policy explains what personal data we collect, how we
            use it, and your rights under the UK General Data Protection Regulation (UK GDPR).
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(({ title, content }) => (
            <section key={title}>
              <h2
                className="text-lg font-bold text-gray-900 mb-3"
              >
                {title}
              </h2>
              <div className="text-sm leading-7 text-gray-600 whitespace-pre-line">
                {content}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
