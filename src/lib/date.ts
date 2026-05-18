const APP_TIME_ZONE = "Asia/Bangkok";
const BANGKOK_UTC_OFFSET_HOURS = 7;

export function startOfDay(date: Date) {
  const { year, month, day } = getBangkokDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, -BANGKOK_UTC_OFFSET_HOURS, 0, 0, 0));
}

export function formatThaiDate(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatThaiDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: false,
  }).format(new Date(date));
}

export function formatInputDate(date: Date | string) {
  const { year, month: monthValue, day: dayValue } = getBangkokDateParts(date);
  const month = String(monthValue).padStart(2, "0");
  const day = String(dayValue).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDayList(startDate: Date, dueDate: Date) {
  const days: Date[] = [];
  const cursor = startOfDay(startDate);
  const end = startOfDay(dueDate);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function endOfDay(date: Date) {
  return new Date(startOfDay(date).getTime() + 86_400_000 - 1);
}

export function addCalendarDays(date: Date, days: number) {
  const value = startOfDay(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

export function toDateKey(date: Date | string) {
  return formatInputDate(date);
}

function getBangkokDateParts(date: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(date));

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}
