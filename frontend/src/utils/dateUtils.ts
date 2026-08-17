/**
 * India Standard Time (Asia/Kolkata / IST, UTC+05:30) Centralized Formatter Utilities
 * Ensures all user-facing timestamps display strictly in Asia/Kolkata timezone with legal precision.
 */

/**
 * Parses an ISO string or date into a UTC Date object.
 * If given a naive ISO string from SQLite without timezone indicators (e.g. "2026-08-17 14:03:15"),
 * explicitly treats it as UTC by appending 'Z' before creating the Date object.
 */
export function parseToUTCDate(isoDateStr?: string | Date | null): Date | null {
  if (!isoDateStr) return null;
  if (isoDateStr instanceof Date) {
    return isNaN(isoDateStr.getTime()) ? null : isoDateStr;
  }
  
  let str = String(isoDateStr).trim();
  if (!str) return null;

  // If format is "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM:SS" without timezone indicator
  if (str.includes(' ') && !str.includes('T')) {
    str = str.replace(' ', 'T');
  }

  // Check if string has explicit timezone offset (+HH:MM, -HH:MM, or Z)
  const hasTimezone = str.endsWith('Z') || /[+-]\d{2}(:?\d{2})?$/.test(str);
  if (!hasTimezone) {
    str += 'Z';
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Centralized Formatter: Asia/Kolkata (IST) Full Timestamp
 * Example output: "17 Aug 2026, 07:33:15 PM IST"
 */
export function formatISTTimestamp(isoDateStr?: string | Date | null, includeSeconds: boolean = true): string {
  if (!isoDateStr) return 'N/A';
  try {
    const date = parseToUTCDate(isoDateStr);
    if (!date) return String(isoDateStr);

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    if (includeSeconds) {
      options.second = '2-digit';
    }

    const formatted = new Intl.DateTimeFormat('en-IN', options).format(date);
    // Standardize AM/PM casing and append IST suffix
    const withUpperMeridiem = formatted.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
    return `${withUpperMeridiem} IST`;
  } catch {
    return String(isoDateStr);
  }
}

/**
 * Standardized Date-Time Formatter (delegates to formatISTTimestamp)
 */
export function formatISTDateTime(isoDateStr?: string | Date | null, includeSeconds: boolean = true): string {
  return formatISTTimestamp(isoDateStr, includeSeconds);
}

/**
 * Date only formatter in Asia/Kolkata
 * Example output: "17 Aug 2026"
 */
export function formatISTDate(isoDateStr?: string | Date | null): string {
  if (!isoDateStr) return 'N/A';
  try {
    const date = parseToUTCDate(isoDateStr);
    if (!date) return String(isoDateStr);

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch {
    return String(isoDateStr);
  }
}

/**
 * Time only formatter in Asia/Kolkata
 * Example output: "07:33:15 PM IST" or "07:33 PM IST"
 */
export function formatISTTime(isoDateStr?: string | Date | null, includeSeconds: boolean = true): string {
  if (!isoDateStr) return 'N/A';
  try {
    const date = parseToUTCDate(isoDateStr);
    if (!date) return String(isoDateStr);

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    };

    if (includeSeconds) {
      options.second = '2-digit';
    }

    const formatted = new Intl.DateTimeFormat('en-IN', options).format(date);
    const withUpperMeridiem = formatted.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
    return `${withUpperMeridiem} IST`;
  } catch {
    return String(isoDateStr);
  }
}

