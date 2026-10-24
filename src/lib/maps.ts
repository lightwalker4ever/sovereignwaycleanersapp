/**
 * A plain "open in Google Maps" link -- no API key, no billing account,
 * no setup. Opens the native Maps app on mobile (or whatever the OS's
 * default maps handler is) and Google Maps web on desktop.
 */
export function googleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
