import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportService,
  CircleReportAddDto,
} from 'src/app/@theme/services/circle-report.service';
import { CircleService, CircleDto } from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

@Component({
  selector: 'app-report-add',
  imports: [CommonModule, SharedModule],
  templateUrl: './report-add.component.html',
  styleUrl: './report-add.component.scss'
})
export class ReportAddComponent implements OnInit {
  private fb = inject(FormBuilder);
  private service = inject(CircleReportService);
  private circleService = inject(CircleService);
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private route = inject(ActivatedRoute);

  reportForm!: FormGroup;
  role = this.auth.getRole();
  UserTypesEnum = UserTypesEnum;

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      minutes: [],
      newId: [],
      newFrom: [''],
      newTo: [''],
      newRate: [''],
      recentPast: [''],
      recentPastRate: [''],
      distantPast: [''],
      distantPastRate: [''],
      farthestPast: [''],
      farthestPastRate: [''],
      theWordsQuranStranger: [''],
      intonation: [''],
      other: [''],
      creationTime: [new Date(), Validators.required],
      circleId: [],
      studentId: [null, Validators.required],
      teacherId: [null],
      attendStatueId: []
    });

    const course = history.state.circle as CircleDto | undefined;

    if (course) {
      this.reportForm.patchValue({
        teacherId: course.teacherId ?? course.teacher?.id,
        circleId: course.id,
      });
    } else if (this.role === UserTypesEnum.Teacher) {
      const current = this.auth.currentUserValue;
      const teacherId = current ? Number(current.user.id) : 0;
      this.reportForm.get('teacherId')?.setValue(teacherId);
      this.loadCircle(teacherId);
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.reportForm.get('studentId')?.setValue(id);
    }
  }

  loadCircle(teacherId: number) {
    this.circleService
      .getAll({ skipCount: 0, maxResultCount: 1 }, undefined, teacherId)
      .subscribe((res) => {
        if (res.isSuccess && res.data.items.length) {
          this.reportForm.get('circleId')?.setValue(res.data.items[0].id);
        }
      });
  }

  onSubmit() {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }
    const model: CircleReportAddDto = this.reportForm.value;
    this.service.create(model).subscribe({
      next: (res) => {
        if (res.isSuccess) {
          this.toast.success('Report created successfully');
          this.reportForm.reset();
        } else {
          res.errors.forEach((e) => this.toast.error(e.message));
        }
      },
      error: () => this.toast.error('Error creating report')
    });
  }
}

