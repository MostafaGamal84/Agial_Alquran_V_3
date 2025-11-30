export type ResidencyGroupFilter = 'all' | 'egyptian' | 'arab' | 'foreign';

export interface ResidencyGroupOption {
  value: ResidencyGroupFilter;
  translationKey: string;
}

export const RESIDENCY_GROUP_OPTIONS: readonly ResidencyGroupOption[] = [
  { value: 'all', translationKey: 'كل اماكن الاقامة' },
  { value: 'egyptian', translationKey: 'مصريين' },
  { value: 'arab', translationKey: 'عرب' },
  { value: 'foreign', translationKey: 'اجانب' }
];

export function hasActiveResidencyGroup(
  group: ResidencyGroupFilter | null | undefined
): group is Exclude<ResidencyGroupFilter, 'all'> {
  return Boolean(group && group !== 'all');
}
