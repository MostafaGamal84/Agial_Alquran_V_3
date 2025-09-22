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

export function minutesToTimeString(value?: number | null): string {
  if (value === null || value === undefined) {
    return '';
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return `${paddedHours}:${paddedMinutes}`;
}

export function formatTimeValue(value?: number | string | null): string {
  if (value === null || value === undefined) {
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

