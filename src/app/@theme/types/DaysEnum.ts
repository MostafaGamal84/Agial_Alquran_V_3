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
