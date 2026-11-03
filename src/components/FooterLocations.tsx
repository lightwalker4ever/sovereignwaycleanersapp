import { ExternalLink } from "lucide-react";
import {
  BUSINESS_LOCATIONS,
  getLocationEmbedUrl,
  getLocationMapsUrl,
} from "@/lib/business-locations";

export function FooterLocations() {
  return (
    <div className="mt-12 border-t border-gray-700 pt-10">
      <h3 className="text-sm font-600 uppercase tracking-wider text-white">
        {BUSINESS_LOCATIONS.length > 1 ? "Our Locations" : "Find Us"}
      </h3>
      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {BUSINESS_LOCATIONS.map((location) => (
          <div key={location.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <iframe
              src={getLocationEmbedUrl(location)}
              width="100%"
              height="220"
              style={{ border: 0, display: "block" }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing our ${location.label} location`}
            />
            <div className="px-4 py-4 text-sm leading-6 text-gray-600">
              {BUSINESS_LOCATIONS.length > 1 && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {location.label}
                </p>
              )}
              {location.addressLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              <a
                href={getLocationMapsUrl(location)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:underline"
                style={{ color: "var(--color-brand)" }}
              >
                Get directions <ExternalLink size={12} />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
