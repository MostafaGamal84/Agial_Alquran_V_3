import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';

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
import {
  FilteredResultRequestDto,
  LookUpUserDto,
  LookupService
} from 'src/app/@theme/services/lookup.service';
import { QuranSurahEnum } from 'src/app/@theme/types/QuranSurahEnum';
import { UserService } from 'src/app/@theme/services/user.service';

type ReportState = Partial<CircleReportAddDto> & Partial<CircleReportListDto>;

@Component({
  selector: 'app-report-add',
  standalone: true,
  imports: [CommonModule, SharedModule, SelectModule],
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
  private userService = inject(UserService);

  reportForm!: FormGroup;
  private reportId?: number;
  private preselectedStudentId?: number;

  // enums
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
  attendStatusOptions = [
    { label: 'حضر', value: AttendStatusEnum.Attended },
    { label: 'تغيب بعذر', value: AttendStatusEnum.ExcusedAbsence },
    { label: 'تغيب بدون عذر', value: AttendStatusEnum.UnexcusedAbsence }
  ];

  isLoadingManagers = false;
  isLoadingTeachers = false;
  isLoadingCircles = false;
  isLoadingStudents = false;

  lockManagerSelection = false;
  lockTeacherSelection = false;
  lockCircleSelection = true;

  private profileIdFallback?: number;
  private profileBranchId?: number;

  private readonly userFilter: FilteredResultRequestDto = { lookupOnly: true };

  // 🔴 المتغيرات الجديدة بدل formControlName
  selectedManagerId: number | null = null;
  selectedTeacherId: number | null = null;
  selectedStudentId: number | null = null;

  surahList = Object.keys(QuranSurahEnum)
    .filter((key) => isNaN(Number(key)))
    .map((key) => ({
      id: QuranSurahEnum[key as keyof typeof QuranSurahEnum],
      name: key
    }));

  // ================================
  // Helpers على اليوزر والدور
  // ================================
  private get currentUser(): any {
    const raw = this.auth.currentUserValue as any;
    return raw?.user ?? raw ?? null;
  }

  private getUserId(): number | undefined {
    const raw =
      (this.auth.currentUserValue as any)?.user?.id ??
      (this.auth.currentUserValue as any)?.id ??
      this.currentUser?.id ??
      this.currentUser?.userId ??
      this.profileIdFallback;

    return this.toNumber(raw);
  }

  private getBranchId(): number | undefined {
    const raw =
      (this.auth.currentUserValue as any)?.user?.branchId ??
      (this.auth.currentUserValue as any)?.branchId ??
      this.currentUser?.branchId ??
      this.currentUser?.branch?.id ??
      this.profileBranchId;

    return this.toNumber(raw) ?? undefined;
  }

  private get userTypeNumber(): number {
    const raw =
      (this.auth.currentUserValue as any)?.user?.userTypeId ??
      (this.auth.currentUserValue as any)?.userTypeId ??
      this.currentUser?.userTypeId ??
      this.auth.getRole();

    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  get isSystemManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Admin);
  }

  get isBranchManager(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.BranchLeader);
  }

  get isSupervisor(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Manager);
  }

  get isTeacher(): boolean {
    return this.userTypeNumber === Number(UserTypesEnum.Teacher);
  }

  // ================================
  // INIT
  // ================================
  ngOnInit(): void {
    this.mode = this.determineMode();
    if (this.mode === 'update') {
      this.cardTitle = 'Update Circle Report';
      this.submitLabel = 'Update';
    }

    this.buildForm();
    this.toggleFields();

    if (this.mode === 'add') {
      this.initAddMode();
      this.initializeSelectionFlow();
    } else {
      this.initUpdateMode();
      // في وضع التعديل، ممكن تخليهم disabled لو حابب
      this.reportForm.get('circleId')?.disable({ emitEvent: false });
    }
  }

  private buildForm(): void {
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

      // نسيبهم في الفورم لو محتاجينهم، بس مش نعتمد عليهم في الـ UI
      managerId: [null],
      teacherId: [null],
      circleId: [null, Validators.required],
      studentId: [null],
      attendStatueId: []
    });
  }

  private initAddMode(): void {
    const course = history.state.circle as CircleDto | undefined;
    if (course) {
      const teacherId = course.teacherId ?? course.teacher?.id ?? null;
      this.selectedTeacherId = teacherId ?? null;
      this.reportForm.patchValue({
        circleId: course.id
      });
    }

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.preselectedStudentId = id;
      this.selectedStudentId = id;
    }
  }

  private initUpdateMode(): void {
    const reportId = Number(this.route.snapshot.paramMap.get('id'));
    if (reportId) {
      this.reportId = reportId;
      const report = this.getReportFromState(reportId);
      if (report) {
        this.populateFormFromReport(report, reportId);
      } else {
        this.toast.error(
          this.translate.instant(
            'Report details are unavailable. Please return to the list and select a report to edit.'
          )
        );
      }
    } else {
      this.toast.error(this.translate.instant('Invalid report identifier'));
    }
  }

  // ================================
  // ROLE-BASED FLOW (وضع الإضافة فقط)
  // ================================
  private initializeSelectionFlow(): void {
    // 4) Teacher
    if (this.isTeacher) {
      this.lockManagerSelection = true;
      this.lockTeacherSelection = true;
      this.lockCircleSelection = true;

      const teacherId = this.getUserId() ?? null;
      this.selectedTeacherId = teacherId;

      if (teacherId) {
        this.loadCirclesForTeacher(teacherId, true);
      } else {
        this.loadTeacherProfileAndPrefill();
      }
      return;
    }

    // 3) Supervisor
    if (this.isSupervisor) {
      this.lockManagerSelection = true;

      const supervisorId = this.getUserId() ?? null;
      const branchId = this.getBranchId();

      this.selectedManagerId = supervisorId;

      this.loadTeachersForManager(
        supervisorId ?? 0,
        undefined,
        true,
        branchId,
        true
      );

      return;
    }

    // 2) Branch Manager + 1) System Admin
    if (this.isBranchManager || this.isSystemManager) {
      this.loadManagers(true, this.selectedTeacherId);
      return;
    }

    // Fallback
    if (this.selectedTeacherId) {
      this.loadTeachersForManager(0, this.selectedTeacherId, true);
    } else {
      this.loadManagers();
    }
  }

  private loadTeacherProfileAndPrefill(): void {
    this.userService.getProfile().subscribe({
      next: (res) => {
        if (res.isSuccess && res.data) {
          const teacherId = this.toNumber(res.data.id);
          const branchId = this.toNumber(res.data.branchId);

          this.profileIdFallback = teacherId ?? undefined;
          this.profileBranchId = branchId ?? undefined;

          this.selectedTeacherId = teacherId ?? null;

          if (teacherId) {
            this.loadCirclesForTeacher(teacherId, true);
            return;
          }
        }

        this.loadCirclesForTeacher(0, true);
      },
      error: () => {
        this.loadCirclesForTeacher(0, true);
      }
    });
  }

  // ================================
  // UI VISIBILITY
  // ================================
  get showSupervisorSelector(): boolean {
    return this.mode === 'add' && (this.isSystemManager || this.isBranchManager);
  }

  get showTeacherSelector(): boolean {
    return (
      this.mode === 'add' &&
      (this.isSystemManager || this.isBranchManager || this.isSupervisor)
    );
  }

  get showCircleSelector(): boolean {
    return false;
  }

  get showStudentSelector(): boolean {
    return this.mode === 'add';
  }

  // ================================
  // LOAD MANAGERS (SUPERVISORS)
  // ================================
  private loadManagers(autoSelectFirst = false, teacherId?: number | null): void {
    this.isLoadingManagers = true;

    const branchId =
      this.isBranchManager || this.isSupervisor ? this.getBranchId() ?? 0 : 0;

    this.lookupService
      .getUsersForSelects(this.userFilter, Number(UserTypesEnum.Manager), 0, 0, branchId)
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.managers = items.map((m: any) => ({
            ...m,
            id: this.toNumber(m.id) ?? m.id
          }));
          this.isLoadingManagers = false;

          if (autoSelectFirst && this.managers.length > 0 && this.selectedManagerId == null) {
            const managerId = this.toNumber(this.managers[0].id) ?? 0;
            this.selectedManagerId = managerId;
            this.onManagerChange(managerId, true, teacherId ?? null);
          }
        },
        error: () => {
          this.managers = [];
          this.isLoadingManagers = false;
        }
      });
  }

  // ================================
  // SELECTION HANDLERS
  // ================================
  onManagerSelectionChange(rawValue: any): void {
    const id = this.toNumber(rawValue) ?? null;
    this.selectedManagerId = id;
    this.onManagerChange(id, false, null);
  }

  private onManagerChange(
    managerId: number | null,
    initial = false,
    teacherId?: number | null
  ): void {
    if (!initial) {
      this.selectedTeacherId = null;
      this.selectedStudentId = null;
      this.reportForm.patchValue({ circleId: null });
    }
    this.circles = [];
    this.students = [];
    this.teachers = [];

    if (managerId === null || managerId === undefined) return;

    const branchId = this.isSupervisor || this.isBranchManager ? this.getBranchId() : undefined;

    this.loadTeachersForManager(managerId, teacherId ?? this.selectedTeacherId, true, branchId);
  }

  private loadTeachersForManager(
    managerId: number,
    teacherId?: number | null,
    loadCircles = false,
    branchId?: number | null,
    autoSelectFirst = false
  ): void {
    this.isLoadingTeachers = true;

    const effectiveManagerId =
      managerId || (this.isSupervisor ? this.getUserId() ?? 0 : 0);

    this.lookupService
      .getUsersForSelects(
        this.userFilter,
        Number(UserTypesEnum.Teacher),
        effectiveManagerId,
        0,
        branchId ?? 0
      )
      .subscribe({
        next: (res) => {
          const items = res.isSuccess ? res.data.items : [];
          this.teachers = items.map((t: any) => ({
            ...t,
            id: this.toNumber(t.id) ?? t.id
          }));
          this.isLoadingTeachers = false;

          const existingId = teacherId ?? this.selectedTeacherId ?? undefined;

          if (existingId && this.teachers.some((t) => this.toNumber(t.id) === existingId)) {
            this.selectedTeacherId = existingId;
            if (loadCircles) {
              this.loadCirclesForTeacher(existingId, true);
            }
          } else if (autoSelectFirst && this.teachers.length === 1) {
            const firstTeacherId = this.toNumber(this.teachers[0].id);
            if (firstTeacherId) {
              this.selectedTeacherId = firstTeacherId;
              if (loadCircles) {
                this.loadCirclesForTeacher(firstTeacherId, true);
              }
            }
          }
        },
        error: () => {
          this.teachers = [];
          this.isLoadingTeachers = false;
        }
      });
  }

  onTeacherSelectionChange(rawValue: any): void {
    const id = this.toNumber(rawValue) ?? null;
    this.selectedTeacherId = id;
    this.onTeacherChange(id);
  }

  private onTeacherChange(teacherId: number | null): void {
    this.selectedStudentId = null;
    this.reportForm.patchValue({ circleId: null });
    this.circles = [];
    this.students = [];

    if (!teacherId) return;

    const teacher = this.teachers.find((t) => this.toNumber(t.id) === teacherId);
    if (teacher?.managerId && !this.isSupervisor) {
      const mgrId = this.toNumber((teacher as any).managerId);
      if (mgrId) {
        this.selectedManagerId = mgrId;
      }
    }

    this.loadCirclesForTeacher(teacherId, true);
  }

  onStudentSelectionChange(rawValue: any): void {
    const id = this.toNumber(rawValue) ?? null;
    this.selectedStudentId = id;
  }

  // ================================
  // LOAD CIRCLES & STUDENTS
  // ================================
  private loadCirclesForTeacher(teacherId: number, autoSelect = false): void {
    this.isLoadingCircles = true;

    const effectiveTeacherId = teacherId || this.getUserId() || 0;

    this.circleService.getAll(this.userFilter, undefined, effectiveTeacherId).subscribe({
      next: (res) => {
        this.circles = res.isSuccess ? res.data.items : [];
        this.isLoadingCircles = false;

        if (autoSelect && this.circles.length > 0) {
          const currentCircle = this.toNumber(this.reportForm.get('circleId')?.value);
          const targetCircle =
            currentCircle && this.circles.some((c) => c.id === currentCircle)
              ? currentCircle
              : this.circles[0]?.id ?? null;

          if (targetCircle) {
            this.reportForm.patchValue({ circleId: targetCircle }, { emitEvent: false });
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

  onCircleChange(circleId: number | null): void {
    const existingStudentId = this.selectedStudentId ?? this.preselectedStudentId ?? undefined;

    this.selectedStudentId = null;
    this.students = [];

    if (!circleId) return;

    this.isLoadingStudents = true;

    this.circleService.get(circleId).subscribe({
      next: (res) => {
        if (res.isSuccess && res.data?.students) {
          const selectedTeacherId = this.selectedTeacherId ?? undefined;

          const relevantStudents = selectedTeacherId
            ? res.data.students.filter((student: any) => {
                const tId = this.toNumber(student.teacherId);
                return tId === undefined || tId === selectedTeacherId;
              })
            : res.data.students;

          const mapped = relevantStudents
            .map((student: any) => this.mapStudent(student))
            .filter((s): s is { id: number; name: string } => !!s);

          const unique = new Map(mapped.map((s) => [s.id, s]));
          this.students = Array.from(unique.values());

          const targetStudent = existingStudentId;
          if (targetStudent && this.students.some((s) => s.id === targetStudent)) {
            this.selectedStudentId = targetStudent;
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

  private mapStudent(
    student: CircleDto['students'] extends (infer U)[] | null | undefined ? U : never
  ) {
    const data = (student as any).student;
    const id = this.toNumber((student as any).studentId ?? (student as any).id);
    const name =
      data?.fullName ||
      (student as any).fullName ||
      (student as any).name ||
      (typeof id === 'number' ? `Student #${id}` : undefined);

    if (id === undefined || name === undefined) return undefined;

    return { id, name };
  }

  // ================================
  // STATUS-BASED FIELDS
  // ================================
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

  private toggleFields(): void {
    const controls = this.allFields();
    controls.forEach((c) => {
      this.reportForm.get(c)?.disable();
      this.reportForm.get(c)?.clearValidators();
      this.reportForm.get(c)?.updateValueAndValidity();
    });
  }

  onStatusChange(status: AttendStatusEnum): void {
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

  // ================================
  // UTILITIES
  // ================================
  private resolveStatus(report: ReportState): AttendStatusEnum | undefined {
    const rawStatus = this.toNumber(
      report.attendStatueId ??
        (report as { attendStatus?: unknown; attendStatusId?: unknown }).attendStatusId
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
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private toString(value: unknown): string | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    return String(value);
  }

  private getReportFromState(id: number): ReportState | undefined {
    const maybeState = (history.state?.report as ReportState | undefined) ?? undefined;
    if (!maybeState) return undefined;

    const stateId = this.toNumber((maybeState as { id?: unknown }).id ?? maybeState.id);
    if (!stateId || stateId !== id) return undefined;

    return { ...maybeState, id: stateId };
  }

  private extractEntityId(
    report: ReportState,
    key: 'circle' | 'student' | 'teacher'
  ): number | undefined {
    const record = report as Record<string, unknown>;
    const direct = this.toNumber(record[`${key}Id`]);
    if (direct !== undefined) return direct;

    const entity = record[key];
    if (entity && typeof entity === 'object') {
      const nestedId = this.toNumber((entity as Record<string, unknown>)['id']);
      if (nestedId !== undefined) return nestedId;
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
    this.assignIfDefined(
      patch,
      'farthestPastRate',
      this.toString(report.farthestPastRate)
    );
    this.assignIfDefined(
      patch,
      'theWordsQuranStranger',
      this.toString(report.theWordsQuranStranger)
    );
    this.assignIfDefined(patch, 'intonation', this.toString(report.intonation));
    this.assignIfDefined(patch, 'other', this.toString(report.other));

    const circleId = this.extractEntityId(report, 'circle');
    const studentId = this.extractEntityId(report, 'student');
    const teacherId = this.extractEntityId(report, 'teacher');

    if (circleId !== undefined) {
      patch.circleId = circleId;
    }
    if (studentId !== undefined) {
      this.selectedStudentId = studentId;
    }
    if (teacherId !== undefined) {
      this.selectedTeacherId = teacherId;
    }

    this.reportForm.patchValue(patch, { emitEvent: false });
  }

  private determineMode(): 'add' | 'update' {
    const dataMode = this.route.snapshot.data['mode'] as 'add' | 'update' | undefined;
    if (dataMode) return dataMode;

    const path = this.route.snapshot.routeConfig?.path ?? '';
    if (path.includes('update') || path.includes('edit')) return 'update';
    return 'add';
  }

  // ================================
  // SUBMIT
  // ================================
  onSubmit(): void {
    if (this.reportForm.invalid) {
      this.reportForm.markAllAsTouched();
      return;
    }

    const formValue = this.reportForm.getRawValue() as CircleReportAddDto;

    const model: CircleReportAddDto = {
      ...formValue,
      teacherId: this.selectedTeacherId ?? undefined,
      studentId: this.selectedStudentId ?? undefined,
      // managerId لو محتاجينه فى الـ DTO ممكن تضيفه هنا
      // managerId: this.selectedManagerId ?? undefined,
      id: this.reportId
    } as CircleReportAddDto;

    if (!model.teacherId) {
      const currentTeacherId = this.getUserId();
      if (currentTeacherId) {
        model.teacherId = currentTeacherId;
      }
    }

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
        error: () =>
          this.toast.error(this.translate.instant('Error updating report'))
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

            this.selectedManagerId = null;
            this.selectedTeacherId = null;
            this.selectedStudentId = null;

            const defaults: Partial<CircleReportAddDto> = { creationTime: new Date() };

            if (this.isTeacher) {
              const teacherId = this.getUserId();
              if (teacherId) {
                this.selectedTeacherId = teacherId;
                this.loadCirclesForTeacher(teacherId, true);
              }
            } else if (this.isSupervisor) {
              const supervisorId = this.getUserId();
              if (supervisorId) {
                this.selectedManagerId = supervisorId;
                this.onManagerChange(supervisorId, true);
              } else {
                this.onManagerChange(0, true);
              }
            } else if (this.isSystemManager || this.isBranchManager) {
              this.loadManagers();
            }

            this.reportForm.patchValue(defaults, { emitEvent: false });
          } else if (res.errors?.length) {
            res.errors.forEach((e) => this.toast.error(e.message));
          } else {
            this.toast.error(this.translate.instant('Unable to create report'));
          }
        },
        error: () =>
          this.toast.error(this.translate.instant('Error creating report'))
      });
    }
  }
}
