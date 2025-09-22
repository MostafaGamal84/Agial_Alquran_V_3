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
import { DAY_OPTIONS, DaysEnum, coerceDayValue } from 'src/app/@theme/types/DaysEnum';
import { timeStringToMinutes } from 'src/app/@theme/utils/time';

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
      day: [null, Validators.required],
      time: ['', Validators.required],
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
    const formValue = this.circleForm.value as {
      name: string;
      teacherId: number;
      day: DaysEnum;
      time: string;
      managers: number[];
      studentsIds: number[];
    };

    const dayValue = coerceDayValue(formValue.day) ?? null;
    const timeValue = timeStringToMinutes(formValue.time) ?? null;

    const model: CreateCircleDto = {
      name: formValue.name,
      teacherId: formValue.teacherId,
      day: dayValue,
      time: timeValue,
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
            day: null,
            time: '',
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

