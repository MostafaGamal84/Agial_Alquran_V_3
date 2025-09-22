export interface TimeSpanDto {
  ticks?: number | null;
  days?: number | null;
  hours?: number | null;
  minutes?: number | null;
  seconds?: number | null;
  milliseconds?: number | null;
  totalDays?: number | null;
  totalHours?: number | null;
  totalMinutes?: number | null;
  totalSeconds?: number | null;
  totalMilliseconds?: number | null;
  [key: string]: unknown;
}

export const TICKS_PER_MILLISECOND = 10_000;
export const TICKS_PER_SECOND = 10_000_000;
export const TICKS_PER_MINUTE = 60 * TICKS_PER_SECOND;

export function timeStringToMinutes(time?: string | null): number | undefined {
  if (!time) {
    return undefined;
  }
  const trimmed = time.trim();
  if (!trimmed) {
    return undefined;
  }

  const [hoursPart, minutesPart] = trimmed.split(':');

  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return undefined;
  }

  return hours * 60 + minutes;
}

export function timeStringToTimeSpan(
  time?: string | null
): TimeSpanDto | undefined {
  const minutes = timeStringToMinutes(time);
  if (minutes === undefined) {
    return undefined;
  }

  const ticks = Math.round(minutes * TICKS_PER_MINUTE);
  if (!Number.isFinite(ticks)) {
    return undefined;
  }

  return { ticks };
}

export function minutesToTimeString(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }

  const totalMinutes = Math.round(value);
  if (!Number.isFinite(totalMinutes)) {
    return '';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${paddedHours}:${paddedMinutes}`;
}

function timeSpanToMinutes(value?: TimeSpanDto | null): number | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value.totalMinutes === 'number') {
    return value.totalMinutes;
  }

  if (typeof value.ticks === 'number') {
    return value.ticks / TICKS_PER_MINUTE;
  }

  if (typeof value.totalSeconds === 'number') {
    return value.totalSeconds / 60;
  }

  if (typeof value.totalMilliseconds === 'number') {
    return value.totalMilliseconds / 60_000;
  }

  const hasHMS =
    'hours' in value || 'minutes' in value || 'seconds' in value || 'milliseconds' in value;
  if (hasHMS) {
    const hours = typeof value.hours === 'number' ? value.hours : 0;
    const minutes = typeof value.minutes === 'number' ? value.minutes : 0;
    const seconds = typeof value.seconds === 'number' ? value.seconds : 0;
    const milliseconds = typeof value.milliseconds === 'number' ? value.milliseconds : 0;

    return hours * 60 + minutes + seconds / 60 + milliseconds / 60_000;
  }

  return undefined;
}

export function formatTimeValue(
  value?: number | string | TimeSpanDto | null
): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'object') {
    const minutes = timeSpanToMinutes(value);
    if (minutes !== undefined) {
      return minutesToTimeString(minutes);
    }

    const labelKeys = ['formatted', 'value', 'display', 'text'];
    for (const key of labelKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string') {
        const trimmedCandidate = candidate.trim();
        if (trimmedCandidate) {
          return trimmedCandidate;
        }
      }
    }

    return '';
  }

  if (typeof value === 'number') {
    return Number.isNaN(value) ? '' : minutesToTimeString(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  const numericValue = Number(trimmed);
  if (!Number.isNaN(numericValue)) {
    return minutesToTimeString(numericValue);
  }

  const segments = trimmed.split(':');
  if (segments.length >= 2) {
    const hours = Number(segments[0]);
    const minutes = Number(segments[1]);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      const paddedHours = hours.toString().padStart(2, '0');
      const paddedMinutes = minutes.toString().padStart(2, '0');
      return `${paddedHours}:${paddedMinutes}`;
    }
  }

  return trimmed;
}

