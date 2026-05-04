import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { FieldErrorComponent } from 'src/app/shared/validation/field-error/field-error.component';
import { ValidationService } from 'src/app/shared/validation/validation.service';
import { AcademicLookupService } from 'src/app/@theme/services/academic-lookup.service';
import { AcademicCircleDto, AcademicCircleService } from 'src/app/@theme/services/academic-circle.service';
import { AcademicReportAddDto, AcademicReportService } from 'src/app/@theme/services/academic-report.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiResponse, LookupDto } from 'src/app/@theme/services/lookup.service';
import {
  ACADEMIC_HOMEWORK_SCORE_OPTIONS,
  ACADEMIC_HOMEWORK_STATUS_OPTIONS,
  ACADEMIC_STAGE_OPTIONS,
  ACADEMIC_STUDENT_PERFORMANCE_OPTIONS
} from 'src/app/@theme/types/academic-report-options';

@Component({
  selector: 'app-academic-report-add',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, NgSelectModule, FieldErrorComponent],
  templateUrl: './academic-report-add.component.html',
  styleUrl: './academic-report-add.component.scss'
})
export class AcademicReportAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private academicLookupService = inject(AcademicLookupService);
  private academicCircleService = inject(AcademicCircleService);
  private academicReportService = inject(AcademicReportService);
  readonly validationService = inject(ValidationService);

  readonly form = this.fb.group({
    academicCircleId: [null as number | null, Validators.required],
    teacherId: [null as number | null, Validators.required],
    studentId: [null as number | null, Validators.required],
    subjectId: [null as number | null, Validators.required],
    reportDate: [null as Date | null, Validators.required],
    stageId: [null as number | null, Validators.required],
    lessonTitle: ['', Validators.required],
    studentPerformanceId: [null as number | null, Validators.required],
    previousHomeworkStatusId: [null as number | null, Validators.required],
    homeworkScore: [null as number | null, Validators.required],
    nextHomework: ['', Validators.required],
    teacherNotes: [''],
    sessionDurationMinutes: [null as number | null, [Validators.required, Validators.min(1)]]
  });

  circles: AcademicCircleDto[] = [];
  subjects: LookupDto[] = [];
  students: LookupDto[] = [];
  stageOptions = ACADEMIC_STAGE_OPTIONS;
  performanceOptions = ACADEMIC_STUDENT_PERFORMANCE_OPTIONS;
  homeworkStatusOptions = ACADEMIC_HOMEWORK_STATUS_OPTIONS;
  homeworkScoreOptions = ACADEMIC_HOMEWORK_SCORE_OPTIONS;

  selectedTeacherName = '';
  isSaving = false;
  isLoading = false;
  isLoadingCircles = false;
  isLoadingSubjects = false;
  isLoadingStudents = false;
  mode: 'add' | 'edit' = 'add';
  reportId: number | null = null;
  currentCircle: AcademicCircleDto | null = null;
  readonly loadingLookupText = 'جارٍ التحميل...';

  get isLookupLoading(): boolean {
    return this.isLoadingCircles || this.isLoadingSubjects || this.isLoadingStudents;
  }

  get circlesNotFoundText(): string {
    return this.isLoadingCircles ? this.loadingLookupText : 'لا توجد حلقات دراسية متاحة';
  }

  get studentsNotFoundText(): string {
    return this.isLoadingStudents ? this.loadingLookupText : 'لا يوجد طلاب مرتبطون بهذه الحلقة';
  }

  get subjectsNotFoundText(): string {
    return this.isLoadingSubjects ? this.loadingLookupText : 'لا توجد مواد دراسية متاحة';
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data?.['mode'] === 'edit' ? 'edit' : 'add';
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    this.reportId = Number.isFinite(rawId) && rawId > 0 ? rawId : null;

    this.form.patchValue({ reportDate: new Date() }, { emitEvent: false });
    this.loadLookups();

    this.form.get('academicCircleId')?.valueChanges.subscribe((circleId) => {
      const normalizedCircleId = this.normalizeId(circleId);
      if (normalizedCircleId) {
        this.handleCircleSelection(normalizedCircleId);
        return;
      }

      this.currentCircle = null;
      this.selectedTeacherName = '';
      this.isLoadingStudents = false;
      this.students = [];
      this.form.patchValue({ teacherId: null, studentId: null }, { emitEvent: false });
    });

    if (this.mode === 'edit' && this.reportId) {
      this.loadReport(this.reportId);
    }
  }

  submit(): void {
    if (this.isSaving) {
      return;
    }

    if (this.form.invalid) {
      this.validationService.markAllAsTouched(this.form);
      return;
    }

    const formValue = this.form.getRawValue();
    const payload: AcademicReportAddDto = {
      id: this.reportId,
      academicCircleId: formValue.academicCircleId,
      teacherId: formValue.teacherId,
      studentId: formValue.studentId,
      subjectId: formValue.subjectId,
      reportDate: this.toApiDate(formValue.reportDate) || '',
      stageId: formValue.stageId,
      lessonTitle: formValue.lessonTitle?.trim(),
      studentPerformanceId: formValue.studentPerformanceId,
      previousHomeworkStatusId: formValue.previousHomeworkStatusId,
      homeworkScore: formValue.homeworkScore,
      nextHomework: formValue.nextHomework?.trim(),
      teacherNotes: formValue.teacherNotes?.trim(),
      sessionDurationMinutes: formValue.sessionDurationMinutes
    };

    this.isSaving = true;
    const request$ = this.mode === 'edit' ? this.academicReportService.update(payload) : this.academicReportService.create(payload);
    request$.subscribe({
      next: (response) => {
        this.isSaving = false;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error(this.mode === 'edit' ? 'تعذر تحديث التقرير' : 'تعذر إضافة التقرير');
          }
          return;
        }

        this.toast.success(response.message || (this.mode === 'edit' ? 'تم تحديث التقرير بنجاح' : 'تمت إضافة التقرير بنجاح'));
        this.router.navigate(['/online-course/academic/reports']);
      },
      error: () => {
        this.isSaving = false;
        this.toast.error(this.mode === 'edit' ? 'تعذر تحديث التقرير' : 'تعذر إضافة التقرير');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/online-course/academic/reports']);
  }

  getControl(name: string): AbstractControl | null {
    return this.form.get(name);
  }

  private loadLookups(): void {
    this.isLoadingCircles = true;
    this.academicCircleService.getAll({ skipCount: 0, maxResultCount: 1000 }).subscribe({
      next: (response) => {
        this.isLoadingCircles = false;
        if (response.isSuccess) {
          this.circles = response.data?.items ?? [];
          const selectedCircleId = this.normalizeId(this.form.get('academicCircleId')?.value);
          if (selectedCircleId && !this.selectedTeacherName) {
            this.handleCircleSelection(
              selectedCircleId,
              this.normalizeId(this.form.get('studentId')?.value),
              this.normalizeId(this.form.get('teacherId')?.value)
            );
          }
          return;
        }

        this.circles = [];
        this.toast.error(this.getResponseMessage(response, 'تعذر تحميل الحلقات الدراسية'));
      },
      error: () => {
        this.isLoadingCircles = false;
        this.circles = [];
        this.toast.error('تعذر تحميل الحلقات الدراسية');
      }
    });

    this.isLoadingSubjects = true;
    this.academicLookupService.getSubjects().subscribe({
      next: (response) => {
        this.isLoadingSubjects = false;
        this.subjects = this.resolveLookupItems(response, 'تعذر تحميل المواد الدراسية');
      },
      error: () => {
        this.isLoadingSubjects = false;
        this.subjects = [];
        this.toast.error('تعذر تحميل المواد الدراسية');
      }
    });
  }

  private loadReport(id: number): void {
    this.isLoading = true;
    this.academicReportService.get(id).subscribe({
      next: (response) => {
        if (!response.isSuccess || !response.data) {
          this.isLoading = false;
          this.toast.error('تعذر تحميل بيانات التقرير');
          return;
        }

        const report = response.data;
        this.form.patchValue({
          academicCircleId: report.academicCircleId ?? null,
          teacherId: report.teacherId ?? null,
          studentId: report.studentId ?? null,
          subjectId: report.subjectId ?? null,
          reportDate: this.parseDateValue(report.reportDate),
          stageId: report.stageId ?? null,
          lessonTitle: report.lessonTitle ?? '',
          studentPerformanceId: report.studentPerformanceId ?? null,
          previousHomeworkStatusId: report.previousHomeworkStatusId ?? null,
          homeworkScore: report.homeworkScore ?? null,
          nextHomework: report.nextHomework ?? '',
          teacherNotes: report.teacherNotes ?? '',
          sessionDurationMinutes: report.sessionDurationMinutes ?? null
        });

        this.selectedTeacherName = report.teacherName ?? '';
        if (report.academicCircleId) {
          this.handleCircleSelection(report.academicCircleId, report.studentId ?? null, report.teacherId ?? null);
        } else {
          this.isLoading = false;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('تعذر تحميل بيانات التقرير');
      }
    });
  }

  private handleCircleSelection(circleId: number, keepStudentId?: number | null, overrideTeacherId?: number | null): void {
    const selectedCircle = this.circles.find((circle) => circle.id === circleId) ?? null;

    if (selectedCircle) {
      this.currentCircle = selectedCircle;
      const teacherId = overrideTeacherId ?? selectedCircle.teacherId ?? null;
      this.selectedTeacherName = selectedCircle.teacherName?.trim() ?? '';
      this.form.patchValue(
        {
          teacherId,
          studentId: keepStudentId ?? null
        },
        { emitEvent: false }
      );
      this.loadStudentsForCircle(circleId, keepStudentId ?? null);

      if (teacherId || this.selectedTeacherName) {
        return;
      }
    }

    this.loadCircleDetails(circleId, keepStudentId, overrideTeacherId);
  }

  private loadCircleDetails(circleId: number, keepStudentId?: number | null, overrideTeacherId?: number | null): void {
    this.academicCircleService.get(circleId).subscribe({
      next: (response) => {
        if (!response.isSuccess || !response.data) {
          this.toast.error('تعذر تحميل بيانات الحلقة');
          return;
        }

        this.currentCircle = response.data;
        const teacherId = overrideTeacherId ?? response.data.teacherId ?? null;
        this.selectedTeacherName = response.data.teacherName ?? '';
        this.form.patchValue(
          {
            teacherId,
            studentId: keepStudentId ?? null
          },
          { emitEvent: false }
        );
        this.loadStudentsForCircle(circleId, keepStudentId ?? null);
      },
      error: () => {
        this.toast.error('تعذر تحميل بيانات الحلقة');
      }
    });
  }

  private loadStudentsForCircle(circleId: number, keepStudentId?: number | null): void {
    this.isLoadingStudents = true;
    this.academicLookupService.getStudents(circleId).subscribe({
      next: (response) => {
        this.isLoadingStudents = false;
        this.students = this.resolveLookupItems(response, 'تعذر تحميل طلاب الحلقة');
        if (keepStudentId && this.students.some((student) => student.id === keepStudentId)) {
          this.form.patchValue({ studentId: keepStudentId }, { emitEvent: false });
        } else {
          this.form.patchValue({ studentId: null }, { emitEvent: false });
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoadingStudents = false;
        this.isLoading = false;
        this.toast.error('تعذر تحميل طلاب الحلقة');
      }
    });
  }

  private parseDateValue(value: string | Date | null | undefined): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toApiDate(value: Date | null): string | null {
    if (!value) {
      return null;
    }

    return formatDate(value, 'yyyy-MM-dd', 'en-US');
  }

  private resolveLookupItems(response: ApiResponse<LookupDto[]>, fallbackMessage: string): LookupDto[] {
    if (response.isSuccess) {
      return response.data ?? [];
    }

    this.toast.error(this.getResponseMessage(response, fallbackMessage));
    return [];
  }

  private getResponseMessage(response: Pick<ApiResponse<unknown>, 'errors' | 'message'>, fallbackMessage: string): string {
    return response.errors?.find((error) => !!error.message)?.message || response.message || fallbackMessage;
  }

  private normalizeId(value: unknown): number | null {
    const normalizedValue = Number(value);
    return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : null;
  }
}
