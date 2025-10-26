// angular imports
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

// project import
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

import { timeStringToTimeSpanString } from 'src/app/@theme/utils/time';
import { Subject, takeUntil } from 'rxjs';


interface CircleScheduleFormValue {
  dayId: DayValue | null;
  startTime: string | null;
}

interface CircleFormValue {
  name: string;
  teacherId: number;
  days: CircleScheduleFormValue[];
  managers: number[];
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
  private destroy$ = new Subject<void>();
  private readonly userFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

  private currentManagerId: number | null = null;

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  days = DAY_OPTIONS;
  isManager = false;

  ngOnInit(): void {
    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
    this.currentManagerId = this.isManager ? this.resolveCurrentManagerId() : null;

    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      teacherId: [{ value: null, disabled: true }, Validators.required],
      days: this.fb.array([this.createDayGroup()]),
      managers: [
        {
          value: this.currentManagerId !== null ? [this.currentManagerId] : [],
          disabled: this.isManager && this.currentManagerId !== null
        }
      ],
      studentsIds: [{ value: [], disabled: true }]
    });
    const teacherControl = this.circleForm.get('teacherId');
    const managersControl = this.circleForm.get('managers');

    this.managers = this.ensureCurrentManagerPresence([]);

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager))
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res.isSuccess) {
          const fetched = res.data.items ?? [];
          this.managers = this.ensureCurrentManagerPresence(fetched);
        }
      });

    managersControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((managerIds: number[] | null) => {
        const managerId = this.resolvePrimaryId(managerIds);
        this.loadTeachers(managerId);
      });

    teacherControl
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((teacherId: number | null) => {
        const resolvedTeacherId = typeof teacherId === 'number' ? teacherId : null;
        this.loadStudents(resolvedTeacherId);
      });

    const initialManagerId = this.resolvePrimaryId(managersControl?.value as number[] | null);
    if (initialManagerId !== null) {
      this.loadTeachers(initialManagerId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

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

  private resolvePrimaryId(ids: number[] | null | undefined): number | null {
    if (!Array.isArray(ids) || !ids.length) {
      return null;
    }

    const candidate = Number(ids[0]);
    return Number.isFinite(candidate) ? candidate : null;
  }

  private resolveCurrentManagerId(): number | null {
    const current = this.auth.currentUserValue;
    const id = current?.user?.id;
    const parsed = Number(id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private ensureCurrentManagerPresence(list: LookUpUserDto[]): LookUpUserDto[] {
    if (!this.isManager || this.currentManagerId === null) {
      return list;
    }

    const exists = list.some((manager) => manager?.id === this.currentManagerId);
    if (exists) {
      return list;
    }

    const current = this.auth.currentUserValue;
    const fallback: LookUpUserDto = {
      id: this.currentManagerId,
      fullName: current?.user?.name ?? '',
      email: current?.user?.email ?? '',
      mobile: '',
      secondMobile: '',
      nationality: '',
      nationalityId: 0,
      governorate: '',
      governorateId: 0,
      branchId: 0
    };

    return [...list, fallback];
  }

  private loadTeachers(managerId: number | null): void {
    const teacherControl = this.circleForm.get('teacherId');
    const studentsControl = this.circleForm.get('studentsIds');

    this.teachers = [];
    teacherControl?.reset(null, { emitEvent: false });
    teacherControl?.disable({ emitEvent: false });

    this.students = [];
    studentsControl?.reset([], { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    if (!managerId) {
      return;
    }

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Teacher), managerId)
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

  onSubmit() {
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

    const model: CreateCircleDto = {
      name: formValue.name,
      teacherId: formValue.teacherId,
      days: schedule.length ? schedule : null,
      managers: formValue.managers,
      studentsIds: formValue.studentsIds
    };
    this.circle.create(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success('Circle created successfully');
          this.resetForm();
        } else if (res.errors?.length) {
          res.errors.forEach((e) => this.toast.error(e.message));
        } else {
          this.toast.error('Error creating circle');
        }
      },
      error: () => this.toast.error('Error creating circle')
    });
  }

  private resetForm(): void {
    while (this.daysArray.length > 1) {
      this.daysArray.removeAt(0);
    }

    if (!this.daysArray.length) {
      this.daysArray.push(this.createDayGroup());
    }

    this.daysArray.at(0).reset({ dayId: null, startTime: '' });

    this.circleForm.reset({
      name: '',
      teacherId: null,
      managers: [],
      studentsIds: [],
      days: this.daysArray.value
    });

    this.teachers = [];
    this.students = [];
    this.circleForm.get('teacherId')?.disable({ emitEvent: false });
    this.circleForm.get('studentsIds')?.disable({ emitEvent: false });

    this.circleForm.markAsPristine();
    this.circleForm.markAsUntouched();
  }
}

