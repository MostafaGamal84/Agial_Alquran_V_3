import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

import { SharedModule } from 'src/app/demo/shared/shared.module';
import {
  CircleReportService,
  CircleReportAddDto,
  CircleReportListDto
} from 'src/app/@theme/services/circle-report.service';
import { CircleService, CircleDto } from 'src/app/@theme/services/circle.service';
import { ToastService } from 'src/app/@theme/services/toast.service';
import { AuthenticationService } from 'src/app/@theme/services/authentication.service';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';
import { AttendStatusEnum } from 'src/app/@theme/types/AttendStatusEnum';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';
import { FilteredResultRequestDto, LookUpUserDto, LookupService } from 'src/app/@theme/services/lookup.service';

type ReportState = Partial<CircleReportAddDto> & Partial<CircleReportListDto>;

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
  private translate = inject(TranslateService);
  private lookupService = inject(LookupService);
  private reportId?: number;
  private preselectedStudentId?: number;

  reportForm!: FormGroup;
  role = this.auth.getRole();
  UserTypesEnum = UserTypesEnum;
  AttendStatusEnum = AttendStatusEnum;
  selectedStatus?: AttendStatusEnum;
  mode: 'add' | 'update' = 'add';
  cardTitle = 'Add Circle Report';
  submitLabel = 'Create';
  managers: LookUpUserDto[] = [];
  teachers: LookUpUserDto[] = [];
  circles: CircleDto[] = [];
  students: { id: number; name: string }[] = [];
  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingCircles = false;
  isLoadingStudents = false;
  private readonly userFilter: FilteredResultRequestDto = { skipCount: 0, maxResultCount: 100 };
  surahList = Object.keys(QuranSurahEnum)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      id: QuranSurahEnum[key as keyof typeof QuranSurahEnum],
      name: key
    }));

  ngOnInit(): void {
    this.mode = this.determineMode();
    if (this.mode === 'update') {
      this.cardTitle = 'Update Circle Report';
      this.submitLabel = 'Update';
    }

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
      managerId: [null],
      teacherId: [null, Validators.required],
      circleId: [null, Validators.required],
      studentId: [null, Validators.required],
      attendStatueId: []
    });

    this.toggleFields();

    if (this.mode === 'add') {
      const course = history.state.circle as CircleDto | undefined;

      if (course) {
        this.reportForm.patchValue({
          teacherId: course.teacherId ?? course.teacher?.id,
          circleId: course.id
        });
      }

      const id = Number(this.route.snapshot.paramMap.get('id'));
      if (id) {
        this.preselectedStudentId = id;
        this.reportForm.get('studentId')?.setValue(id);
      }
    } else {
      const reportId = Number(this.route.snapshot.paramMap.get('id'));
      if (reportId) {
        this.reportId = reportId;
        const report = this.getReportFromState(reportId);
        if (report) {
          this.populateFormFromReport(report, reportId);
        } else {
          this.toast.error(
            this.translate.instant('Report details are unavailable. Please return to the list and select a report to edit.')
          );
        }
      } else {
        this.toast.error(this.translate.instant('Invalid report identifier'));
      }
    }

    this.initializeSelectionFlow();
  }

  private allFields(): string[] {
    return [
      'minutes',
      'newId',
      'newFrom',
      'newTo',
      'newRate',
      'recentPast',
      'recentPastRate',
      'distantPast',
      'distantPastRate',
      'farthestPast',
      'farthestPastRate',
      'theWordsQuranStranger',
      'intonation',
      'other'
    ];
  }

  private toggleFields() {
    const controls = this.allFields();
    controls.forEach((c) => {
      this.reportForm.get(c)?.disable();
      this.reportForm.get(c)?.clearValidators();
      this.reportForm.get(c)?.updateValueAndValidity();
    });
  }

  onStatusChange(status: AttendStatusEnum) {
    this.selectedStatus = status;
    const controls = this.allFields();
    controls.forEach((c) => {
      this.reportForm.get(c)?.disable();
      this.reportForm.get(c)?.clearValidators();
      this.reportForm.get(c)?.updateValueAndValidity();
    });

    if (status === AttendStatusEnum.Attended) {
      controls.forEach((c) => this.reportForm.get(c)?.enable());
    } else if (status === AttendStatusEnum.UnexcusedAbsence) {
      this.reportForm.get('minutes')?.enable();
      this.reportForm.get('minutes')?.setValidators([Validators.required]);
      this.reportForm.get('minutes')?.updateValueAndValidity();
    }
  }

  private initializeSelectionFlow(): void {
    if (this.role === UserTypesEnum.Teacher) {
      const current = this.auth.currentUserValue;
      const teacherId = current ? Number(current.user.id) : null;
      if (teacherId) {
        this.reportForm.patchValue({ teacherId });
        this.loadCirclesForTeacher(teacherId, true);
      }
      return;
    }

    if (this.role === UserTypesEnum.Manager) {
      const current = this.auth.currentUserValue;
      const managerId = current ? Number(current.user.id) : null;
      if (managerId) {
        this.reportForm.patchValue({ managerId });
        this.onManagerChange(managerId, true);
      }
      return;
    }

    const existingTeacherId = this.toNumber(this.reportForm.get('teacherId')?.value);
    if (existingTeacherId) {
      this.loadTeachersForManager(0, existingTeacherId, true);
      return;
    }

    this.loadManagers();
  }

  private loadManagers(): void {
    this.isLoadingManagers = true;
    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager))
      .subscribe({
        next: (res) => {
          this.managers = res.isSuccess ? res.data.items : [];
          this.isLoadingManagers = false;
        },
        error: () => {
          this.managers = [];
          this.isLoadingManagers = false;
        }
      });
  }

  onManagerChange(managerId: number | null, initial = false): void {
    if (!initial) {
      this.reportForm.patchValue({ teacherId: null, circleId: null, studentId: null });
    } else {
      this.students = [];
      this.circles = [];
    }
    this.teachers = [];
    if (managerId === null || managerId === undefined) {
      return;
    }

    const existingTeacherId = this.toNumber(this.reportForm.get('teacherId')?.value);
    this.loadTeachersForManager(managerId, existingTeacherId, initial);
  }

  private loadTeachersForManager(managerId: number, teacherId?: number | null, loadCircles = false): void {
    this.isLoadingTeachers = true;
    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Teacher), managerId)
      .subscribe({
        next: (res) => {
          this.teachers = res.isSuccess ? res.data.items : [];
          this.isLoadingTeachers = false;
          if (teacherId && this.teachers.some((t) => t.id === teacherId)) {
            this.reportForm.patchValue({ teacherId }, { emitEvent: false });
            if (loadCircles) {
              this.loadCirclesForTeacher(teacherId, true);
            }
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  onTeacherChange(teacherId: number | null): void {
    this.reportForm.patchValue({ circleId: null, studentId: null });
    this.circles = [];
    this.students = [];
    if (!teacherId) {
      return;
    }
    const teacher = this.teachers.find((t) => t.id === teacherId);
    if (teacher?.managerId && this.role !== UserTypesEnum.Manager) {
      this.reportForm.patchValue({ managerId: teacher.managerId });
    }
    this.loadCirclesForTeacher(teacherId, true);
  }

  onCircleChange(circleId: number | null): void {
    const existingStudentId =
      this.toNumber(this.reportForm.get('studentId')?.value) ?? this.preselectedStudentId;
    this.reportForm.patchValue({ studentId: null });
    this.students = [];
    if (!circleId) {
      return;
    }
    this.isLoadingStudents = true;
    this.circleService.get(circleId).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.students) {
          const mapped = res.data.students
            .map((student) => this.mapStudent(student))
            .filter((s): s is { id: number; name: string } => !!s);
          const unique = new Map(mapped.map((s) => [s.id, s]));
          this.students = Array.from(unique.values());
          const targetStudent = existingStudentId;
          if (targetStudent && this.students.some((s) => s.id === targetStudent)) {
            this.reportForm.patchValue({ studentId: targetStudent });
            this.preselectedStudentId = undefined;
          }
        }
        this.isLoadingStudents = false;
      },
      error: () => {
        this.students = [];
        this.isLoadingStudents = false;
      }
    });
  }

  private loadCirclesForTeacher(teacherId: number, autoSelect = false): void {
    this.isLoadingCircles = true;
    this.circleService.getAll(this.userFilter, undefined, teacherId).subscribe({
      next: (res) => {
        this.circles = res.isSuccess ? res.data.items : [];
        this.isLoadingCircles = false;
        if (autoSelect) {
          const currentCircle = this.toNumber(this.reportForm.get('circleId')?.value);
          const targetCircle =
            currentCircle && this.circles.some((c) => c.id === currentCircle)
              ? currentCircle
              : this.circles[0]?.id ?? null;
          if (targetCircle) {
            this.reportForm.patchValue({ circleId: targetCircle });
            this.onCircleChange(targetCircle);
          }
        }
      },
      error: () => {
        this.circles = [];
        this.isLoadingCircles = false;
      }
    });
  }

  private mapStudent(student: CircleDto['students'] extends (infer U)[] | null | undefined ? U : never) {
    const data = (student as { student?: LookUpUserDto }).student;
    const id = this.toNumber((student as { studentId?: unknown }).studentId ?? (student as { id?: unknown }).id);
    const name = data?.fullName || (typeof id === 'number' ? `Student #${id}` : undefined);
    if (id === undefined || name === undefined) {
      return undefined;
    }
    return { id, name };
  }

  private getReportFromState(id: number): ReportState | undefined {
    const maybeState = (history.state?.report as ReportState | undefined) ?? undefined;
    if (!maybeState) {
      return undefined;
    }

    const stateId = this.toNumber((maybeState as { id?: unknown }).id ?? maybeState.id);
    if (!stateId || stateId !== id) {
      return undefined;
    }

    return { ...maybeState, id: stateId };
  }

  private populateFormFromReport(report: ReportState, fallbackId: number): void {
    this.reportId = this.toNumber(report.id) ?? fallbackId;

    const status = this.resolveStatus(report);
    if (status !== undefined) {
      this.onStatusChange(status);
      this.reportForm.get('attendStatueId')?.setValue(status, { emitEvent: false });
    } else {
      this.selectedStatus = undefined;
      this.reportForm.get('attendStatueId')?.setValue(null, { emitEvent: false });
      this.toggleFields();
    }

    const creationTime = this.resolveDate(report.creationTime);

    const patch: Partial<CircleReportAddDto> = { creationTime };

    this.assignIfDefined(patch, 'minutes', this.toNumber(report.minutes));
    this.assignIfDefined(patch, 'newId', this.toNumber(report.newId));
    this.assignIfDefined(patch, 'newFrom', this.toString(report.newFrom));
    this.assignIfDefined(patch, 'newTo', this.toString(report.newTo));
    this.assignIfDefined(patch, 'newRate', this.toString(report.newRate));
    this.assignIfDefined(patch, 'recentPast', this.toString(report.recentPast));
    this.assignIfDefined(patch, 'recentPastRate', this.toString(report.recentPastRate));
    this.assignIfDefined(patch, 'distantPast', this.toString(report.distantPast));
    this.assignIfDefined(patch, 'distantPastRate', this.toString(report.distantPastRate));
    this.assignIfDefined(patch, 'farthestPast', this.toString(report.farthestPast));
    this.assignIfDefined(patch, 'farthestPastRate', this.toString(report.farthestPastRate));
    this.assignIfDefined(patch, 'theWordsQuranStranger', this.toString(report.theWordsQuranStranger));
    this.assignIfDefined(patch, 'intonation', this.toString(report.intonation));
    this.assignIfDefined(patch, 'other', this.toString(report.other));
    const circleId = this.extractEntityId(report, 'circle');
    const studentId = this.extractEntityId(report, 'student');
    const teacherId = this.extractEntityId(report, 'teacher');

    this.assignIfDefined(patch, 'circleId', circleId);
    this.assignIfDefined(patch, 'studentId', studentId);
    this.assignIfDefined(patch, 'teacherId', teacherId);

    if (studentId !== undefined) {
      this.preselectedStudentId = studentId;
    }

    this.reportForm.patchValue(patch);
  }

  private resolveStatus(report: ReportState): AttendStatusEnum | undefined {
    const rawStatus = this.toNumber(
      report.attendStatueId ?? (report as { attendStatus?: unknown; attendStatusId?: unknown }).attendStatusId
    );

    if (rawStatus === undefined) {
      return undefined;
    }

    switch (rawStatus) {
      case AttendStatusEnum.Attended:
      case AttendStatusEnum.ExcusedAbsence:
      case AttendStatusEnum.UnexcusedAbsence:
        return rawStatus;
      default:
        return undefined;
    }
  }

  private resolveDate(value: unknown): Date {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    return new Date();
  }

  private toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toString(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    return String(value);
  }

  private extractEntityId(report: ReportState, key: 'circle' | 'student' | 'teacher'): number | undefined {
    const record = report as Record<string, unknown>;
    const direct = this.toNumber(record[`${key}Id`]);
    if (direct !== undefined) {
      return direct;
    }

    const entity = record[key];
    if (entity && typeof entity === 'object') {
      const nestedId = this.toNumber((entity as Record<string, unknown>)['id']);
      if (nestedId !== undefined) {
        return nestedId;
      }
    }

    return undefined;
  }

  private assignIfDefined<K extends keyof CircleReportAddDto>(
    target: Partial<CircleReportAddDto>,
    key: K,
    value: CircleReportAddDto[K] | undefined
  ): void {
    if (value !== undefined) {
      target[key] = value;
    }
  }

  private determineMode(): 'add' | 'update' {
    const dataMode = this.route.snapshot.data['mode'] as 'add' | 'update' | undefined;
    if (dataMode) {
      return dataMode;
    }
    const path = this.route.snapshot.routeConfig?.path ?? '';
    if (path.includes('update') || path.includes('edit')) {
      return 'update';
    }
    return 'add';
  }

  onSubmit() {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }
    const formValue = (this.mode === 'update'
      ? this.reportForm.getRawValue()
      : this.reportForm.value) as CircleReportAddDto & { managerId?: number };
    const { managerId: _managerId, ...model } = formValue;

    if (this.mode === 'update') {
      if (!this.reportId) {
        this.toast.error(this.translate.instant('Missing report identifier'));
        return;
      }
      model.id = this.reportId;
      this.service.update(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success(this.translate.instant('Report updated successfully'));
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('Unable to update report'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Error updating report'))
      });
    } else {
      this.service.create(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success(this.translate.instant('Report created successfully'));
            this.reportForm.reset();
            this.reportForm.get('creationTime')?.setValue(new Date());
            this.toggleFields();
            this.selectedStatus = undefined;
            const defaults: Partial<CircleReportAddDto> = { creationTime: new Date() };
            if (this.role === UserTypesEnum.Teacher) {
              const teacherId = this.toNumber(this.auth.currentUserValue?.user.id);
              if (teacherId) {
                defaults.teacherId = teacherId;
                this.loadCirclesForTeacher(teacherId, true);
              }
            } else if (this.role === UserTypesEnum.Manager) {
              const managerId = this.toNumber(this.auth.currentUserValue?.user.id);
              if (managerId) {
                defaults.managerId = managerId;
                this.onManagerChange(managerId, true);
              }
            } else {
              this.loadManagers();
            }
            this.reportForm.patchValue(defaults);
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('Unable to create report'));
          }
        },
        error: () => this.toast.error(this.translate.instant('Error creating report'))
      });
    }
  }
}
