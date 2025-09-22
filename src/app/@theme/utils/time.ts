export function timeStringToMinutes(time?: string | null): number | undefined {
  if (!time) {
    return undefined;
  }
  const [hoursPart, minutesPart] = time.split(':');
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
