export interface AcademicOption {
  id: number;
  name: string;
}

export const ACADEMIC_STAGE_OPTIONS: AcademicOption[] = [
  { id: 1, name: 'إعدادي' },
  { id: 2, name: 'ثانوي' },
  { id: 3, name: 'عام' }
];

export const ACADEMIC_STUDENT_PERFORMANCE_OPTIONS: AcademicOption[] = [
  { id: 1, name: 'ضعيف' },
  { id: 2, name: 'جيد' },
  { id: 3, name: 'جيد جدا' },
  { id: 4, name: 'ممتاز' }
];

export const ACADEMIC_HOMEWORK_STATUS_OPTIONS: AcademicOption[] = [
  { id: 1, name: 'تم عمل الواجب كامل' },
  { id: 2, name: 'تم عمل بعض الواجب' },
  { id: 3, name: 'لم يتم' }
];

export const ACADEMIC_HOMEWORK_SCORE_OPTIONS: AcademicOption[] = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  name: String(index + 1)
}));
