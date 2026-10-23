import type { ArrivalWindowKey } from "@/lib/quote-state";

const WINDOW_RANGE: Record<ArrivalWindowKey, [string, string]> = {
  morning: ["08:00", "10:00"],
  midday: ["11:00", "13:00"],
  afternoon: ["14:00", "16:00"],
};

function toIcsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function foldIcsLine(line: string): string {
  // RFC 5545: lines over 75 octets should be folded -- our lines never get
  // that long in practice, but escaping commas/semicolons/newlines is required.
  return line.replace(/([,;])/g, "\\$1");
}

/**
 * Builds a minimal .ics (iCalendar) file for step 5's "Add to calendar"
 * download -- a plain string, no library needed. Falls back to a 2-hour
 * block starting at 9am when no specific window was chosen (flexible).
 */
export function buildQuoteIcs(input: {
  reference: string;
  serviceName: string;
  dateIso: string;
  windowKey: ArrivalWindowKey | null;
  postcode: string;
}): string {
  const [startTime, endTime] = input.windowKey ? WINDOW_RANGE[input.windowKey] : ["09:00", "11:00"];
  const start = new Date(`${input.dateIso}T${startTime}:00`);
  const end = new Date(`${input.dateIso}T${endTime}:00`);
  const now = new Date();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sovereign Way Cleaners//Quote//EN",
    "BEGIN:VEVENT",
    `UID:${input.reference}@sovereignwaycleaners.co.uk`,
    `DTSTAMP:${toIcsDate(now)}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${foldIcsLine(`Sovereign Way Cleaners -- ${input.serviceName}`)}`,
    `DESCRIPTION:${foldIcsLine(`Booking request ${input.reference}. We'll confirm the exact time before it's booked.`)}`,
    `LOCATION:${foldIcsLine(input.postcode)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
