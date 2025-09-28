import { Component, OnInit, inject } from '@angular/core';
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
  UpdateCircleDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { DAY_OPTIONS, DayValue, coerceDayValue } from 'src/app/@theme/types/DaysEnum';
import { formatTimeValue, timeStringToTimeSpanString } from 'src/app/@theme/utils/time';

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
export class CoursesUpdateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circle = inject(CircleService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthenticationService);

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  id!: number;
  isManager = false;
  days = DAY_OPTIONS;

  ngOnInit(): void {
    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      teacherId: [null, Validators.required],
      days: this.fb.array([this.createDayGroup()]),
      managers: [{ value: [], disabled: this.isManager }],
      studentsIds: [[]]
    });
    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };

    const course = history.state.course as CircleDto | undefined;
    if (course?.managers?.length) {
      this.managers = course.managers.map((m: CircleManagerDto) =>
        m.manager ? (m.manager as LookUpUserDto) : (m as unknown as LookUpUserDto)
      );
    }
    if (course?.students?.length) {
      this.students = course.students.map((s: CircleStudentDto) =>
        (s as CircleStudentDto).student
          ? ((s as CircleStudentDto).student as LookUpUserDto)
          : (s as unknown as LookUpUserDto)
      );
    }

    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Teacher))
      .subscribe((res) => {
        if (res.isSuccess) this.teachers = res.data.items;
      });
    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Manager))
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.managers.map((m) => [m.id, m]));
          res.data.items.forEach((m) => existing.set(m.id, m));
          this.managers = Array.from(existing.values());
        }
      });
    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Student))
      .subscribe((res) => {
        if (res.isSuccess) {
          const existing = new Map(this.students.map((s) => [s.id, s]));
          res.data.items.forEach((s) => existing.set(s.id, s));
          this.students = Array.from(existing.values());
        }
      });

    if (course) {
      this.id = course.id;
      const studentIds =
        course.students
          ?.map((s: CircleStudentDto) => s.id ?? s.studentId ?? s.student?.id)
          .filter((id): id is number => id !== undefined) ?? [];
      const schedule = this.extractSchedule(course);
      this.circleForm.patchValue({
        name: course.name ?? '',
        teacherId: course.teacherId ?? null,
        studentsIds: studentIds
      });
      this.circleForm
        .get('managers')
        ?.setValue(
          course.managers?.map((m: CircleManagerDto | number) =>
            typeof m === 'number' ? m : m.managerId
          ) ?? [],
          { emitEvent: false }
        );
      this.setDays(schedule);
      const hasDayValue = schedule.some((entry) => entry.dayId !== null && entry.dayId !== undefined);
      const hasTimeValue = schedule.some((entry) =>
        typeof entry.startTime === 'string' ? entry.startTime.trim().length > 0 : false
      );

      if (!studentIds.length || !hasDayValue || !hasTimeValue) {
        this.circle.get(this.id).subscribe((res) => {
          if (res.isSuccess) {
            const fetchedStudents =
              res.data.students
                ?.map((s: CircleStudentDto) =>
                  s.id ?? s.studentId ?? s.student?.id
                )
                .filter((id): id is number => id !== undefined) ?? [];
            this.circleForm.patchValue({ studentsIds: fetchedStudents });
            this.circleForm
              .get('managers')
              ?.setValue(
                res.data.managers?.map((m: CircleManagerDto | number) =>
                  typeof m === 'number' ? m : m.managerId
                ) ?? [],
                { emitEvent: false }
              );
            const fetchedSchedule = this.extractSchedule(res.data);
            this.setDays(fetchedSchedule);
            if (res.data.students?.length) {
              const courseStudents = res.data.students.map(
                (s: CircleStudentDto) =>
                  (s as CircleStudentDto).student
                    ? ((s as CircleStudentDto).student as LookUpUserDto)
                    : (s as unknown as LookUpUserDto)

              );
              const existing = new Map(this.students.map((st) => [st.id, st]));
              courseStudents.forEach((st) => existing.set(st.id, st));
              this.students = Array.from(existing.values());
            }
          }
        });
      }
    } else {
      this.id = Number(this.route.snapshot.paramMap.get('id'));
      if (this.id) {
        this.circle.get(this.id).subscribe((res) => {
          if (res.isSuccess) {
            const fetchedStudents =
              res.data.students
                ?.map((s: CircleStudentDto) =>
                  s.id ?? s.studentId ?? s.student?.id
                )
                .filter((id): id is number => id !== undefined) ?? [];
            this.circleForm.patchValue({
              name: res.data.name ?? '',
              teacherId: res.data.teacherId ?? null,
              studentsIds: fetchedStudents
            });
            this.circleForm
              .get('managers')
              ?.setValue(
                res.data.managers
                  ? res.data.managers.map((m: CircleManagerDto | number) =>
                      typeof m === 'number' ? m : m.managerId
                    )
                  : [],
                { emitEvent: false }
              );
            const fetchedSchedule = this.extractSchedule(res.data);
            this.setDays(fetchedSchedule);
            if (res.data.students?.length) {
              const courseStudents = res.data.students.map((s: CircleStudentDto) =>
                (s as CircleStudentDto).student
                  ? ((s as CircleStudentDto).student as LookUpUserDto)
                  : (s as unknown as LookUpUserDto)
              );
              const existing = new Map(this.students.map((st) => [st.id, st]));
              courseStudents.forEach((st) => existing.set(st.id, st));
              this.students = Array.from(existing.values());
            }
          }
        });
      }
    }
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

