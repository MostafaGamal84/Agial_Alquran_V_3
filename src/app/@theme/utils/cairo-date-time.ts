export const CAIRO_TIME_ZONE = 'Africa/Cairo';
export const RIYADH_TIME_ZONE = 'Asia/Riyadh';

type DateInput = Date | string | number | null | undefined;

const DATE_TIME_WITHOUT_ZONE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::(\d{2})(?::(\d{2})(\.\d{1,7})?)?)?)?$/;

const DATE_TIME_WITH_ZONE_PATTERN = /(Z|[+\-]\d{2}:\d{2})$/i;
const SUPPORTED_BUSINESS_TIME_ZONES = new Set([CAIRO_TIME_ZONE, RIYADH_TIME_ZONE]);

function parseBackendUtcDateString(value: string): Date | null {
  const normalizedValue = value.trim();
  if (!normalizedValue || DATE_TIME_WITH_ZONE_PATTERN.test(normalizedValue)) {
    return null;
  }

  const match = DATE_TIME_WITHOUT_ZONE_PATTERN.exec(normalizedValue);
  if (!match) {
    return null;
  }

  const [, year, month, day, hours = '0', minutes = '0', seconds = '0', fraction = ''] = match;
  const milliseconds = fraction ? Math.floor(Number(`0${fraction}`) * 1000) : 0;

  return new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds),
      milliseconds
    )
  );
}

export function getPreferredBusinessTimeZone(): string {
  try {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTimeZone && SUPPORTED_BUSINESS_TIME_ZONES.has(browserTimeZone)) {
      return browserTimeZone;
    }
  } catch {
    // Ignore browser timezone lookup failures and fall back to Cairo.
  }

  return CAIRO_TIME_ZONE;
}

export function parseApiDate(value: DateInput): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  if (typeof value === 'string') {
    const backendUtcDate = parseBackendUtcDateString(value);
    if (backendUtcDate) {
      return backendUtcDate;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatWithTimeZone(
  value: DateInput,
  locale: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string | null {
  const parsed = parseApiDate(value);
  if (!parsed) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone
  }).format(parsed);
}

function getPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value ?? '';
}

export function formatDateInCairo(
  value: DateInput,
  locale = 'ar-EG',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }
): string | null {
  return formatWithTimeZone(value, locale, CAIRO_TIME_ZONE, options);
}

export function formatDateTimeInCairo(
  value: DateInput,
  locale = 'ar-EG',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
): string | null {
  return formatWithTimeZone(value, locale, CAIRO_TIME_ZONE, options);
}

export function formatDateTimeForBusinessUser(
  value: DateInput,
  locale = 'ar-EG',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }
): string | null {
  return formatWithTimeZone(value, locale, getPreferredBusinessTimeZone(), options);
}

export function getCairoDateString(value: DateInput = new Date()): string {
  const parsed = parseApiDate(value) ?? new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(parsed);

  const year = getPart(parts, 'year');
  const month = getPart(parts, 'month');
  const day = getPart(parts, 'day');

  return `${year}-${month}-${day}`;
}
