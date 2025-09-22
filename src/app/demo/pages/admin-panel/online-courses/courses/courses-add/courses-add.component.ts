// angular imports
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// project import
import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  LookupService,
  LookUpUserDto,
  FilteredResultRequestDto
} from 'src/app/@theme/services/lookup.service';
import {
  CircleService,
  CreateCircleDto
} from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { DAY_OPTIONS, DayValue, coerceDayValue } from 'src/app/@theme/types/DaysEnum';

import {
  timeStringToMinutes,
  timeStringToTimeSpanString
} from 'src/app/@theme/utils/time';

interface CircleFormValue {
  name: string;
  teacherId: number;
  dayId: DayValue;
  startTime: string;
  managers: number[];
  studentsIds: number[];
}


@Component({
  selector: 'app-courses-add',
  imports: [SharedModule, CommonModule],
  templateUrl: './courses-add.component.html',
  styleUrl: './courses-add.component.scss'
})
export class CoursesAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private lookup = inject(LookupService);
  private circle = inject(CircleService);
  private toast = inject(ToastService);

  circleForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  managers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
  days = DAY_OPTIONS;

  ngOnInit(): void {
    this.circleForm = this.fb.group({
      name: ['', Validators.required],
      teacherId: [null, Validators.required],
      dayId: [null, Validators.required],
      startTime: ['', Validators.required],
      managers: [[]],
      studentsIds: [[]]
    });

    const filter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Teacher))
      .subscribe((res) => {
        if (res.isSuccess) this.teachers = res.data.items;
      });
    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Manager))
      .subscribe((res) => {
        if (res.isSuccess) this.managers = res.data.items;
      });
    this.lookup
      .getUsersForSelects(filter, Number(UserTypesEnum.Student))
      .subscribe((res) => {
        if (res.isSuccess) this.students = res.data.items;
      });
  }

  onSubmit() {
    if (this.circleForm.invalid) {
      this.circleForm.markAllAsTouched();
      return;
    }
    const formValue = this.circleForm.value as CircleFormValue;

    const dayValue = coerceDayValue(formValue.dayId) ?? null;
    const startTimeValue = timeStringToTimeSpanString(formValue.startTime) ?? null;
    const timeValue = timeStringToMinutes(formValue.startTime);
    const model: CreateCircleDto = {
      name: formValue.name,
      teacherId: formValue.teacherId,
      dayId: dayValue ?? null,
      startTime: startTimeValue ?? null,
      time: timeValue ?? null,
      managers: formValue.managers,
      studentsIds: formValue.studentsIds
    };
    this.circle.create(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success('Circle created successfully');
          this.circleForm.reset({
            name: '',
            teacherId: null,
            dayId: null,
            startTime: '',
            managers: [],
            studentsIds: []
          });
        } else if (res.errors?.length) {
          res.errors.forEach((e) => this.toast.error(e.message));
        } else {
          this.toast.error('Error creating circle');
        }
      },
      error: () => this.toast.error('Error creating circle')
    });
  }
}

