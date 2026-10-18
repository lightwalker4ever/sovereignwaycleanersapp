export const BOOKING_STATUSES = ["pending", "converted", "declined"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
