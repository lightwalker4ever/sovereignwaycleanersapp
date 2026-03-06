import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {/* Brand */}
          <div>
            <span className="text-xl font-800 text-white">
              <span style={{ color: "var(--color-brand)" }}>Sovereign Way</span>{" "}
              Cleaners
            </span>
            <p className="mt-3 text-sm leading-6">
              Kent&apos;s trusted professional cleaning service. Delivering spotless
              results for homes and businesses across the county.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-600 uppercase tracking-wider text-white">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { href: "#services", label: "Services" },
                { href: "#about", label: "About Us" },
                { href: "#gallery", label: "Gallery" },
                { href: "#testimonials", label: "Testimonials" },
                { href: "#contact", label: "Contact" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-600 uppercase tracking-wider text-white">
              Contact
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <a href="tel:+441234567890" className="transition-colors hover:text-white">
                  +44 1234 567 890
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@sovereignwaycleaners.co.uk"
                  className="transition-colors hover:text-white"
                >
                  info@sovereignwaycleaners.co.uk
                </a>
              </li>
              <li>Kent, United Kingdom</li>
              <li className="pt-1 text-gray-400">
                Mon–Fri: 8am–6pm
                <br />
                Sat: 9am–4pm
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-700 pt-6 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} Sovereign Way Cleaners. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
