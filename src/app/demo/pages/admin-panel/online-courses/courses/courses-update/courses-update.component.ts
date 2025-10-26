import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import {
  CircleDto,
  CircleDayDto,
  CircleManagerDto,
  CircleStudentDto,
  CircleService,
  UpdateCircleDto,
  CircleDayRequestDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DAY_OPTIONS, DayValue, coerceDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue, timeStringToTimeSpanString } from 'src/app/@theme/utils/time';
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
  selector: 'app-courses-update',
  imports: [SharedModule, CommonModule],
  templateUrl: './courses-update.component.html',
  styleUrl: './courses-update.component.scss'
})
export class CoursesUpdateComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circle = inject(CircleService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthenticationService);
  private destroy$ = new Subject<void>();
  private readonly userFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  id!: number;
  isManager = false;
  private currentManagerId: number | null = null;
  days = DAY_OPTIONS;

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

    const course = history.state.course as CircleDto | undefined;

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager))
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.managers.map((m) => [m.id, m]));
          (res.data.items ?? []).forEach((m) => existing.set(m.id, m));
          this.managers = this.ensureCurrentManagerPresence(Array.from(existing.values()));
        }
      });
    const initialManagerId = this.resolvePrimaryId(managersControl?.value as number[] | null);
    if (initialManagerId !== null) {
      this.loadTeachers(initialManagerId);
    }

    if (course) {
      this.initializeFromCourse(course);
      if (this.requiresSupplementalData(course)) {
        this.circle
          .get(course.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.isSuccess) {
              this.initializeFromCourse(res.data);
            }
          });
      }
    } else {
      this.id = Number(this.route.snapshot.paramMap.get('id'));
      if (this.id) {
        this.circle
          .get(this.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.isSuccess) {
              this.initializeFromCourse(res.data);
            }
          });
      }
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

  private initializeFromCourse(course: CircleDto | null | undefined): void {
    if (!course) {
      return;
    }

    this.id = course.id;

    const courseManagers =
      course.managers?.map((m: CircleManagerDto) =>
        m.manager ? (m.manager as LookUpUserDto) : (m as unknown as LookUpUserDto)
      ) ?? [];
    if (courseManagers.length) {
      const existingManagers = new Map(this.managers.map((manager) => [manager.id, manager]));
      courseManagers.forEach((manager) => existingManagers.set(manager.id, manager));
      this.managers = this.ensureCurrentManagerPresence(Array.from(existingManagers.values()));
    } else {
      this.managers = this.ensureCurrentManagerPresence(this.managers);
    }

    const managerIds =
      course.managers
        ?.map((m: CircleManagerDto | number) => (typeof m === 'number' ? m : m.managerId))
        .filter((id): id is number => id !== undefined && id !== null) ?? [];

    const effectiveManagerIds =
      this.isManager && this.currentManagerId !== null ? [this.currentManagerId] : managerIds;

    const studentIds = this.extractStudentIds(course);
    const courseStudents = this.mapStudentsToLookups(course);
    if (courseStudents.length) {
      const existingStudents = new Map(this.students.map((student) => [student.id, student]));
      courseStudents.forEach((student) => existingStudents.set(student.id, student));
      this.students = Array.from(existingStudents.values());
    }

    const fallbackTeacher = course.teacher ?? null;

    this.circleForm.patchValue({ name: course.name ?? '' }, { emitEvent: false });
    this.circleForm.get('managers')?.setValue(effectiveManagerIds, { emitEvent: false });

    const schedule = this.extractSchedule(course);
    this.setDays(schedule);

    const primaryManagerId = this.resolvePrimaryId(effectiveManagerIds);
    const teacherId = typeof course.teacherId === 'number' ? course.teacherId : null;

    this.loadTeachers(primaryManagerId, teacherId, studentIds, fallbackTeacher, courseStudents);

    if (primaryManagerId === null && teacherId !== null) {
      this.loadStudents(teacherId, studentIds, courseStudents);
    }
  }

  private requiresSupplementalData(course: CircleDto | null | undefined): boolean {
    if (!course) {
      return false;
    }

    const studentIds = this.extractStudentIds(course);
    if (!studentIds.length) {
      return true;
    }

    const schedule = this.extractSchedule(course);
    const hasDayValue = schedule.some((entry) => entry.dayId !== null && entry.dayId !== undefined);
    const hasTimeValue = schedule.some((entry) =>
      typeof entry.startTime === 'string' ? entry.startTime.trim().length > 0 : false
    );

    return !hasDayValue || !hasTimeValue;
  }

  private loadTeachers(
    managerId: number | null,
    selectedTeacherId: number | null = null,
    selectedStudents: number[] = [],
    fallbackTeacher?: LookUpUserDto | null,
    fallbackStudents: LookUpUserDto[] = []
  ): void {
    const teacherControl = this.circleForm.get('teacherId');
    const studentsControl = this.circleForm.get('studentsIds');

    const normalizedSelectedStudents = Array.isArray(selectedStudents) ? selectedStudents : [];
    const fallbackStudentLookups = Array.isArray(fallbackStudents) ? fallbackStudents : [];
    const fallbackTeacherList =
      fallbackTeacher && typeof fallbackTeacher.id === 'number' ? [fallbackTeacher] : [];

    this.teachers = this.mergeUnique([], fallbackTeacherList);
    teacherControl?.reset(selectedTeacherId ?? null, { emitEvent: false });
    teacherControl?.disable({ emitEvent: false });

    this.students = this.mergeUnique([], fallbackStudentLookups);
    const initialStudentSelection = normalizedSelectedStudents.filter((id) =>
      this.students.some((student) => student.id === id)
    );
    studentsControl?.reset(initialStudentSelection, { emitEvent: false });
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
            const fetchedTeachers = res.data.items ?? [];
            this.teachers = this.mergeUnique(fetchedTeachers, fallbackTeacherList);
            teacherControl?.enable({ emitEvent: false });

            if (selectedTeacherId !== null) {
              teacherControl?.setValue(selectedTeacherId, { emitEvent: false });
              this.loadStudents(selectedTeacherId, normalizedSelectedStudents, fallbackStudentLookups);
            }
          }
        },
        error: () => {
          teacherControl?.disable({ emitEvent: false });
        }
      });
  }

  private loadStudents(
    teacherId: number | null,
    selectedStudents: number[] = [],
    fallbackStudents: LookUpUserDto[] = []
  ): void {
    const studentsControl = this.circleForm.get('studentsIds');

    const normalizedSelection = Array.isArray(selectedStudents) ? selectedStudents : [];
    const fallbackList = Array.isArray(fallbackStudents) ? fallbackStudents : [];

    this.students = this.mergeUnique([], fallbackList);
    const initialSelection = normalizedSelection.filter((id) =>
      this.students.some((student) => student.id === id)
    );
    studentsControl?.reset(initialSelection, { emitEvent: false });
    studentsControl?.disable({ emitEvent: false });

    if (teacherId === null) {
      return;
    }

    this.lookup
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Student), 0, teacherId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            const fetchedStudents = res.data.items ?? [];
            this.students = this.mergeUnique(fetchedStudents, fallbackList);
            studentsControl?.enable({ emitEvent: false });

            const filteredSelection = normalizedSelection.filter((id) =>
              this.students.some((student) => student.id === id)
            );
            studentsControl?.setValue(filteredSelection, { emitEvent: false });
          }
        },
        error: () => {
          studentsControl?.disable({ emitEvent: false });
        }
      });
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

  private mergeUnique(primary: LookUpUserDto[], fallback: LookUpUserDto[]): LookUpUserDto[] {
    const map = new Map<number, LookUpUserDto>();
    primary
      .filter((item): item is LookUpUserDto => Boolean(item) && typeof item.id === 'number')
      .forEach((item) => map.set(item.id, item));
    fallback
      .filter((item): item is LookUpUserDto => Boolean(item) && typeof item.id === 'number')
      .forEach((item) => map.set(item.id, item));
    return Array.from(map.values());
  }

  private extractStudentIds(circle: CircleDto | null | undefined): number[] {
    return (
      circle?.students
        ?.map((s: CircleStudentDto) => s.id ?? s.studentId ?? s.student?.id)
        .filter((id): id is number => id !== undefined && id !== null) ?? []
    );
  }

  private mapStudentsToLookups(circle: CircleDto | null | undefined): LookUpUserDto[] {
    if (!circle?.students?.length) {
      return [];
    }

    return circle.students
      .map((s: CircleStudentDto) =>
        (s as CircleStudentDto).student
          ? ((s as CircleStudentDto).student as LookUpUserDto)
          : (s as unknown as LookUpUserDto)
      )
      .filter((student): student is LookUpUserDto => Boolean(student) && typeof student.id === 'number');
  }

  private createDayGroup(initial?: Partial<CircleScheduleFormValue>): FormGroup {
    return this.fb.group({
      dayId: [initial?.dayId ?? null, Validators.required],
      startTime: [initial?.startTime ?? '', Validators.required]
    });
  }

  private setDays(schedule: CircleScheduleFormValue[]): void {
    const array = this.daysArray;
    while (array.length) {
      array.removeAt(array.length - 1);
    }

    if (!schedule.length) {
      array.push(this.createDayGroup());
    } else {
      schedule.forEach((entry) => array.push(this.createDayGroup(entry)));
    }

    array.markAsPristine();
    array.markAsUntouched();
    array.updateValueAndValidity();
  }

  private extractSchedule(circle?: CircleDto | null): CircleScheduleFormValue[] {
    if (!circle) {
      return [];
    }

    const normalized =
      Array.isArray(circle.days) && circle.days.length
        ? circle.days
            .map((day) => {
              const resolvedDay = coerceDayValue(day?.dayId ?? day?.dayName ?? undefined);
              const startTime = formatTimeValue(day?.time);
              return {
                dayId: resolvedDay ?? null,
                startTime: startTime ? startTime : ''
              };
            })
            .filter(
              (entry) =>
                entry.dayId !== null ||
                (typeof entry.startTime === 'string' && entry.startTime.trim().length > 0)
            )
        : [];

    if (normalized.length) {
      return normalized;
    }

    const primaryDay = this.resolvePrimaryDay(circle);
    const fallbackDayId =
      coerceDayValue(
        primaryDay?.dayId ??
          circle.dayIds?.[0] ??
          circle.dayNames?.[0] ??
          circle.dayId ??
          circle.day
      ) ?? null;
    const fallbackTime = formatTimeValue(primaryDay?.time ?? circle.startTime ?? circle.time);
    const trimmedFallbackTime = fallbackTime.trim();

    if (fallbackDayId === null && !trimmedFallbackTime) {
      return [];
    }

    return [
      {
        dayId: fallbackDayId,
        startTime: trimmedFallbackTime || ''
      }
    ];
  }

  private resolvePrimaryDay(circle?: CircleDto | null): CircleDayDto | undefined {
    if (!circle || !Array.isArray(circle.days)) {
      return undefined;
    }

    return circle.days.find((day): day is CircleDayDto => Boolean(day)) ?? undefined;
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

          const startTimeValue = timeStringToTimeSpanString(entry?.startTime ?? undefined);
          acc.push({ dayId: dayValue, time: startTimeValue ?? null });
          return acc;
        }, [])
      : [];

    const model: UpdateCircleDto = {
      id: this.id,
      name: formValue.name,
      teacherId: formValue.teacherId,
      days: schedule.length ? schedule : null,
      managers: formValue.managers,
      studentsIds: formValue.studentsIds
    };
    this.circle.update(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success('Circle updated successfully');
        } else if (res.errors?.length) {
          res.errors.forEach((e) => this.toast.error(e.message));
        } else {
          this.toast.error('Error updating circle');
        }
      },
      error: () => this.toast.error('Error updating circle')
    });
  }
}

