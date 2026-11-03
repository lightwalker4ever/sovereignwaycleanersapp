export interface BusinessLocation {
  id: string;
  /** Shown as a label once there's more than one location; otherwise unused in the UI. */
  label: string;
  addressLines: string[];
}

export const BUSINESS_LOCATIONS: BusinessLocation[] = [
  {
    id: "tonbridge",
    label: "Tonbridge",
    addressLines: ["Azure Court", "Sovereign Way", "Tonbridge", "TN9 1FQ"],
  },
];

function addressQuery(location: BusinessLocation): string {
  return encodeURIComponent(location.addressLines.join(", "));
}

/**
 * Google's free "Embed a map" iframe URL -- no API key or billing needed,
 * unlike the Maps JavaScript/Static APIs. Google's own embed UI already
 * includes a "Maps" link that opens the location in Google Maps.
 */
export function getLocationEmbedUrl(location: BusinessLocation): string {
  return `https://www.google.com/maps?q=${addressQuery(location)}&output=embed`;
}

/** Deep link to Google Maps for an explicit "Get directions" CTA. */
export function getLocationMapsUrl(location: BusinessLocation): string {
  return `https://www.google.com/maps/search/?api=1&query=${addressQuery(location)}`;
}
