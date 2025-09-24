import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
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

interface CircleFormValue {
  name: string;
  teacherId: number;
  dayId: DayValue;
  startTime: string;
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
      dayId: [null, Validators.required],
      startTime: ['', Validators.required],
      managers: [{ value: [], disabled: this.isManager }],
      studentsIds: [[]]
    });
    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
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
      const primaryDay = this.resolvePrimaryDay(course);
      const resolvedDay =
        coerceDayValue(
          primaryDay?.dayId ??
            course.dayIds?.[0] ??
            course.dayNames?.[0] ??
            course.dayId ??
            course.day
        ) ?? null;
      const resolvedStartTime = formatTimeValue(
        primaryDay?.time ?? course.startTime ?? course.time
      );
      this.circleForm.patchValue({
        name: course.name ?? '',
        teacherId: course.teacherId ?? null,
        dayId: resolvedDay ?? null,
        startTime: resolvedStartTime,
        managers:
          course.managers?.map((m: CircleManagerDto | number) =>
            typeof m === 'number' ? m : m.managerId
          ) ?? [],
        studentsIds: studentIds
      });
      const hasDayValue = Boolean(
        primaryDay?.dayId !== undefined ||
          primaryDay?.dayName ||
          (course.dayIds && course.dayIds.length) ||
          (course.dayNames && course.dayNames.length) ||
          course.day !== undefined ||
          course.dayId !== undefined
      );
      const hasTimeValue = Boolean(
        primaryDay?.time !== undefined && primaryDay?.time !== null
          ? true
          : course.startTime !== undefined && course.startTime !== null
            ? true
            : course.time !== undefined && course.time !== null
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
            const fetchedPrimaryDay = this.resolvePrimaryDay(res.data);
            this.circleForm.patchValue({
              dayId:
                coerceDayValue(
                  fetchedPrimaryDay?.dayId ??
                    res.data.dayIds?.[0] ??
                    res.data.dayNames?.[0] ??
                    res.data.dayId ??
                    res.data.day
                ) ?? null,
              startTime: formatTimeValue(
                fetchedPrimaryDay?.time ?? res.data.startTime ?? res.data.time
              )
            });
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
            const fetchedPrimaryDay = this.resolvePrimaryDay(res.data);
            this.circleForm.patchValue({
              name: res.data.name ?? '',
              teacherId: res.data.teacherId ?? null,
              dayId:
                coerceDayValue(
                  fetchedPrimaryDay?.dayId ??
                    res.data.dayIds?.[0] ??
                    res.data.dayNames?.[0] ??
                    res.data.dayId ??
                    res.data.day
                ) ?? null,
              startTime: formatTimeValue(
                fetchedPrimaryDay?.time ?? res.data.startTime ?? res.data.time
              ),
              managers: res.data.managers
                ? res.data.managers.map((m: CircleManagerDto | number) =>
                    typeof m === 'number' ? m : m.managerId
                  )
                : [],
              studentsIds: fetchedStudents
            });
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

    const dayValue = coerceDayValue(formValue.dayId);
    const startTimeValue = timeStringToTimeSpanString(formValue.startTime);

    const schedule =
      dayValue !== undefined
        ? [{ dayId: dayValue, time: startTimeValue ?? null }]
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

