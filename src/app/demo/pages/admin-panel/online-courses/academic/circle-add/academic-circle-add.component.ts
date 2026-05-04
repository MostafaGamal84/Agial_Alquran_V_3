import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { FieldErrorComponent } from 'src/app/shared/validation/field-error/field-error.component';
import { ValidationService } from 'src/app/shared/validation/validation.service';
import { AcademicCircleService, CreateAcademicCircleDto, UpdateAcademicCircleDto } from 'src/app/@theme/services/academic-circle.service';
import { AcademicLookupService } from 'src/app/@theme/services/academic-lookup.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { ApiResponse, LookupDto } from 'src/app/@theme/services/lookup.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

function requiredArrayValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    return Array.isArray(value) && value.length > 0 ? null : { required: true };
  };
}

@Component({
  selector: 'app-academic-circle-add',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, NgSelectModule, FieldErrorComponent],
  templateUrl: './academic-circle-add.component.html',
  styleUrl: './academic-circle-add.component.scss'
})
export class AcademicCircleAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private academicLookupService = inject(AcademicLookupService);
  private academicCircleService = inject(AcademicCircleService);
  private auth = inject(AuthenticationService);
  readonly validationService = inject(ValidationService);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    teacherId: [null as number | null, Validators.required],
    managerIds: [([] as number[]), requiredArrayValidator()],
    studentIds: [([] as number[]), requiredArrayValidator()]
  });

  managers: LookupDto[] = [];
  teachers: LookupDto[] = [];
  students: LookupDto[] = [];
  isSaving = false;
  isLoading = false;
  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingStudents = false;
  mode: 'add' | 'edit' = 'add';
  circleId: number | null = null;
  readonly role = this.auth.getRole();
  readonly isManagerRole = this.role === UserTypesEnum.Manager;
  readonly loadingLookupText = 'جارٍ التحميل...';

  get isLookupLoading(): boolean {
    return this.isLoadingManagers || this.isLoadingTeachers || this.isLoadingStudents;
  }

  get managerNotFoundText(): string {
    return this.isLoadingManagers ? this.loadingLookupText : 'لا يوجد مشرفون مفعّلون على مدرسة المواد';
  }

  get teacherNotFoundText(): string {
    return this.isLoadingTeachers ? this.loadingLookupText : 'لا يوجد معلمون مفعّلون على مدرسة المواد';
  }

  get studentNotFoundText(): string {
    return this.isLoadingStudents ? this.loadingLookupText : 'لا يوجد طلاب مفعّلون على مدرسة المواد';
  }

  get hasLookupData(): boolean {
    return this.teachers.length > 0 || this.students.length > 0 || this.managers.length > 0;
  }

  ngOnInit(): void {
    this.mode = this.route.snapshot.data?.['mode'] === 'edit' ? 'edit' : 'add';
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    this.circleId = Number.isFinite(rawId) && rawId > 0 ? rawId : null;

    this.loadLookups();
    if (this.isManagerRole) {
      this.form.get('managerIds')?.clearValidators();
      this.form.get('managerIds')?.updateValueAndValidity({ emitEvent: false });
    }

    if (this.mode === 'edit' && this.circleId) {
      this.loadCircle(this.circleId);
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
    const payload: CreateAcademicCircleDto = {
      name: formValue.name?.trim(),
      teacherId: formValue.teacherId,
      managerIds: this.isManagerRole ? [] : formValue.managerIds ?? [],
      studentIds: formValue.studentIds ?? []
    };

    this.isSaving = true;
    const request$ =
      this.mode === 'edit' && this.circleId
        ? this.academicCircleService.update({ ...(payload as UpdateAcademicCircleDto), id: this.circleId })
        : this.academicCircleService.create(payload);

    request$.subscribe({
      next: (response) => {
        this.isSaving = false;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error(this.mode === 'edit' ? 'تعذر تحديث الحلقة الدراسية' : 'تعذر إضافة الحلقة الدراسية');
          }
          return;
        }

        this.toast.success(response.message || (this.mode === 'edit' ? 'تم تحديث الحلقة الدراسية بنجاح' : 'تمت إضافة الحلقة الدراسية بنجاح'));
        this.router.navigate(['/online-course/academic/circles']);
      },
      error: () => {
        this.isSaving = false;
        this.toast.error(this.mode === 'edit' ? 'تعذر تحديث الحلقة الدراسية' : 'تعذر إضافة الحلقة الدراسية');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/online-course/academic/circles']);
  }

  private loadLookups(): void {
    this.isLoadingManagers = true;
    this.academicLookupService.getManagers().subscribe({
      next: (response) => {
        this.isLoadingManagers = false;
        this.managers = this.resolveLookupItems(response, 'تعذر تحميل المشرفين');
        if (this.isManagerRole && this.managers.length === 1) {
          this.form.patchValue({ managerIds: [this.managers[0].id] }, { emitEvent: false });
        }
      },
      error: () => {
        this.isLoadingManagers = false;
        this.managers = [];
        this.toast.error('تعذر تحميل المشرفين');
      }
    });

    this.isLoadingTeachers = true;
    this.academicLookupService.getTeachersForAssignment().subscribe({
      next: (response) => {
        this.isLoadingTeachers = false;
        this.teachers = this.resolveLookupItems(response, 'تعذر تحميل المعلمين');
      },
      error: () => {
        this.isLoadingTeachers = false;
        this.teachers = [];
        this.toast.error('تعذر تحميل المعلمين');
      }
    });

    this.isLoadingStudents = true;
    this.academicLookupService.getStudentsForAssignment().subscribe({
      next: (response) => {
        this.isLoadingStudents = false;
        this.students = this.resolveLookupItems(response, 'تعذر تحميل الطلاب');
      },
      error: () => {
        this.isLoadingStudents = false;
        this.students = [];
        this.toast.error('تعذر تحميل الطلاب');
      }
    });
  }

  private loadCircle(id: number): void {
    this.isLoading = true;
    this.academicCircleService.get(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (!response.isSuccess || !response.data) {
          this.toast.error('تعذر تحميل بيانات الحلقة الدراسية');
          return;
        }

        this.form.patchValue({
          name: response.data.name ?? '',
          teacherId: response.data.teacherId ?? null,
          managerIds: response.data.managerIds ?? [],
          studentIds: response.data.studentIds ?? []
        });
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('تعذر تحميل بيانات الحلقة الدراسية');
      }
    });
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
}
