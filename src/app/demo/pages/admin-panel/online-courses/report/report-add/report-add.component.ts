import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

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
  private reportId?: number;

  reportForm!: FormGroup;
  role = this.auth.getRole();
  UserTypesEnum = UserTypesEnum;
  AttendStatusEnum = AttendStatusEnum;
  selectedStatus?: AttendStatusEnum;
  mode: 'add' | 'update' = 'add';
  cardTitle = 'Add Circle Report';
  submitLabel = 'Create';
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
      circleId: [],
      studentId: [null, Validators.required],
      teacherId: [null],
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
    } else {
      const reportId = Number(this.route.snapshot.paramMap.get('id'));
      if (reportId) {
        this.reportId = reportId;
        const report = this.getReportFromState(reportId);
        if (report) {
          this.populateFormFromReport(report, reportId);
        } else {
          this.toast.error('Report details are unavailable. Please return to the list and select a report to edit.');
        }
      } else {
        this.toast.error('Invalid report identifier');
      }
    }
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

  loadCircle(teacherId: number) {
    this.circleService.getAll({ skipCount: 0, maxResultCount: 1 }, undefined, teacherId).subscribe((res) => {
      if (res.isSuccess && res.data.items.length) {
        this.reportForm.get('circleId')?.setValue(res.data.items[0].id);
      }
    });
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
    this.assignIfDefined(patch, 'circleId', this.extractEntityId(report, 'circle'));
    this.assignIfDefined(patch, 'studentId', this.extractEntityId(report, 'student'));
    this.assignIfDefined(patch, 'teacherId', this.extractEntityId(report, 'teacher'));

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
      const nestedId = this.toNumber((entity as Record<string, unknown>).id);
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
    const model = (this.mode === 'update'
      ? this.reportForm.getRawValue()
      : this.reportForm.value) as CircleReportAddDto;

    if (this.mode === 'update') {
      if (!this.reportId) {
        this.toast.error('Missing report identifier');
        return;
      }
      model.id = this.reportId;
      this.service.update(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success('Report updated successfully');
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('Unable to update report');
          }
        },
        error: () => this.toast.error('Error updating report')
      });
    } else {
      this.service.create(model).subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.toast.success('Report created successfully');
            this.reportForm.reset();
            this.reportForm.get('creationTime')?.setValue(new Date());
            this.toggleFields();
            this.selectedStatus = undefined;
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error('Unable to create report');
          }
        },
        error: () => this.toast.error('Error creating report')
      });
    }
  }
}
