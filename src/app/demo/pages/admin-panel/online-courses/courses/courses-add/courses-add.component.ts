import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import {
  CircleService,
  CircleDayRequestDto,
  CreateCircleDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DAY_OPTIONS, DayValue, coerceDayValue } from 'src/app/@theme/types/DaysEnum';
import { ProfileDto, UserService } from 'src/app/@theme/services/user.service';
import { BranchesEnum } from 'src/app/@theme/types/branchesEnum';

import { timeStringToTimeSpanString } from 'src/app/@theme/utils/time';
import { Subject, merge, startWith } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { Router } from '@angular/router';

interface CircleScheduleFormValue {
  dayId: DayValue | null;
  startTime: string | null;
}

interface CircleFormValue {
  name: string;
  branchId: number | null;
  teacherId: number;
  days: CircleScheduleFormValue[];
  managers: number | null;
  studentsIds: number[];
}

@Component({
  selector: 'app-courses-add',
  imports: [SharedModule, CommonModule],
  templateUrl: './courses-add.component.html',
  styleUrl: './courses-add.component.scss'
})
export class CoursesAddComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circle = inject(CircleService);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private router = inject(Router);

  private userService = inject(UserService);
  private destroy$ = new Subject<void>();
  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };

  private currentManagerId: number | null = null;
  private lastLoadedManagerId: number | null = null;
  private managerFallback: LookUpUserDto | null = null;

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  days = DAY_OPTIONS;
  branchOptions = [
    { id: BranchesEnum.Mens, label: 'الرجال' },
    { id: BranchesEnum.Women, label: 'النساء' }
  ];
  isManager = false;
  submitted = false;
  isSaving = false;
  missingRequiredFields: string[] = [];

  ngOnInit(): void {
    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
    this.currentManagerId = this.isManager ? this.resolveCurrentManagerId() : null;

    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      branchId: [null, Validators.required],
      teacherId: [{ value: null, disabled: true }, Validators.required],
      days: this.fb.array([this.createDayGroup()]),
      managers: [
        {
          value: this.currentManagerId !== null ? this.currentManagerId : null,
          disabled: false
        }
      ],
      studentsIds: [{ value: [], disabled: true }]
    });

    const teacherControl = this.circleForm.get('teacherId');
    const managersControl = this.circleForm.get('managers');

    this.managers = this.ensureCurrentManagerPresence([]);

    if (this.currentManagerId !== null) {
      this.applyManagerSelection(managersControl, this.currentManagerId, true);
    }

    if (this.isManager) {
      this.triggerInitialTeacherLoad(managersControl);
      this.resolveManagerFromProfile();
    }

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager))
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res.isSuccess) {
          const fetched = res.data.items ?? [];
          const detectedId = this.tryResolveManagerIdentity(fetched);
          if (detectedId !== null) {
            this.currentManagerId = detectedId;
          }
          this.managers = this.ensureCurrentManagerPresence(fetched);
          if (this.currentManagerId !== null) {
            const shouldTriggerLoad = this.lastLoadedManagerId !== this.currentManagerId;
            this.applyManagerSelection(managersControl, this.currentManagerId, shouldTriggerLoad);
          }
        }
      });

    managersControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((managerId: number | null) => {
        const id = typeof managerId === 'number' ? managerId : null;
        this.loadTeachers(id);
      });

    teacherControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((teacherId: number | null) => {
        const resolvedTeacherId = typeof teacherId === 'number' ? teacherId : null;
        this.loadStudents(resolvedTeacherId);
      });

    const rawInitialManager = managersControl?.value;
    const initialManagerId =
      typeof rawInitialManager === 'number' ? rawInitialManager : null;
    if (initialManagerId !== null && this.lastLoadedManagerId !== initialManagerId) {
      this.loadTeachers(initialManagerId);
    }

    this.setupMissingRequiredFieldsTracking();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== Days helpers ==========
  get daysArray(): FormArray<FormGroup> {
    return this.circleForm.get('days') as FormArray<FormGroup>;
  }

  addDay(): void {
    this.daysArray.push(this.createDayGroup());
    this.daysArray.markAsDirty();
    this.daysArray.markAsTouched();
    this.daysArray.updateValueAndValidity();
  }

  removeDay(index: number): void {
    if (this.daysArray.length <= 1) {
      this.daysArray.at(0).reset({ dayId: null, startTime: '' });
      this.daysArray.markAsDirty();
      this.daysArray.markAsTouched();
      this.daysArray.updateValueAndValidity();
      return;
    }

    this.daysArray.removeAt(index);
    this.daysArray.markAsDirty();
    this.daysArray.markAsTouched();
    this.daysArray.updateValueAndValidity();
  }

  trackByIndex(index: number): number {
    return index;
  }

  // ========== Manager helpers ==========
  private resolveCurrentManagerId(): number | null {
    const current = this.auth.currentUserValue;
    const id = current?.user?.id;
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private ensureCurrentManagerPresence(list: LookUpUserDto[]): LookUpUserDto[] {
    if (!Array.isArray(list)) {
      list = [];
    }

    if (!this.isManager) {
      return list;
    }

    const managerId = this.currentManagerId ?? this.managerFallback?.id ?? null;
    if (managerId === null) {
      return list;
    }

    const exists = list.some((manager) => manager?.id === managerId);
    if (exists) {
      return list;
    }

    const fallback = this.managerFallback ?? this.buildManagerFallback(managerId);
    if (!fallback) {
      return list;
    }

    return [...list, fallback];
  }

  private buildManagerFallback(managerId: number): LookUpUserDto | null {
    const current = this.auth.currentUserValue;
    if (!current) {
      return null;
    }

    return {
      id: managerId,
      fullName: current.user?.name ?? '',
      email: current.user?.email ?? '',
      mobile: '',
      secondMobile: '',
      nationality: '',
      nationalityId: 0,
      governorate: '',
      governorateId: 0,
      branchId: 0
    };
  }

  private tryResolveManagerIdentity(list: LookUpUserDto[]): number | null {
    if (!this.isManager) {
      return this.currentManagerId;
    }

    if (this.currentManagerId !== null) {
      const exists = list.some((manager) => manager?.id === this.currentManagerId);
      if (exists) {
        return this.currentManagerId;
      }
    }

    const current = this.auth.currentUserValue;
    const email = this.normalizeIdentity(current?.user?.email);
    if (email) {
      const match = list.find((manager) => this.normalizeIdentity(manager?.email) === email);
      if (match?.id) {
        return match.id;
      }
    }

    const name = this.normalizeIdentity(current?.user?.name);
    if (name) {
      const match = list.find(
        (manager) => this.normalizeIdentity(manager?.fullName) === name
      );
      if (match?.id) {
        return match.id;
      }
    }

    return this.currentManagerId;
  }

  private normalizeIdentity(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim().toLowerCase();
    return normalized.length ? normalized : null;
  }

  private applyManagerSelection(
    control: AbstractControl | null,
    managerId: number | null,
    triggerLoad = false
  ): void {
    if (!control || managerId === null) {
      return;
    }

    control.setValue(managerId, { emitEvent: false });

    if (this.isManager) {
      control.disable({ emitEvent: false });
    }

    if (triggerLoad && this.lastLoadedManagerId !== managerId) {
      this.loadTeachers(managerId);
    }
  }

  private triggerInitialTeacherLoad(control: AbstractControl | null): void {
    if (!this.isManager) {
      return;
    }

    const rawManagerId = control?.value;
    const resolvedManagerId =
      typeof rawManagerId === 'number'
        ? rawManagerId
        : this.currentManagerId ?? this.managerFallback?.id ?? this.resolveCurrentManagerId();

    if (resolvedManagerId !== null) {
      this.applyManagerSelection(control, resolvedManagerId, true);
      return;
    }

    this.loadTeachers(null);
  }

  private resolveManagerFromProfile(): void {
    this.userService
      .getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (!res.isSuccess || !res.data) {
          return;
        }

        const managerLookup = this.mapProfileToLookup(res.data);
        if (!managerLookup) {
          return;
        }

        this.managerFallback = managerLookup;
        this.currentManagerId = managerLookup.id;

        this.managers = this.ensureCurrentManagerPresence(this.managers);

        const managersControl = this.circleForm.get('managers');
        const shouldTriggerLoad = this.lastLoadedManagerId !== this.currentManagerId;
        this.applyManagerSelection(managersControl, this.currentManagerId, shouldTriggerLoad);
      });
  }

  private mapProfileToLookup(profile: ProfileDto | null | undefined): LookUpUserDto | null {
    if (!profile) {
      return null;
    }

    const parsedId = Number(profile.id);
    if (!Number.isFinite(parsedId) || parsedId <= 0) {
      return null;
    }

    return {
      id: parsedId,
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      mobile: profile.mobile ?? '',
      secondMobile: profile.secondMobile ?? '',
      nationality: '',
      nationalityId: profile.nationalityId ?? 0,
      governorate: '',
      governorateId: profile.governorateId ?? 0,
      branchId: profile.branchId ?? 0
    } as LookUpUserDto;
  }

  private loadTeachers(managerId: number | null): void {
    const teacherControl = this.circleForm.get('teacherId');
    const studentsControl = this.circleForm.get('studentsIds');

    const effectiveManagerId = managerId ?? this.currentManagerId ?? 0;
    this.lastLoadedManagerId = effectiveManagerId;

    this.teachers = [];
    teacherControl?.reset(null, { emitEvent: false });
    teacherControl?.disable({ emitEvent: false });

    this.students = [];
    studentsControl?.reset([], { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    this.lookup
      .getUsersForSelects(
        this.userFilter,
        Number(UserTypesEnum.Teacher),
        effectiveManagerId
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.teachers = res.data.items;
            teacherControl?.enable({ emitEvent: false });
          }
        },
        error: () => {
          teacherControl?.disable({ emitEvent: false });
        }
      });
  }

  private loadStudents(teacherId: number | null, selectedStudents: number[] = []): void {
    const studentsControl = this.circleForm.get('studentsIds');

    this.students = [];
    studentsControl?.reset(selectedStudents, { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    if (!teacherId) {
      return;
    }

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Student), 0, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.students = res.data.items;
            studentsControl?.enable({ emitEvent: false });
          }
        },
        error: () => {
          studentsControl?.disable({ emitEvent: false });
        }
      });
  }

  private createDayGroup(initial?: Partial<CircleScheduleFormValue>): FormGroup {
    return this.fb.group({
      dayId: [initial?.dayId ?? null, Validators.required],
      startTime: [initial?.startTime ?? '', Validators.required]
    });
  }

  get isSubmitDisabled(): boolean {
    return this.isSaving || this.circleForm.invalid;
  }

  get submitValidationMessage(): string {
    if (this.isSaving || this.circleForm.valid) {
      return '';
    }

    if (this.missingRequiredFields.length) {
      return `البيانات المطلوبة غير مكتملة: ${this.missingRequiredFields.join('، ')}`;
    }

    return 'يرجى استكمال الحقول المطلوبة قبل الحفظ.';
  }

  private getMissingRequiredFields(): string[] {
    const missing: string[] = [];

    if (this.isRequiredControlMissing('name')) {
      missing.push('اسم الحلقة');
    }

    if (this.isRequiredControlMissing('branchId')) {
      missing.push('الفرع');
    }

    if (this.isRequiredControlMissing('teacherId')) {
      missing.push('المعلم');
    }

    if (this.daysArray.controls.some((dayGroup) => this.isRequiredControlMissing('dayId', dayGroup))) {
      missing.push('اليوم');
    }

    if (this.daysArray.controls.some((dayGroup) => this.isRequiredControlMissing('startTime', dayGroup))) {
      missing.push('وقت الحلقة');
    }

    return missing;
  }

  private isRequiredControlMissing(controlName: string, group: FormGroup = this.circleForm): boolean {
    const control = group.get(controlName);
    return !!control && control.enabled && control.hasError('required');
  }

  private refreshMissingRequiredFields(): void {
    this.missingRequiredFields = this.getMissingRequiredFields();
  }

  private setupMissingRequiredFieldsTracking(): void {
    merge(this.circleForm.statusChanges, this.circleForm.valueChanges)
      .pipe(startWith(null), takeUntil(this.destroy$))
      .subscribe(() => this.refreshMissingRequiredFields());
  }

  // ========== Submit ==========
  onSubmit() {
    this.submitted = true;
    if (this.circleForm.invalid) {
      this.circleForm.markAllAsTouched();
      return;
    }

    const formValue = this.circleForm.getRawValue() as CircleFormValue;

    const schedule: CircleDayRequestDto[] = Array.isArray(formValue.days)
      ? formValue.days.reduce<CircleDayRequestDto[]>((acc, entry) => {
        const dayValue = coerceDayValue(entry?.dayId ?? undefined);
        if (dayValue === undefined) {
          return acc;
        }

        const startTimeValue = timeStringToTimeSpanString(entry?.startTime);
        acc.push({ dayId: dayValue, time: startTimeValue ?? null });
        return acc;
      }, [])
      : [];

    const managerId =
      typeof formValue.managers === 'number' && formValue.managers > 0
        ? formValue.managers
        : null;

    const model: CreateCircleDto = {
      name: formValue.name,
      branchId: formValue.branchId,
      teacherId: formValue.teacherId,
      days: schedule.length ? schedule : null,
      managers: managerId ? [managerId] : [],
      studentsIds: formValue.studentsIds
    };

    this.isSaving = true;

    this.circle
      .create(model)
      .pipe(
        finalize(() => {
          this.isSaving = false;
        })
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success('تم اضافة الحلقة بنجاح');
            this.router.navigate(['/online-course/courses/view']);
            []
            this.resetForm();
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('خطأ في التعديل');
          }
        },
        error: () => this.toast.error('خطأ في الحفظ')
      });
  }

  resetForm(): void {
    this.submitted = false;
    while (this.daysArray.length > 1) {
      this.daysArray.removeAt(0);
    }

    if (!this.daysArray.length) {
      this.daysArray.push(this.createDayGroup());
    }

    this.daysArray.at(0).reset({ dayId: null, startTime: '' });

    const managersControl = this.circleForm.get('managers');
    const managerSelection =
      this.isManager && this.currentManagerId !== null ? this.currentManagerId : null;

    this.circleForm.reset({
      name: '',
      branchId: null,
      teacherId: null,
      managers: managerSelection,
      studentsIds: [],
      days: this.daysArray.value
    });

    this.teachers = [];
    this.students = [];
    this.circleForm.get('teacherId')?.disable({ emitEvent: false });
    this.circleForm.get('studentsIds')?.disable({ emitEvent: false });

    if (this.isManager) {
      managersControl?.disable({ emitEvent: false });
      this.lastLoadedManagerId = null;
      this.applyManagerSelection(managersControl, this.currentManagerId, true);
    }

    this.circleForm.markAsPristine();
    this.circleForm.markAsUntouched();
  }
}
