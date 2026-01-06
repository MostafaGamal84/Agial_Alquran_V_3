export enum DaysEnum {
  السبت = 1,
  الاحد = 2,
  الاثنين = 3,
  الثلاثاء = 4,
  الاربعاء = 5,
  الخميس = 6,
  الجمعة = 7
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
  { label: 'السبت', value: DaysEnum.السبت },
  { label: 'الاحد', value: DaysEnum.الاحد },
  { label: 'الاثنين', value: DaysEnum.الاثنين },
  { label: 'الثلاثاء', value: DaysEnum.الثلاثاء },
  { label: 'الاربعاء', value: DaysEnum.الاربعاء },
  { label: 'الخميس', value: DaysEnum.الخميس },
  { label: 'الجمعة', value: DaysEnum.الجمعة }
];

export const DAY_LABELS = new Map<DaysEnum, string>(
  DAY_OPTIONS.map((option) => [option.value, option.label])
);

const EN_DAY_LOOKUP: Record<string, DaysEnum> = {
  saturday: DaysEnum.السبت,
  sunday: DaysEnum.الاحد,
  monday: DaysEnum.الاثنين,
  tuesday: DaysEnum.الثلاثاء,
  wednesday: DaysEnum.الاربعاء,
  thursday: DaysEnum.الخميس,
  friday: DaysEnum.الجمعة
};

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

  const englishMatch = EN_DAY_LOOKUP[trimmed.toLowerCase()];
  if (englishMatch) {
    return englishMatch;
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
