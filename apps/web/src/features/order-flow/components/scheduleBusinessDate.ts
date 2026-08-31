export const CHEFMATE_BUSINESS_TIME_ZONE = "Africa/Johannesburg";

/**
 * Operational lead time: bookings must start at least this many hours from
 * now. Mirrors the backend's LEAD_TIME_HOURS so the local fallback agrees
 * with the server even when the availability API is unreachable.
 */
export const LEAD_TIME_HOURS = 24;

export interface BusinessDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface BusinessDateTimeParts extends BusinessDateParts {
  readonly hour: number;
  readonly minute: number;
}

const johannesburgDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHEFMATE_BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function getJohannesburgBusinessDate(instant = new Date()): BusinessDateParts {
  return toBusinessDate(getJohannesburgBusinessDateTime(instant));
}

export function getJohannesburgBusinessDateTime(instant = new Date()): BusinessDateTimeParts {
  const parts = Object.fromEntries(
    johannesburgDateTimeFormatter
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: requireDatePart(parts.year, "year"),
    month: requireDatePart(parts.month, "month"),
    day: requireDatePart(parts.day, "day"),
    hour: requireDatePart(parts.hour, "hour"),
    minute: requireDatePart(parts.minute, "minute"),
  };
}

export function businessDateToISODate(parts: BusinessDateParts): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

export function businessDateToCalendarDate(parts: BusinessDateParts): Date {
  return new Date(parts.year, parts.month - 1, parts.day);
}

/** Mirrors the API's 24h lead-time rule so slots inside the window are never selectable in the UI. */
export function isBookableJohannesburgTimeSlot(
  date: string,
  time: string,
  instant = new Date(),
): boolean {
  const now = getJohannesburgBusinessDateTime(instant);
  const today = businessDateToISODate(now);
  if (date < today) return false;

  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false;

  const dayDiff = dayDiffFromISODate(date, today);
  const leadMinutes = dayDiff * 24 * 60 + (hour * 60 + minute - (now.hour * 60 + now.minute));
  return leadMinutes >= LEAD_TIME_HOURS * 60;
}

/** Whole days between two yyyy-mm-dd strings (negative if `date` is before `today`). */
function dayDiffFromISODate(date: string, today: string): number {
  const [y1, m1, d1] = date.split("-").map(Number);
  const [y2, m2, d2] = today.split("-").map(Number);
  if (!Number.isInteger(y1) || !Number.isInteger(m1) || !Number.isInteger(d1) ||
      !Number.isInteger(y2) || !Number.isInteger(m2) || !Number.isInteger(d2)) {
    return -1;
  }
  return (
    (Date.UTC(y1 as number, (m1 as number) - 1, d1 as number) -
      Date.UTC(y2 as number, (m2 as number) - 1, d2 as number)) / 86_400_000
  );
}

function toBusinessDate(parts: BusinessDateTimeParts): BusinessDateParts {
  return { year: parts.year, month: parts.month, day: parts.day };
}

function requireDatePart(value: number | undefined, partName: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Intl formatter did not return ${partName} for ${CHEFMATE_BUSINESS_TIME_ZONE}`);
  }
  return value;
}
