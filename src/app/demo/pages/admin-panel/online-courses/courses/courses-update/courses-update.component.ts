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
  CircleManagerDto,
  CircleStudentDto,
  CircleService,
  UpdateCircleDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';

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

  ngOnInit(): void {
    this.isManager = this.auth.getRole() === UserTypesEnum.Manager;
    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      teacherId: [null, Validators.required],
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
      this.circleForm.patchValue({
        name: course.name,
        teacherId: course.teacherId,
        managers:
          course.managers?.map((m: CircleManagerDto | number) =>
            typeof m === 'number' ? m : m.managerId
          ) ?? [],
        studentsIds: studentIds
      });
      if (!studentIds.length) {
        this.circle.get(this.id).subscribe((res) => {
          if (res.isSuccess) {
            const fetchedStudents =
              res.data.students
                ?.map((s: CircleStudentDto) =>
                  s.id ?? s.studentId ?? s.student?.id
                )
                .filter((id): id is number => id !== undefined) ?? [];
            this.circleForm.patchValue({ studentsIds: fetchedStudents });
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
              name: res.data.name,
              teacherId: res.data.teacherId,
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

  onSubmit() {
    if (this.circleForm.invalid) {
      this.circleForm.markAllAsTouched();
      return;
    }
    const model: UpdateCircleDto = { id: this.id, ...this.circleForm.getRawValue() };
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

