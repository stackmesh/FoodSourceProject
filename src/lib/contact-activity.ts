export const activityTypes = [
  "EMAIL_SENT",
  "PHONE_CALL",
  "MESSAGE_SENT",
  "SUPPLIER_REPLIED",
  "PRICE_RECEIVED",
  "MEETING",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "FOLLOW_UP_SCHEDULED",
] as const;

export const userActivityTypes = [
  "EMAIL_SENT",
  "PHONE_CALL",
  "MESSAGE_SENT",
  "SUPPLIER_REPLIED",
  "PRICE_RECEIVED",
  "MEETING",
] as const;

export const communicationChannels = ["EMAIL", "PHONE", "MESSAGE", "MEETING", "OTHER"] as const;

export type ActivityType = (typeof activityTypes)[number];
export type UserActivityType = (typeof userActivityTypes)[number];
export type CommunicationChannel = (typeof communicationChannels)[number];

const communicationActivity = new Set<ActivityType>(userActivityTypes);

export function isActivityType(value: string): value is ActivityType {
  return activityTypes.some((type) => type === value);
}

export function isUserActivityType(value: string): value is UserActivityType {
  return userActivityTypes.some((type) => type === value);
}

export function isCommunicationChannel(value: string): value is CommunicationChannel {
  return communicationChannels.some((channel) => channel === value);
}

export function countsAsContact(type: ActivityType) {
  return communicationActivity.has(type);
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!email) return null;
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return undefined;
  return email;
}

export function normalizePhone(value: string) {
  const phone = value.trim();
  if (!phone) return { phone: null, phoneKey: null };
  const phoneKey = phone.replace(/\D/g, "");
  if (phone.length > 40 || phoneKey.length < 5 || phoneKey.length > 15 || !/^[+\d][\d\s()+-]*$/.test(phone)) {
    return undefined;
  }
  return { phone, phoneKey };
}

function zoneParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

export function dateTimeLocalValue(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = read("hour") === "24" ? "00" : read("hour");
  return `${read("year")}-${read("month")}-${read("day")}T${hour}:${read("minute")}`;
}

/** Parse a datetime-local value as wall time in the given time zone. Future times are rejected. */
export function parseZonedDateTime(value: string, timeZone: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return null;
  }

  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let utc = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zoneParts(new Date(utc), timeZone);
    if (!Number.isFinite(parts.year)) return null;
    const observed = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const delta = desired - observed;
    if (delta === 0) break;
    utc += delta;
  }

  const result = new Date(utc);
  const check = zoneParts(result, timeZone);
  if (check.year !== year || check.month !== month || check.day !== day || check.hour !== hour || check.minute !== minute) {
    return null;
  }
  if (result.getTime() > now.getTime() + 5 * 60 * 1000) return null;
  return result;
}
