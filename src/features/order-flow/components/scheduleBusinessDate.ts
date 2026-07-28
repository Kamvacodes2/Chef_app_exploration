export const CHEFMATE_BUSINESS_TIME_ZONE = "Africa/Johannesburg";

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

/** Mirrors the API's same-day rule so stale times are never selectable in the UI. */
export function isBookableJohannesburgTimeSlot(date: string, time: string, instant = new Date()): boolean {
  const now = getJohannesburgBusinessDateTime(instant);
  const today = businessDateToISODate(now);
  if (date < today) return false;
  if (date > today) return true;

  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false;
  return hour * 60 + minute > now.hour * 60 + now.minute;
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