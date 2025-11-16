export type ResidencyGroupFilter = 'all' | 'egyptian' | 'arab' | 'foreign';

export interface ResidencyGroupOption {
  value: ResidencyGroupFilter;
  translationKey: string;
}

export const RESIDENCY_GROUP_OPTIONS: readonly ResidencyGroupOption[] = [
  { value: 'all', translationKey: 'All Residencies' },
  { value: 'egyptian', translationKey: 'Egyptians' },
  { value: 'arab', translationKey: 'Arabs' },
  { value: 'foreign', translationKey: 'Foreigners' }
];

export function hasActiveResidencyGroup(
  group: ResidencyGroupFilter | null | undefined
): group is Exclude<ResidencyGroupFilter, 'all'> {
  return Boolean(group && group !== 'all');
}
