import { EducationSystemTypeEnum } from '../types/EducationSystemTypeEnum';

export interface EducationSystemSelection {
  includeQuran: boolean;
  includeAcademic: boolean;
}

export function computeEducationSystemTypeId(
  includeQuran: boolean,
  includeAcademic: boolean
): EducationSystemTypeEnum | null {
  if (includeQuran && includeAcademic) {
    return EducationSystemTypeEnum.Both;
  }

  if (includeQuran) {
    return EducationSystemTypeEnum.QuranSchool;
  }

  if (includeAcademic) {
    return EducationSystemTypeEnum.AcademicSchool;
  }

  return null;
}

export function parseEducationSystemTypeSelection(
  value: number | null | undefined
): EducationSystemSelection {
  switch (Number(value)) {
    case EducationSystemTypeEnum.Both:
      return { includeQuran: true, includeAcademic: true };
    case EducationSystemTypeEnum.AcademicSchool:
      return { includeQuran: false, includeAcademic: true };
    case EducationSystemTypeEnum.QuranSchool:
    default:
      return { includeQuran: true, includeAcademic: false };
  }
}
