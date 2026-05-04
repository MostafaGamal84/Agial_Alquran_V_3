import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/demo/shared/shared.module';
import { FieldErrorComponent } from 'src/app/shared/validation/field-error/field-error.component';
import { ValidationService } from 'src/app/shared/validation/validation.service';
import { AcademicSubjectService, CreateAcademicSubjectDto, UpdateAcademicSubjectDto } from 'src/app/@theme/services/academic-subject.service';
import { ToastService } from 'src/app/@theme/services/toast.service';

@Component({
  selector: 'app-academic-subject-add',
  standalone: true,
  imports: [CommonModule, SharedModule, RouterModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './academic-subject-add.component.html',
  styleUrl: './academic-subject-add.component.scss'
})
export class AcademicSubjectAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);
  private academicSubjectService = inject(AcademicSubjectService);
  readonly validationService = inject(ValidationService);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    displayOrder: [null as number | null]
  });

  isSaving = false;
  isLoading = false;
  mode: 'add' | 'edit' = 'add';
  subjectId: number | null = null;
  reportsCount = 0;

  ngOnInit(): void {
    this.mode = this.route.snapshot.data?.['mode'] === 'edit' ? 'edit' : 'add';
    const rawId = Number(this.route.snapshot.paramMap.get('id'));
    this.subjectId = Number.isFinite(rawId) && rawId > 0 ? rawId : null;

    if (this.mode === 'edit' && this.subjectId) {
      this.loadSubject(this.subjectId);
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
    const payload: CreateAcademicSubjectDto = {
      name: formValue.name?.trim(),
      displayOrder: this.normalizeDisplayOrder(formValue.displayOrder)
    };

    this.isSaving = true;
    const request$ =
      this.mode === 'edit' && this.subjectId
        ? this.academicSubjectService.update({ ...(payload as UpdateAcademicSubjectDto), id: this.subjectId })
        : this.academicSubjectService.create(payload);

    request$.subscribe({
      next: (response) => {
        this.isSaving = false;
        if (!response.isSuccess) {
          response.errors?.forEach((error) => this.toast.error(error.message));
          if (!response.errors?.length) {
            this.toast.error(this.mode === 'edit' ? 'تعذر تحديث المادة الدراسية' : 'تعذر إضافة المادة الدراسية');
          }
          return;
        }

        this.toast.success(response.message || (this.mode === 'edit' ? 'تم تحديث المادة الدراسية بنجاح' : 'تمت إضافة المادة الدراسية بنجاح'));
        this.router.navigate(['/online-course/academic/subjects']);
      },
      error: () => {
        this.isSaving = false;
        this.toast.error(this.mode === 'edit' ? 'تعذر تحديث المادة الدراسية' : 'تعذر إضافة المادة الدراسية');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/online-course/academic/subjects']);
  }

  private loadSubject(id: number): void {
    this.isLoading = true;
    this.academicSubjectService.get(id).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (!response.isSuccess || !response.data) {
          this.toast.error('تعذر تحميل بيانات المادة الدراسية');
          return;
        }

        this.reportsCount = response.data.reportsCount ?? 0;
        this.form.patchValue({
          name: response.data.name ?? '',
          displayOrder: response.data.displayOrder ?? null
        });
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('تعذر تحميل بيانات المادة الدراسية');
      }
    });
  }

  private normalizeDisplayOrder(value: number | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
  }
}
