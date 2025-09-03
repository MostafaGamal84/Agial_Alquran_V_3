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
  CircleService,
  UpdateCircleDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

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

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  id!: number;

  ngOnInit(): void {
    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      teacherId: [null, Validators.required],
      managers: [[]],
      studentsIds: [[]]
    });

    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.lookup
      .getUsersByUserType(filter, Number(UserTypesEnum.Teacher))
      .subscribe((res) => {
        if (res.isSuccess) this.teachers = res.data.items;
      });
    this.lookup
      .getUsersByUserType(filter, Number(UserTypesEnum.Manager))
      .subscribe((res) => {
        if (res.isSuccess) this.managers = res.data.items;
      });
    this.lookup
      .getUsersByUserType(filter, Number(UserTypesEnum.Student))
      .subscribe((res) => {
        if (res.isSuccess) this.students = res.data.items;
      });

    const course = history.state.course as CircleDto | undefined;
    if (course) {
      this.id = course.id;
      this.circleForm.patchValue({
        name: course.name,
        teacherId: course.teacherId,
        managers: course.managers ?? [],
        studentsIds: course.students?.map((s) => s.id) ?? course.studentsIds ?? []
      });
    } else {
      this.id = Number(this.route.snapshot.paramMap.get('id'));
      if (this.id) {
        this.circle.get(this.id).subscribe((res) => {
          if (res.isSuccess) {
            this.circleForm.patchValue({
              name: res.data.name,
              teacherId: res.data.teacherId,
              managers: res.data.managers
                ? res.data.managers.map((m: number | { id: number }) => (typeof m === 'number' ? m : m.id))
                : [],
              studentsIds: res.data.students
                ? res.data.students.map((s) => s.id)
                : []
            });
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
    const model: UpdateCircleDto = { id: this.id, ...this.circleForm.value };
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

