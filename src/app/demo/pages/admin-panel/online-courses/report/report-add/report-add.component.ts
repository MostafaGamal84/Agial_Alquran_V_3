import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportService,
  CircleReportAddDto,
} from 'src/app/@theme/services/circle-report.service';
import { LookUpUserDto } from 'src/app/@theme/services/lookup.service';
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
  private toast = inject(ToastService);
  private auth = inject(AuthenticationService);
  private route = inject(ActivatedRoute);

  reportForm!: FormGroup;
  teachers: LookUpUserDto[] = [];
  students: LookUpUserDto[] = [];
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

    if (this.role === UserTypesEnum.Manager) {
      this.loadTeachers();
    } else if (this.role === UserTypesEnum.Teacher) {
      const current = this.auth.currentUserValue;
      const teacherId = current ? Number(current.user.id) : 0;
      this.reportForm.get('teacherId')?.setValue(teacherId);
      this.loadStudents(teacherId);
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.reportForm.get('studentId')?.setValue(id);
    }
  }

  loadTeachers() {
    this.service
      .getUsersForGroup({ skipCount: 0, maxResultCount: 100 }, Number(UserTypesEnum.Teacher), 0)
      .subscribe((res) => {
        if (res.isSuccess) {
          this.teachers = res.data.items;
        }
      });
  }

  onTeacherChange(id: number) {
    this.reportForm.get('teacherId')?.setValue(id);
    this.loadStudents(id);
  }

  loadStudents(teacherId: number) {
    this.service
      .getUsersForGroup({ skipCount: 0, maxResultCount: 100 }, Number(UserTypesEnum.Student), teacherId)
      .subscribe((res) => {
        if (res.isSuccess) {
          this.students = res.data.items;
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

