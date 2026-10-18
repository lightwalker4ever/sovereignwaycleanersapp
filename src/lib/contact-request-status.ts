export const CONTACT_REQUEST_STATUSES = ["new", "contacted", "closed"] as const;
export type ContactRequestStatus = (typeof CONTACT_REQUEST_STATUSES)[number];
