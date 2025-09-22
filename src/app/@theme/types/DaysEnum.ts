export enum DaysEnum {
  Saturday = 1,
  Sunday = 2,
  Monday = 3,
  Tuesday = 4,
  Wednesday = 5,
  Thursday = 6,
  Friday = 7
}

export interface DayOption {
  label: string;
  value: DaysEnum;
}

export interface DayDto {
  id?: number | string | null;
  value?: number | string | null;
  day?: number | string | null;
  key?: number | string | null;
  name?: string | null;
  displayName?: string | null;
  label?: string | null;
  dayName?: string | null;
  [key: string]: unknown;
}

export type DayValue = DaysEnum | number | string | DayDto | null | undefined;

export const DAY_OPTIONS: DayOption[] = [
  { label: 'Saturday', value: DaysEnum.Saturday },
  { label: 'Sunday', value: DaysEnum.Sunday },
  { label: 'Monday', value: DaysEnum.Monday },
  { label: 'Tuesday', value: DaysEnum.Tuesday },
  { label: 'Wednesday', value: DaysEnum.Wednesday },
  { label: 'Thursday', value: DaysEnum.Thursday },
  { label: 'Friday', value: DaysEnum.Friday }
];

export const DAY_LABELS = new Map<DaysEnum, string>(
  DAY_OPTIONS.map((option) => [option.value, option.label])
);

export function coerceDayValue(value: DayValue): DaysEnum | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'object') {
    const numericKeys: (keyof DayDto)[] = ['value', 'id', 'day', 'key'];
    for (const key of numericKeys) {
      const candidate = value[key];
      if (typeof candidate === 'number' || typeof candidate === 'string') {
        const resolved = coerceDayValue(candidate);
        if (resolved !== undefined) {
          return resolved;
        }
      }
    }

    const labelKeys: (keyof DayDto)[] = ['label', 'name', 'displayName', 'dayName'];
    for (const key of labelKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string') {
        const resolved = coerceDayValue(candidate);
        if (resolved !== undefined) {
          return resolved;
        }
      }
    }

    return undefined;
  }

  if (typeof value === 'number') {
    return DAY_LABELS.has(value as DaysEnum) ? (value as DaysEnum) : undefined;
  }

  const trimmed = `${value}`.trim();
  if (!trimmed) {
    return undefined;
  }

  const numericValue = Number(trimmed);
  if (!Number.isNaN(numericValue) && DAY_LABELS.has(numericValue as DaysEnum)) {
    return numericValue as DaysEnum;
  }

  const matchedOption = DAY_OPTIONS.find(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase()
  );

  return matchedOption?.value;
}

export function formatDayValue(value?: DayValue): string {
  if (typeof value === 'object' && value !== null) {
    const labelKeys: (keyof DayDto)[] = ['label', 'name', 'displayName', 'dayName'];
    for (const key of labelKeys) {
      const candidate = value[key];
      if (typeof candidate === 'string') {
        const trimmedCandidate = candidate.trim();
        if (trimmedCandidate) {
          return trimmedCandidate;
        }
      }
    }

    const coerced = coerceDayValue(value);
    if (coerced !== undefined) {
      return DAY_LABELS.get(coerced) ?? '';
    }

    return '';
  }

  const coerced = coerceDayValue(value ?? undefined);
  if (coerced !== undefined) {
    return DAY_LABELS.get(coerced) ?? '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

